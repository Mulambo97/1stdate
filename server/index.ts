import express from 'express'
import { createServer } from 'node:http'
import { WebSocketServer, type WebSocket } from 'ws'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type {
  ClientMessage,
  DeckId,
  Player,
  PlayerSlot,
  RoomState,
  ServerMessage,
} from '../src/types.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const PORT = Number(process.env.PORT || 3001)
const storeDir = join(root, 'data')
const storePath = join(storeDir, 'rooms.json')
const decksDir = join(storeDir, 'decks')
const ROOM_TTL_MS = 1000 * 60 * 60 * 24 * 30

type SeedQuestion = { id: number; level: string }

type DeckSeed = {
  id: DeckId
  questions: SeedQuestion[]
}

const deckFiles = readdirSync(decksDir).filter((f) => f.endsWith('.json'))
const decks = new Map<DeckId, DeckSeed>()
for (const file of deckFiles) {
  const raw = JSON.parse(readFileSync(join(decksDir, file), 'utf8')) as DeckSeed
  if (raw.id && raw.questions?.length) decks.set(raw.id, raw)
}

if (!decks.has('original') || !decks.has('for-dates')) {
  throw new Error('Missing required decks in data/decks')
}

type Client = {
  ws: WebSocket
  slot: PlayerSlot
  roomCode: string
}

const rooms = new Map<string, RoomState>()
const clients = new Map<WebSocket, Client>()

function code() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < 4; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)]
  return out
}

function shuffle<T>(items: T[]) {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function buildDeck(deckId: DeckId) {
  const seed = decks.get(deckId)
  if (!seed) throw new Error(`Unknown deck ${deckId}`)

  const levelOrder =
    deckId === 'for-dates'
      ? ['Brise-glace', 'Confidences', 'En profondeur', 'DÉFI', 'DERNIÈRE QUESTION']
      : ['Niveau 1', 'Niveau 2', 'Niveau 3', 'JOKER', 'DERNIÈRE QUESTION']

  const byLevel = new Map<string, number[]>()
  for (const q of seed.questions) {
    const list = byLevel.get(q.level) ?? []
    list.push(q.id)
    byLevel.set(q.level, list)
  }

  const wildKey = deckId === 'for-dates' ? 'DÉFI' : 'JOKER'
  const levels = levelOrder.filter((l) => l !== wildKey && l !== 'LAST QUESTION')
  const wildcards = shuffle(byLevel.get(wildKey) ?? [])
  const finale = byLevel.get('DERNIÈRE QUESTION') ?? []

  const chunks = levels.map((level) => shuffle(byLevel.get(level) ?? []))
  const perChunk = Math.ceil(wildcards.length / Math.max(chunks.length, 1))
  const sprinkled = chunks.map((chunk, index) => {
    const wilds = wildcards.slice(index * perChunk, index * perChunk + perChunk)
    const out = [...chunk]
    for (const w of wilds) {
      out.splice(Math.floor(Math.random() * (out.length + 1)), 0, w)
    }
    return out
  })

  return [...sprinkled.flat(), ...finale]
}

function normalizePlayer(player: Partial<Player> & { name: string }): Player {
  return {
    name: player.name,
    ready: !!player.ready,
    shared: !!player.shared,
    online: !!player.online,
  }
}

function loadRooms() {
  if (!existsSync(storePath)) return
  try {
    const raw = JSON.parse(readFileSync(storePath, 'utf8')) as { rooms?: Record<string, RoomState> }
    const now = Date.now()
    for (const [key, room] of Object.entries(raw.rooms ?? {})) {
      if (!room?.code || !room.deck?.length) continue
      if (room.updatedAt && now - room.updatedAt > ROOM_TTL_MS) continue
      room.deckId = room.deckId ?? 'original'
      room.players = {
        ...(room.players.a ? { a: normalizePlayer({ ...room.players.a, online: false }) } : {}),
        ...(room.players.b ? { b: normalizePlayer({ ...room.players.b, online: false }) } : {}),
      }
      rooms.set(key, room)
    }
    console.log(`Loaded ${rooms.size} saved room(s) · ${decks.size} deck(s)`)
  } catch (error) {
    console.error('Could not load rooms.json', error)
  }
}

function persistRooms() {
  if (!existsSync(storeDir)) mkdirSync(storeDir, { recursive: true })
  writeFileSync(storePath, JSON.stringify({ rooms: Object.fromEntries(rooms.entries()) }, null, 2))
}

function touch(room: RoomState) {
  room.updatedAt = Date.now()
  persistRooms()
}

function send(ws: WebSocket, msg: ServerMessage) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg))
}

function broadcast(roomCode: string, msg: ServerMessage) {
  for (const client of clients.values()) {
    if (client.roomCode === roomCode) send(client.ws, msg)
  }
}

function roomPlayers(room: RoomState) {
  return (['a', 'b'] as PlayerSlot[]).filter((s) => room.players[s])
}

function resetShared(room: RoomState) {
  for (const slot of roomPlayers(room)) {
    if (room.players[slot]) room.players[slot]!.shared = false
  }
}

function bothShared(room: RoomState) {
  return roomPlayers(room).length === 2 && roomPlayers(room).every((s) => room.players[s]?.shared)
}

