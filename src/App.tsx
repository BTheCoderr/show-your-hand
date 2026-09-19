import { useMemo, useRef, useState } from 'react'
import { advanceComputers } from './game/ai'
import {
  actorId,
  canDeclare,
  countInPlay,
  emptyMenuState,
  instructionFor,
  reduce,
  validDefenseChoices,
} from './game/engine'
import { currentPlayer, handCards, nameOf, playerById } from './game/helpers'
import { clearMatch, loadMatch, saveMatch } from './game/persist'
import { scoreHand } from './game/scoring'
import type { Action, Color, GameState } from './game/types'
import { COLORS } from './game/types'
import { CardView } from './ui/CardView'
import { RulesPanel } from './ui/RulesPanel'
import { StartScreen } from './ui/StartScreen'

function apply(state: GameState, action: Action): GameState {
  return advanceComputers(reduce(state, action))
}

function opponentSeatClass(index: number, total: number) {
  const layouts: Record<number, string[]> = {
    1: ['is-top'],
    2: ['is-top-left', 'is-top-right'],
    3: ['is-left', 'is-top', 'is-right'],
    4: ['is-left', 'is-top-left', 'is-top-right', 'is-right'],
    5: ['is-left', 'is-top-left', 'is-top', 'is-top-right', 'is-right'],
  }
  return layouts[total]?.[index] ?? 'is-top'
}

