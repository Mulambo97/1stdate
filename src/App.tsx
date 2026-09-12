import { useMemo, useState } from 'react'
import { deckOptions, getDeckTitle, getQuestion } from './questions'
import SoloPlay from './SoloPlay'
import type { DeckId } from './types'
import { useRoom } from './useRoom'

function depthLabel(level?: string) {
  if (level === 'JOKER' || level === 'DÉFI' || level === 'WILDCARD' || level === 'CHALLENGE') {
    return 'Défi'
  }
  if (level === 'DERNIÈRE QUESTION' || level === 'LAST QUESTION') return 'La dernière question'
  if (level === 'Brise-glace' || level === 'Ice Breakers') return 'Brise-glace'
  if (level === 'Confidences' || level === 'Confessions') return 'Confidences'
  if (level === 'En profondeur' || level === 'Getting Deep') return 'En profondeur'
  if (level === 'Niveau 1' || level === 'Level 1') return 'Surface'
  if (level === 'Niveau 2' || level === 'Level 2') return 'Plus profond'
  if (level === 'Niveau 3' || level === 'Level 3') return 'Le plus profond'
  return 'Ce soir'
}

function depthTone(level?: string) {
  if (level === 'JOKER' || level === 'DÉFI' || level === 'WILDCARD' || level === 'CHALLENGE') {
    return 'tone-wild'
  }
  if (level === 'DERNIÈRE QUESTION' || level === 'LAST QUESTION') return 'tone-finale'
  if (level === 'Niveau 2' || level === 'Level 2' || level === 'Confidences' || level === 'Confessions') {
    return 'tone-2'
  }
  if (
    level === 'Niveau 3' ||
    level === 'Level 3' ||
    level === 'En profondeur' ||
    level === 'Getting Deep'
  ) {
    return 'tone-3'
  }
  return 'tone-1'
}

