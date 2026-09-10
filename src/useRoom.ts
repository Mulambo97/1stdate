import { useEffect, useRef, useState } from 'react'
import type { ClientMessage, PlayerSlot, RoomState, SavedSession, ServerMessage } from './types'

const SESSION_KEY = 'hdwyg.session'

function wsUrl() {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  if (import.meta.env.DEV) return `${proto}//${window.location.hostname}:3001/ws`
  return `${proto}//${window.location.host}/ws`
}

export function loadSession(): SavedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SavedSession
    if (!parsed.code || !parsed.name || !parsed.slot) return null
    return parsed
  } catch {
    return null
  }
}

export function saveSession(session: SavedSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

export function useRoom() {
  const [connected, setConnected] = useState(false)
  const [slot, setSlot] = useState<PlayerSlot | null>(null)
  const [state, setState] = useState<RoomState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<SavedSession | null>(() => loadSession())
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const ws = new WebSocket(wsUrl())
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => {
      setConnected(false)
      setSlot(null)
      setState(null)
    }
    ws.onerror = () => setError('Impossible de rejoindre la salle.')
    ws.onmessage = (event) => {
      const msg = JSON.parse(String(event.data)) as ServerMessage
      if (msg.type === 'welcome') {
        setSlot(msg.slot)
        setState(msg.state)
        setError(null)
        const next = {
          code: msg.state.code,
          name: msg.state.players[msg.slot]?.name ?? 'You',
          slot: msg.slot,
        }
        saveSession(next)
        setSession(next)
      } else if (msg.type === 'state') {
        setState(msg.state)
      } else if (msg.type === 'error') {
        setError(msg.message)
      }
    }

    return () => ws.close()
  }, [])

  function send(msg: ClientMessage) {
    wsRef.current?.send(JSON.stringify(msg))
  }

  return {
    connected,
    slot,
    state,
    error,
    session,
    create: (name: string, deckId?: import('./types').DeckId) =>
      send({ type: 'create', name, deckId }),
    join: (code: string, name: string) => send({ type: 'join', code, name }),
    continueSession: () => {
      const saved = loadSession()
      if (!saved) return
      send({ type: 'join', code: saved.code, name: saved.name })
    },
    leaveSession: () => {
      clearSession()
      setSession(null)
      window.location.reload()
    },
    ready: () => send({ type: 'ready' }),
    shared: () => send({ type: 'shared' }),
    next: () => send({ type: 'next' }),
    restart: () => send({ type: 'restart' }),
  }
}
