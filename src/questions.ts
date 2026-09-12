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
  return decks[deckId]?.title ?? 'Ce soir'
}

export function getDeckQuestions(deckId: DeckId) {
  return decks[deckId]?.questions ?? []
}

export type LevelGroup = {
  key: string
  label: string
  hint: string
}

export const levelGroups: Record<DeckId, LevelGroup[]> = {
  'for-dates': [
    { key: 'Brise-glace', label: 'Brise-glace', hint: 'Léger, pour commencer' },
    { key: 'Confidences', label: 'Confidences', hint: 'Un peu plus vrai' },
    { key: 'En profondeur', label: 'En profondeur', hint: 'Aller plus loin' },
    { key: 'DÉFI', label: 'Défis', hint: 'À faire ensemble' },
    { key: 'DERNIÈRE QUESTION', label: 'Dernière question', hint: 'Pour clore' },
  ],
  original: [
    { key: 'Niveau 1', label: 'Surface', hint: 'Brise-glace' },
    { key: 'Niveau 2', label: 'Plus profond', hint: 'Confidences' },
    { key: 'Niveau 3', label: 'Le plus profond', hint: 'En profondeur' },
    { key: 'JOKER', label: 'Jokers', hint: 'À faire ensemble' },
    { key: 'DERNIÈRE QUESTION', label: 'Dernière question', hint: 'Pour clore' },
  ],
}

export function questionsForLevel(deckId: DeckId, level: string) {
  return getDeckQuestions(deckId).filter((q) => q.level === level)
}
