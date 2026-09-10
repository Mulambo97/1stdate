export type Depth = 1 | 2 | 3 | 'wildcard' | 'finale'

export type Question = {
  id: number
  question: string
  level: string
  depth: Depth | number | string
}

export type DeckId = 'original' | 'for-dates'

export type DeckMeta = {
  id: DeckId
  title: string
  subtitle: string
}

export type PlayerSlot = 'a' | 'b'

export type Player = {
  name: string
  ready: boolean
  shared: boolean
  online: boolean
}

export type RoomState = {
  code: string
  status: 'waiting' | 'playing' | 'finished'
  deckId: DeckId
  players: Partial<Record<PlayerSlot, Player>>
  cardIndex: number
  deck: number[]
  turn: PlayerSlot
  bothReady: boolean
  updatedAt: number
}

export type ClientMessage =
  | { type: 'create'; name: string; deckId?: DeckId }
  | { type: 'join'; code: string; name: string }
  | { type: 'ready' }
  | { type: 'shared' }
  | { type: 'next' }
  | { type: 'restart' }

export type ServerMessage =
  | { type: 'welcome'; slot: PlayerSlot; state: RoomState }
  | { type: 'state'; state: RoomState }
  | { type: 'error'; message: string }

export type SavedSession = {
  code: string
  name: string
  slot: PlayerSlot
}