function namesMatch(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

function seatTakenBySocket(roomCode: string, slot: PlayerSlot) {
  for (const client of clients.values()) {
    if (client.roomCode === roomCode && client.slot === slot) return true
  }
  return false
}

function createRoom(name: string, deckId: DeckId, ws: WebSocket) {
  const chosen = decks.has(deckId) ? deckId : 'for-dates'
  let roomCode = code()
  while (rooms.has(roomCode)) roomCode = code()

  const state: RoomState = {
    code: roomCode,
    status: 'waiting',
    deckId: chosen,
    players: { a: { name, ready: false, shared: false, online: true } },
    cardIndex: 0,
    deck: buildDeck(chosen),
    turn: 'a',
    bothReady: false,
    updatedAt: Date.now(),
  }
  rooms.set(roomCode, state)
  clients.set(ws, { ws, slot: 'a', roomCode })
  touch(state)
  send(ws, { type: 'welcome', slot: 'a', state })
}

function joinRoom(roomCode: string, name: string, ws: WebSocket) {
  const codeKey = roomCode.trim().toUpperCase()
  const room = rooms.get(codeKey)
  if (!room) {
    send(ws, { type: 'error', message: 'Ce code d’invitation est introuvable.' })
    return
  }

  const slots = ['a', 'b'] as PlayerSlot[]
  let slot = slots.find((s) => room.players[s] && namesMatch(room.players[s]!.name, name))

  if (slot && seatTakenBySocket(codeKey, slot)) {
    send(ws, { type: 'error', message: 'Cette place est déjà connectée ailleurs.' })
    return
  }

  if (!slot) slot = slots.find((s) => !room.players[s])

  if (!slot) {
    send(ws, {
      type: 'error',
      message:
        'Cette soirée a déjà deux personnes. Reprends avec le même prénom pour continuer.',
    })
    return
  }

  const existing = room.players[slot]
  room.players[slot] = {
    name: existing?.name ?? name,
    ready: existing?.ready ?? false,
    shared: existing?.shared ?? false,
    online: true,
  }

  clients.set(ws, { ws, slot, roomCode: codeKey })
  touch(room)
  send(ws, { type: 'welcome', slot, state: room })
  broadcast(codeKey, { type: 'state', state: room })
}

function markReady(ws: WebSocket) {
  const client = clients.get(ws)
  if (!client) return
  const room = rooms.get(client.roomCode)
  if (!room || !room.players[client.slot]) return

  room.players[client.slot]!.ready = true
  const readyCount = roomPlayers(room).filter((s) => room.players[s]?.ready).length
  if (readyCount >= 2) {
    room.status = 'playing'
    room.bothReady = true
    resetShared(room)
  }
  touch(room)
  broadcast(client.roomCode, { type: 'state', state: room })
}

function markShared(ws: WebSocket) {
  const client = clients.get(ws)
  if (!client) return
  const room = rooms.get(client.roomCode)
  if (!room || room.status !== 'playing' || !room.players[client.slot]) return

  room.players[client.slot]!.shared = true
  touch(room)
  broadcast(client.roomCode, { type: 'state', state: room })
}

function nextCard(ws: WebSocket) {
  const client = clients.get(ws)
  if (!client) return
  const room = rooms.get(client.roomCode)
  if (!room || room.status !== 'playing') return
  if (!bothShared(room)) return

  if (room.cardIndex >= room.deck.length - 1) {
    room.status = 'finished'
  } else {
    room.cardIndex += 1
    room.turn = room.turn === 'a' ? 'b' : 'a'
    resetShared(room)
  }
  touch(room)
  broadcast(client.roomCode, { type: 'state', state: room })
}

function restart(ws: WebSocket) {
  const client = clients.get(ws)
  if (!client) return
  const room = rooms.get(client.roomCode)
  if (!room) return

  room.status = 'playing'
  room.cardIndex = 0
  room.deck = buildDeck(room.deckId)
  room.turn = 'a'
  for (const slot of roomPlayers(room)) {
    if (room.players[slot]) {
      room.players[slot]!.ready = true
      room.players[slot]!.shared = false
      room.players[slot]!.online = true
    }
  }
  room.bothReady = true
  touch(room)
  broadcast(client.roomCode, { type: 'state', state: room })
}

function leave(ws: WebSocket) {
  const client = clients.get(ws)
  if (!client) return
  clients.delete(ws)
  const room = rooms.get(client.roomCode)
  if (!room || !room.players[client.slot]) return

  room.players[client.slot]!.online = false
  touch(room)
  broadcast(client.roomCode, { type: 'state', state: room })
}

loadRooms()

const app = express()
const server = createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(root, 'dist')))
  app.get(/.*/, (_req, res) => {
    res.sendFile(join(root, 'dist/index.html'))
  })
}

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    let msg: ClientMessage
    try {
      msg = JSON.parse(String(raw)) as ClientMessage
    } catch {
      send(ws, { type: 'error', message: 'Bad message.' })
      return
    }

    switch (msg.type) {
      case 'create':
        createRoom(msg.name.trim() || 'You', msg.deckId ?? 'for-dates', ws)
        break
      case 'join':
        joinRoom(msg.code, msg.name.trim() || 'You', ws)
        break
      case 'ready':
        markReady(ws)
        break
      case 'shared':
        markShared(ws)
        break
      case 'next':
        nextCard(ws)
        break
      case 'restart':
        restart(ws)
        break
    }
  })

  ws.on('close', () => leave(ws))
})

server.listen(PORT, () => {
  console.log(`Game server on http://localhost:${PORT}`)
})