export function App() {
  const saved = useMemo(() => loadMatch(), [])
  const [menuCount, setMenuCount] = useState<1 | 2 | 3 | 4 | 5>(2)
  const [menuTest, setMenuTest] = useState(false)
  const [showStart, setShowStart] = useState(() => !saved || saved.phase.type === 'menu')
  const [state, setState] = useState<GameState>(() => saved ?? emptyMenuState())
  const [rulesOpen, setRulesOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [shuffleTargets, setShuffleTargets] = useState<string[]>([])
  const [dropColor, setDropColor] = useState<Color>('orange')
  const lock = useRef(false)

  const dispatch = (action: Action) => {
    if (lock.current) return
    lock.current = true
    try {
      const next = apply(state, action)
      setState(next)
      saveMatch(next)
      setShuffleTargets([])
    } finally {
      window.setTimeout(() => {
        lock.current = false
      }, 180)
    }
  }

  const start = () => {
    const next = apply(emptyMenuState(menuTest), {
      type: 'START_MATCH',
      opponentCount: menuCount,
      testMode: menuTest,
    })
    setState(next)
    saveMatch(next)
    setShowStart(false)
  }

  const humanTurn =
    actorId(state) === 'human' &&
    (state.phase.type === 'choose_action' || state.phase.type === 'choose_targets')
  const waiting = Boolean(actorId(state) && actorId(state) !== 'human')
  const opponents = state.players.filter((player) => !player.isHuman)

  return (
    <div className="syh-app">
      <header className="syh-top">
        <strong>SHOW YOUR HAND</strong>
        <nav>
          <button type="button" onClick={() => setRulesOpen(true)}>
            Rules
          </button>
          <button type="button" onClick={() => setHistoryOpen((value) => !value)}>
            History
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: 'TOGGLE_TEST_MODE' })}
          >
            {state.testMode ? 'Test on' : 'Test off'}
          </button>
          <button
            type="button"
            onClick={() => {
              clearMatch()
              setState(emptyMenuState(menuTest))
              setShowStart(true)
            }}
          >
            Restart
          </button>
        </nav>
      </header>

      {showStart || state.phase.type === 'menu' ? (
        <StartScreen
          opponentCount={menuCount}
          testMode={menuTest}
          hasSave={Boolean(saved && saved.phase.type !== 'menu')}
          onCount={setMenuCount}
          onTestMode={setMenuTest}
          onStart={start}
          onResume={() => {
            if (saved) {
              setState(saved)
              setShowStart(false)
            }
          }}
          onRules={() => setRulesOpen(true)}
        />
      ) : (
        <main className={`syh-table ${waiting ? 'is-locked' : ''}`}>
          <p className="syh-instruction">{instructionFor(state)}</p>
          {state.testMode ? (
            <p className="syh-count-line">
              Cards in play: {countInPlay(state)} / 70 · Draw {state.drawPile.length} · Discard{' '}
              {state.discardPile.length}
            </p>
          ) : null}

          <div className="syh-board" data-player-count={state.players.length}>
          <section className="syh-opponents">
            {opponents.map((player, index) => {
                const reveal =
                  state.testMode || state.revealedUntilTurnEnd.includes(player.id)
                const active = state.players[state.currentPlayerIndex].id === player.id
                return (
                  <article
                    key={player.id}
                    className={`syh-seat ${opponentSeatClass(index, opponents.length)} ${active ? 'is-active' : ''}`}
                  >
                    <div className="syh-row">
                      {handCards(state, player.id).map((card) => (
                        <CardView
                          key={card.id}
                          card={card}
                          faceDown={!reveal}
                          compact
                          onClick={
                            state.phase.type === 'choose_targets'
                              ? () => {
                                  const selected = state.catalog[state.phase.type === 'choose_targets' ? state.phase.cardId : '']
                                  if (!selected) return
                                  if (selected.kind === 'shuffle') {
                                    setShuffleTargets((current) => {
                                      if (current.includes(player.id)) {
                                        return current.filter((id) => id !== player.id)
                                      }
                                      if (current.length >= 2) return current
                                      return [...current, player.id]
                                    })
                                    return
                                  }
                                  if (selected.kind === 'drop-color') {
                                    dispatch({
                                      type: 'CONFIRM_ATTACK',
                                      playerId: 'human',
                                      cardId: selected.id,
                                      targetIds: [player.id],
                                      color: dropColor,
                                    })
                                    return
                                  }
                                  dispatch({
                                    type: 'CONFIRM_ATTACK',
                                    playerId: 'human',
                                    cardId: selected.id,
                                    targetIds: [player.id],
                                  })
                                }
                              : undefined
                          }
                        />
                      ))}
                    </div>
                    <header className="syh-nameplate">
                      <span>{player.name}</span>
                      <span className="syh-seat-meta">
                        <b>{player.score} pts</b>
                        {active ? <span className="syh-turn-chip">TURN</span> : null}
                      </span>
                    </header>
                    {state.revealedUntilTurnEnd.includes(player.id) ? (
                      <p className="syh-tag">Hand revealed this turn</p>
                    ) : null}
                    {state.phase.type === 'choose_targets' &&
                    shuffleTargets.includes(player.id) ? (
                      <p className="syh-tag">Selected for Shuffle</p>
                    ) : null}
                  </article>
                )
              })}
          </section>

          <section className="syh-center">
            <div className="syh-table-mark" aria-hidden="true">
              SHOW YOUR HAND
            </div>
            <div className="syh-center-piles">
              <div className="syh-pile">
                <CardView faceDown />
                <span>Draw · {state.drawPile.length}</span>
              </div>
              <div className="syh-pile">
                <CardView
                  card={
                    state.discardPile.length
                      ? state.catalog[state.discardPile[state.discardPile.length - 1]]
                      : undefined
                  }
                  faceDown={state.discardPile.length === 0}
                />
                <span>Discard · {state.discardPile.length}</span>
              </div>
            </div>
            <div className="syh-status">
              <span className="syh-clockwise">↻ Clockwise</span>
              <span>Turn: <b>{nameOf(state, currentPlayer(state).id)}</b></span>
            </div>
          </section>

          {state.phase.type === 'choose_targets' ? (
            <section className="syh-chooser">
              {state.catalog[state.phase.cardId].kind === 'drop-color' ? (
                <div className="syh-colors">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`syh-color is-${color} ${dropColor === color ? 'is-on' : ''}`}
                      onClick={() => setDropColor(color)}
                    >
                      {color}
                    </button>
                  ))}
                  <p>Tap a color, then tap the opponent to attack.</p>
                </div>
              ) : null}
              {state.catalog[state.phase.cardId].kind === 'shuffle' ? (
                <div className="syh-shuffle-bar">
                  <button
                    type="button"
                    className="syh-primary"
                    data-testid="confirm-shuffle"
                    disabled={shuffleTargets.length === 0}
                    onClick={() =>
                      dispatch({
                        type: 'CONFIRM_ATTACK',
                        playerId: 'human',
                        cardId: state.phase.type === 'choose_targets' ? state.phase.cardId : '',
                        targetIds: shuffleTargets,
                      })
                    }
                  >
                    Confirm Shuffle
                  </button>
                  <button type="button" className="syh-text-btn" onClick={() => dispatch({ type: 'CANCEL_SELECTION' })}>
                    Cancel
                  </button>
                </div>
              ) : (
                <button type="button" className="syh-text-btn" onClick={() => dispatch({ type: 'CANCEL_SELECTION' })}>
                  Cancel
                </button>
              )}
            </section>
          ) : null}

          <section
            className={`syh-you ${
              state.players[state.currentPlayerIndex].id === 'human' ? 'is-active' : ''
            }`}
          >
            <header className="syh-nameplate">
              <span>You · {playerById(state, 'human').score} pts</span>
              <span className="syh-you-meta">
                {scoreHand(handCards(state, 'human')) ? (
                  <em>Scoring hand ready</em>
                ) : null}
                {state.players[state.currentPlayerIndex].id === 'human' ? (
                  <span className="syh-turn-chip">YOUR TURN</span>
                ) : null}
              </span>
            </header>
            <div className="syh-row is-you">
              {handCards(state, 'human').map((card) => (
                <CardView
                  key={card.id}
                  card={card}
                  selected={state.selectedCardId === card.id}
                  disabled={!humanTurn}
                  onClick={
                    humanTurn && state.phase.type === 'choose_action'
                      ? () => dispatch({ type: 'SELECT_CARD', playerId: 'human', cardId: card.id })
                      : undefined
                  }
                />
              ))}
            </div>
            <div className="syh-you-actions">
              <button
                type="button"
                className="syh-primary"
                disabled={!canDeclare(state, 'human')}
                data-testid="declare-hand"
                onClick={() => dispatch({ type: 'DECLARE', playerId: 'human' })}
              >
                Declare Hand
              </button>
              {state.phase.type === 'may_declare' && state.phase.playerId === 'human' ? (
                <button
                  type="button"
                  className="syh-secondary"
                  onClick={() => dispatch({ type: 'PASS_DECLARE', playerId: 'human' })}
                >
                  Pass
                </button>
              ) : null}
              {state.phase.type === 'review_hands' ? (
                <button
                  type="button"
                  className="syh-secondary"
                  data-testid="continue-reveal"
                  onClick={() => dispatch({ type: 'CONTINUE' })}
                >
                  Continue
                </button>
              ) : null}
            </div>
          </section>
          </div>

          {state.phase.type === 'await_defense' && state.phase.responderId === 'human' ? (
            <DefensePrompt
              title={`Defend against ${state.phase.attack.kind.replace(/-/g, ' ')}`}
              choices={validDefenseChoices(state, 'human', state.phase.attack.kind)}
              onChoose={(response) =>
                dispatch({ type: 'RESPOND_DEFENSE', playerId: 'human', response })
              }
            />
          ) : null}

          {state.phase.type === 'choose_reverse_color' && state.phase.reverserId === 'human' ? (
            <div className="syh-modal">
              <div className="syh-modal-card">
                <h2>Reverse Drop Color</h2>
                <p>Name the color the attacker must drop.</p>
                <div className="syh-colors">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`syh-color is-${color}`}
                      onClick={() =>
                        dispatch({ type: 'CHOOSE_REVERSE_COLOR', playerId: 'human', color })
                      }
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {state.phase.type === 'await_reverse_blank' &&
          state.phase.attack.attackerId === 'human' ? (
            <DefensePrompt
              title={`Reverse Drop Color — ${state.phase.reverseColor}`}
              choices={
                handCards(state, 'human').some((card) => card.kind === 'blank')
                  ? ['accept', 'blank']
                  : ['accept']
              }
              onChoose={(response) =>
                dispatch({
                  type: 'RESPOND_REVERSE_BLANK',
                  playerId: 'human',
                  response: response === 'blank' ? 'blank' : 'accept',
                })
              }
            />
          ) : null}

          {state.phase.type === 'round_over' ? (
            <div className="syh-modal">
              <div className="syh-modal-card">
                <h2>Round over</h2>
                <p>
                  {nameOf(state, state.phase.winnerId)} scored {state.phase.points} for{' '}
                  {state.phase.label}.
                </p>
                <button type="button" className="syh-primary" data-testid="next-round" onClick={() => dispatch({ type: 'NEXT_ROUND' })}>
                  Next round
                </button>
              </div>
            </div>
          ) : null}

          {state.phase.type === 'match_over' ? (
            <div className="syh-modal">
              <div className="syh-modal-card">
                <h2>Match over</h2>
                <p>{nameOf(state, state.phase.winnerId)} reached {state.matchPointGoal} points.</p>
                <button
                  type="button"
                  className="syh-primary"
                  onClick={() => {
                    clearMatch()
                    setState(emptyMenuState(state.testMode))
                    setShowStart(true)
                  }}
                >
                  Play again
                </button>
              </div>
            </div>
          ) : null}

          {historyOpen ? (
            <aside className="syh-history">
              <header>
                <h2>Action history</h2>
                <button type="button" onClick={() => setHistoryOpen(false)}>
                  Close
                </button>
              </header>
              <ol>
                {state.history.map((line, index) => (
                  <li key={`${index}-${line}`}>{line}</li>
                ))}
              </ol>
            </aside>
          ) : null}
        </main>
      )}

      <RulesPanel open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
  )
}

function DefensePrompt({
  title,
  choices,
  onChoose,
}: {
  title: string
  choices: Array<'accept' | 'blank' | 'counter'>
  onChoose: (choice: 'accept' | 'blank' | 'counter') => void
}) {
  return (
    <div className="syh-modal">
      <div className="syh-modal-card">
        <h2>{title}</h2>
        <p>Play a valid counter, or accept the attack.</p>
        <div className="syh-start-actions">
          {choices.includes('blank') ? (
            <button type="button" className="syh-secondary" onClick={() => onChoose('blank')}>
              Play Blank
            </button>
          ) : null}
          {choices.includes('counter') ? (
            <button type="button" className="syh-secondary" onClick={() => onChoose('counter')}>
              Play matching counter
            </button>
          ) : null}
          <button type="button" className="syh-primary" onClick={() => onChoose('accept')}>
            Accept Attack
          </button>
        </div>
      </div>
    </div>
  )
}