export default function App() {
  const room = useRoom()
  const [name, setName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [mode, setMode] = useState<'home' | 'join'>('home')
  const [deckId, setDeckId] = useState<DeckId>('for-dates')
  const [solo, setSolo] = useState(false)

  const me = room.slot
  const state = room.state
  const activeDeck = state?.deckId ?? deckId
  const currentId = state?.deck[state.cardIndex]
  const current = currentId != null ? getQuestion(activeDeck, currentId) : null
  const total = state?.deck.length ?? 0
  const progress = state && total ? ((state.cardIndex + 1) / total) * 100 : 0

  const partner = useMemo(() => {
    if (!state || !me) return null
    const other = me === 'a' ? 'b' : 'a'
    return state.players[other] ?? null
  }, [state, me])

  if (solo) {
    return <SoloPlay deckId={deckId} onBack={() => setSolo(false)} />
  }

  if (!state || !me) {
    return (
      <main className={`shell ${depthTone()}`}>
        <div className="atmosphere" aria-hidden />
        <div className="stage home">
          <p className="eyebrow">Un rendez-vous, une personne choisit les cartes</p>
          <h1 className="brand">1stdate</h1>
          <p className="lede">
            Choisis le niveau — brise-glace, confidences, en profondeur — puis la question que tu
            poses.
          </p>

          <section className="invite">
            <div className="field">
              <label htmlFor="name">Ton prénom</label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Comment doit-on t’appeler ?"
                autoComplete="nickname"
              />
            </div>

            <div className="deck-picker" role="radiogroup" aria-label="Jeu de questions">
              <p className="field-label">Jeu de questions</p>
              {deckOptions.map((deck) => (
                <button
                  key={deck.id}
                  type="button"
                  role="radio"
                  aria-checked={deckId === deck.id}
                  className={`deck-option ${deckId === deck.id ? 'selected' : ''}`}
                  onClick={() => setDeckId(deck.id)}
                >
                  <span className="deck-title">{deck.title}</span>
                  <span className="deck-sub">{deck.subtitle}</span>
                </button>
              ))}
            </div>

            {room.session ? (
              <div className="continue-box">
                <p className="continue-copy">
                  Tu as une soirée en cours avec le code <strong>{room.session.code}</strong> en
                  tant que <strong>{room.session.name}</strong>.
                </p>
                <div className="actions">
                  <button className="btn btn-primary" onClick={room.continueSession}>
                    Reprendre où on en était
                  </button>
                  <button className="btn btn-ghost" onClick={room.leaveSession}>
                    Recommencer
                  </button>
                </div>
              </div>
            ) : null}

            {mode === 'home' ? (
              <div className="actions">
                <button className="btn btn-primary" onClick={() => setSolo(true)}>
                  Jouer
                </button>
                <button
                  className="btn btn-ghost"
                  disabled={!name.trim() || !room.connected}
                  onClick={() => room.create(name.trim(), deckId)}
                >
                  Inviter quelqu’un
                </button>
                <button className="btn btn-ghost" onClick={() => setMode('join')}>
                  J’ai un code
                </button>
              </div>
            ) : (
              <div className="join-row">
                <div className="field">
                  <label htmlFor="code">Code d’invitation</label>
                  <input
                    id="code"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="AB12"
                    maxLength={4}
                    autoCapitalize="characters"
                  />
                </div>
                <div className="actions">
                  <button
                    className="btn btn-primary"
                    disabled={!name.trim() || joinCode.trim().length < 4}
                    onClick={() => room.join(joinCode.trim(), name.trim())}
                  >
                    S’asseoir ensemble
                  </button>
                  <button className="btn btn-ghost" onClick={() => setMode('home')}>
                    Retour
                  </button>
                </div>
              </div>
            )}

            <p className="note">
              Jouer : une personne choisit les questions par niveau. Inviter : toujours 2 personnes
              par salle.
            </p>

            {room.error ? <p className="error">{room.error}</p> : null}
          </section>

          <aside className="ritual">
            <p className="ritual-title">Comme en vrai</p>
            <ul>
              <li>Une personne tient le téléphone et choisit la carte</li>
              <li>Commence par Brise-glace, puis Confidences, puis En profondeur</li>
              <li>Lis la question à voix haute — l’autre répond</li>
              <li>Ne précipite rien. Tu n’as pas à tout finir</li>
            </ul>
          </aside>
        </div>
      </main>
    )
  }

  const playerA = state.players.a
  const playerB = state.players.b
  const myPlayer = state.players[me]
  const myReady = myPlayer?.ready
  const myShared = myPlayer?.shared
  const canAdvance = !!(playerA?.shared && playerB?.shared)

  if (state.status === 'waiting' || !state.bothReady) {
    return (
      <main className={`shell ${depthTone()}`}>
        <div className="atmosphere" aria-hidden />
        <div className="stage">
          <p className="eyebrow">
            {getDeckTitle(state.deckId)} · votre table privée
          </p>
          <h1 className="brand">On s’attend</h1>
          <p className="lede">
            Envoie ce code, puis lancez un appel vidéo pour vous voir pendant que vous jouez.
          </p>

          <div className="code-block">
            <p className="code-label">Invitation · garde-la pour continuer plus tard</p>
            <p className="room-code">{state.code}</p>
          </div>

          <ul className="seats">
            <li className={playerA ? 'filled' : undefined}>
              <span className="seat-name">{playerA?.name ?? 'Place une'}</span>
              <span className="seat-state">
                {playerA
                  ? `${playerA.online ? '' : 'Absent·e · '}${playerA.ready ? 'Prêt·e' : 'Là'}`
                  : 'Libre'}
              </span>
            </li>
            <li className={playerB ? 'filled' : undefined}>
              <span className="seat-name">{playerB?.name ?? 'Place deux'}</span>
              <span className="seat-state">
                {playerB
                  ? `${playerB.online ? '' : 'Absent·e · '}${playerB.ready ? 'Prêt·e' : 'Là'}`
                  : 'Libre'}
              </span>
            </li>
          </ul>

          <div className="actions">
            <button className="btn btn-primary" disabled={!!myReady || !playerB} onClick={room.ready}>
              {myReady
                ? `On attend ${partner?.name ?? 'l’autre'}…`
                : playerB
                  ? 'Je suis prêt·e quand tu l’es'
                  : 'En attente de l’autre'}
            </button>
          </div>
          {room.error ? <p className="error">{room.error}</p> : null}
        </div>
      </main>
    )
  }

  if (state.status === 'finished') {
    return (
      <main className={`shell tone-finale`}>
        <div className="atmosphere" aria-hidden />
        <div className="stage">
          <p className="eyebrow">Vous êtes allés loin</p>
          <h1 className="brand">Restez encore un peu</h1>
          <p className="lede">
            Les cartes sont finies. Le meilleur de la soirée, c’est peut-être ce que vous dites
            ensuite.
          </p>
          <div className="actions">
            <button className="btn btn-primary" onClick={room.restart}>
              Une autre manche
            </button>
          </div>
        </div>
      </main>
    )
  }

  const turnName = state.players[state.turn]?.name ?? 'Quelqu’un'
  const isMyTurn = state.turn === me
  const isWildcard =
    current?.level === 'JOKER' ||
    current?.level === 'DÉFI' ||
    current?.level === 'WILDCARD' ||
    current?.level === 'CHALLENGE'
  const isFinale = current?.level === 'DERNIÈRE QUESTION' || current?.level === 'LAST QUESTION'

  return (
    <main className={`shell ${depthTone(current?.level)}`}>
      <div className="atmosphere" aria-hidden />
      <div className="stage play">
        <header className="play-top">
          <div>
            <p className="eyebrow">
              1stdate · {getDeckTitle(state.deckId)} ·{' '}
              {partner ? `avec ${partner.name}` : 'ensemble'} · {state.code}
            </p>
            <p className="depth-now">{depthLabel(current?.level)}</p>
          </div>
          <p className="count">
            {state.cardIndex + 1}
            <span> / {total}</span>
          </p>
        </header>

        <div className="depth-track" aria-hidden>
          <span style={{ width: `${progress}%` }} />
        </div>

        <article
          key={currentId}
          className={`prompt ${isWildcard ? 'is-wild' : ''} ${isFinale ? 'is-finale' : ''}`}
        >
          <p className="level-tag">{depthLabel(current?.level)}</p>
          <h1 className="question">{current?.question ?? '…'}</h1>
          <p className="turn-line">
            {isWildcard
              ? 'Faites-le ensemble — puis parlez de ce que ça a fait.'
              : isMyTurn
                ? 'Tu réponds en premier. Prends ton temps.'
                : `${turnName} répond en premier. Écoute vraiment.`}
          </p>
        </article>

        <ul className="seats compact">
          <li className={state.turn === 'a' ? 'speaking' : undefined}>
            <span className="seat-name">{playerA?.name ?? 'Joueur A'}</span>
            <span className="seat-state">
              {!playerA?.online
                ? 'Absent·e'
                : playerA?.shared
                  ? 'A partagé'
                  : state.turn === 'a'
                    ? 'Parle'
                    : 'Écoute'}
            </span>
          </li>
          <li className={state.turn === 'b' ? 'speaking' : undefined}>
            <span className="seat-name">{playerB?.name ?? 'Joueur B'}</span>
            <span className="seat-state">
              {!playerB?.online
                ? 'Absent·e'
                : playerB?.shared
                  ? 'A partagé'
                  : state.turn === 'b'
                    ? 'Parle'
                    : 'Écoute'}
            </span>
          </li>
        </ul>

        <div className="actions">
          {!myShared ? (
            <button className="btn btn-primary" onClick={room.shared}>
              J’ai partagé
            </button>
          ) : !canAdvance ? (
            <button className="btn btn-primary" disabled>
              On attend {partner?.name ?? 'l’autre'}…
            </button>
          ) : (
            <button className="btn btn-primary" onClick={room.next}>
              {isFinale ? 'Clore la soirée' : 'Aller plus loin'}
            </button>
          )}
        </div>
        <p className="note">
          La progression est sauvée. Revenez avec le code {state.code} et les mêmes prénoms.
        </p>
      </div>
    </main>
  )
}
