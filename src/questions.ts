import original from '../data/decks/original.json'
import forDates from '../data/decks/for-dates.json'
import type { DeckId, DeckMeta, Question } from './types'

type DeckFile = {
  id: string
  title: string
  subtitle?: string
  questions: Question[]
}

const decks: Record<DeckId, DeckFile> = {
  original: original as DeckFile,
  'for-dates': forDates as DeckFile,
}

export const deckOptions: DeckMeta[] = [
  {
    id: 'for-dates',
    title: forDates.title,
    subtitle: forDates.subtitle,
  },
  {
    id: 'original',
    title: original.title,
    subtitle: (original as { subtitle?: string }).subtitle ?? 'The classic deep deck',
  },
]

export function getQuestion(deckId: DeckId, id: number) {
  return decks[deckId]?.questions.find((q) => q.id === id)
}

export function getDeckTitle(deckId: DeckId) {
  return decks[deckId]?.title ?? 'Tonight'
}
