import { useMemo, useState } from 'react'
import { getDeckTitle, levelGroups, questionsForLevel } from './questions'
import type { DeckId, Question } from './types'

function depthTone(level?: string) {
  if (level === 'JOKER' || level === 'DÉFI') return 'tone-wild'
  if (level === 'DERNIÈRE QUESTION') return 'tone-finale'
  if (level === 'Niveau 2' || level === 'Confidences') return 'tone-2'
  if (level === 'Niveau 3' || level === 'En profondeur') return 'tone-3'
  return 'tone-1'
}

type Props = {
  deckId: DeckId
  onBack: () => void
}

export default function SoloPlay({ deckId, onBack }: Props) {
  const groups = levelGroups[deckId]
  const [level, setLevel] = useState<string | null>(null)
  const [card, setCard] = useState<Question | null>(null)

  const list = useMemo(() => (level ? questionsForLevel(deckId, level) : []), [deckId, level])
  const group = groups.find((g) => g.key === level)

  function drawRandom() {
    if (!list.length) return
    const remaining = list.filter((q) => q.id !== card?.id)
    const pool = remaining.length ? remaining : list
    setCard(pool[Math.floor(Math.random() * pool.length)])
  }

  if (card) {
    return (
      <main className={`shell ${depthTone(card.level)}`}>
        <div className="atmosphere" aria-hidden />
        <div className="stage play">
          <header className="play-top">
            <div>
              <p className="eyebrow">1stdate · {getDeckTitle(deckId)} · solo</p>
              <p className="depth-now">{group?.label ?? card.level}</p>
            </div>
            <p className="count">
              {list.findIndex((q) => q.id === card.id) + 1}
              <span> / {list.length}</span>
            </p>
          </header>

          <article className="prompt">
            <p className="level-tag">{group?.label ?? card.level}</p>
            <h1 className="question">{card.question}</h1>
            <p className="turn-line">Lis-la à voix haute. Prends ton temps.</p>
          </article>

          <div className="actions">
            <button className="btn btn-primary" onClick={drawRandom}>
              Tirer une autre
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => {
                setCard(null)
              }}
            >
              Choisir dans la liste
            </button>
          </div>
          <button className="btn btn-ghost" onClick={() => setLevel(null)}>
            Changer de niveau
          </button>
        </div>
      </main>
    )
  }

  if (level) {
    return (
      <main className={`shell ${depthTone(level)}`}>
        <div className="atmosphere" aria-hidden />
        <div className="stage home">
          <p className="eyebrow">1stdate · {getDeckTitle(deckId)}</p>
          <h1 className="brand">{group?.label ?? level}</h1>
          <p className="lede">{group?.hint}. Choisis une question, ou tire au hasard.</p>

          <div className="actions">
            <button className="btn btn-primary" onClick={drawRandom} disabled={!list.length}>
              Tirer une carte
            </button>
            <button className="btn btn-ghost" onClick={() => setLevel(null)}>
              Niveaux
            </button>
          </div>

          <ol className="pick-list">
            {list.map((q, i) => (
              <li key={q.id}>
                <button type="button" className="pick-item" onClick={() => setCard(q)}>
                  <span className="pick-num">{i + 1}</span>
                  <span className="pick-text">{q.question}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </main>
    )
  }

  return (
    <main className={`shell ${depthTone()}`}>
      <div className="atmosphere" aria-hidden />
      <div className="stage home">
        <p className="eyebrow">1stdate · {getDeckTitle(deckId)}</p>
        <h1 className="brand">Jusqu’où tu vas ?</h1>
        <p className="lede">Trois niveaux. Tu vois les cartes. Tu choisis celle que tu poses.</p>

        <div className="level-stacks">
          {groups.map((g) => {
            const count = questionsForLevel(deckId, g.key).length
            return (
              <button
                key={g.key}
                type="button"
                className={`level-stack ${depthTone(g.key)}`}
                onClick={() => setLevel(g.key)}
              >
                <span className="level-stack-label">{g.label}</span>
                <span className="level-stack-hint">{g.hint}</span>
                <span className="level-stack-count">{count} cartes</span>
              </button>
            )
          })}
        </div>

        <div className="actions">
          <button className="btn btn-ghost" onClick={onBack}>
            Retour
          </button>
        </div>
      </div>
    </main>
  )
}
