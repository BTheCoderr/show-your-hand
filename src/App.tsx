import { useEffect, useMemo, useRef, useState } from 'react'
import { chooseAiAction } from './game/ai'
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
import { loadPreferences, savePreferences } from './game/preferences'
import { scoreHand } from './game/scoring'
import type { Action, Color, GameState } from './game/types'
import { COLORS } from './game/types'
import { CardView } from './ui/CardView'
import { FirstVisitPrompt } from './ui/FirstVisitPrompt'
import { RulesPanel } from './ui/RulesPanel'
import { StartScreen } from './ui/StartScreen'
import { Tutorial } from './ui/Tutorial'

const TURN_SECONDS = 120

type AttackSpotlight = {
  cardId: string
  actor: string
  label: string
}

function cardLabel(state: GameState, cardId: string): string {
  const card = state.catalog[cardId]
  if (!card) return 'Special card'
  return card.kind === 'number'
    ? `${card.color} ${card.number}`
    : card.kind
        .split('-')
        .map((part) => part[0]?.toUpperCase() + part.slice(1))
        .join(' ')
}

function attackPresentationFor(state: GameState, action: Action): AttackSpotlight | null {
  if (action.type !== 'CONFIRM_ATTACK' && action.type !== 'SELECT_CARD') return null
  const card = state.catalog[action.cardId]
  if (!card || card.kind === 'number' || card.kind === 'blank') return null
  if (action.type === 'SELECT_CARD' && card.kind !== 'skip') return null

  return {
    cardId: card.id,
    actor: nameOf(state, action.playerId),
    label: cardLabel(state, card.id),
  }
}

function beginnerHelp(state: GameState): string | null {
  const phase = state.phase
  switch (phase.type) {
    case 'choose_action':
      if (!currentPlayer(state).isHuman) {
        return 'Watch the glowing seat and the move banner. The computer will make one visible move at a time.'
      }
      return canDeclare(state, 'human')
        ? 'You have a scoring hand. You can Declare now, or keep playing if you want to improve it.'
        : 'Swipe one card upward. Number cards and Blank are discarded; attack cards will guide you to a target.'
    case 'choose_targets': {
      const card = state.catalog[phase.cardId]
      if (card.kind === 'shuffle') return 'Tap one or two opponents, then press Confirm Shuffle.'
      if (card.kind === 'drop-color') return 'Choose a color first, then tap the opponent you want to attack.'
      return 'Tap the opponent whose hand you want revealed.'
    }
    case 'await_defense':
      if (phase.responderId !== 'human') return 'The targeted player is deciding whether to defend.'
      return 'Accept the attack, use Blank to cancel it, or use a matching special to counter when available.'
    case 'claim_dropped':
      return phase.claimantId === 'human'
        ? 'Tap any dropped cards you want to keep. You may take none, some, or all of them.'
        : 'The attacker may claim cards that were forced out by Drop Color.'
    case 'trim_hand':
      return phase.playerId === 'human'
        ? 'You claimed extra cards. Choose enough cards to discard until your hand is back to five.'
        : 'The computer is trimming its hand back to five cards.'
    case 'choose_reverse_color':
      return phase.reverserId === 'human'
        ? 'Your matching Drop Color reversed the attack. Pick the color the original attacker must drop.'
        : 'A Drop Color counter reversed the attack.'
    case 'await_reverse_blank':
      return phase.attack.attackerId === 'human'
        ? 'You can spend a Blank to cancel the reversed Drop Color, or accept it.'
        : 'The original attacker gets one chance to Blank the reversal.'
    case 'may_declare':
      return phase.playerId === 'human'
        ? 'Your hand scores. Declare it to end the round and collect the points, or pass.'
        : 'A computer player has a scoring hand and may declare.'
    case 'review_hands':
      return 'Take a moment to read the revealed hand, then press Continue.'
    case 'round_over':
      return 'The scoring hand ends the round. Press Next round to reshuffle and deal again.'
    case 'match_over':
      return 'The first player to 5 total points wins the match.'
    default:
      return null
  }
}

function formatTurnTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function apply(state: GameState, action: Action): GameState {
  return reduce(state, action)
}

function actionLabel(state: GameState, action: Action): string {
  const playerId = 'playerId' in action ? action.playerId : actorId(state)
  const playerName = playerId ? nameOf(state, playerId) : 'Opponent'

  if (action.type === 'SELECT_CARD' || action.type === 'CONFIRM_ATTACK') {
    return `${playerName} plays ${cardLabel(state, action.cardId)}`
  }

  if (action.type === 'TAKE_DISCARD') return `${playerName} takes the discard`
  if (action.type === 'RESPOND_DEFENSE') {
    return action.response === 'accept'
      ? `${playerName} accepts the attack`
      : `${playerName} defends with ${action.response === 'blank' ? 'Blank' : 'a counter'}`
  }
  if (action.type === 'DECLARE') return `${playerName} declares a scoring hand`
  if (action.type === 'PASS_DECLARE') return `${playerName} passes`
  if (action.type === 'CLAIM_DROPPED') return `${playerName} claims dropped cards`
  if (action.type === 'TRIM_HAND') return `${playerName} discards extras`
  if (action.type === 'CHOOSE_REVERSE_COLOR') return `${playerName} reverses with ${action.color}`
  if (action.type === 'RESPOND_REVERSE_BLANK') {
    return action.response === 'blank'
      ? `${playerName} blocks the reversal with Blank`
      : `${playerName} accepts the reversal`
  }
  return `${playerName} made a move`
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
  const initialPreferences = useMemo(() => loadPreferences(), [])
  const [menuCount, setMenuCount] = useState<1 | 2 | 3 | 4 | 5>(2)
  const [menuTest, setMenuTest] = useState(false)
  const [showStart, setShowStart] = useState(() => !saved || saved.phase.type === 'menu')
  const [state, setState] = useState<GameState>(() => saved ?? emptyMenuState())
  const [rulesOpen, setRulesOpen] = useState(false)
  const [tutorialOpen, setTutorialOpen] = useState(false)
  const [tutorialPromptSeen, setTutorialPromptSeen] = useState(initialPreferences.tutorialPromptSeen)
  const [firstVisitOpen, setFirstVisitOpen] = useState(!initialPreferences.tutorialPromptSeen)
  const [beginnerMode, setBeginnerMode] = useState(initialPreferences.beginnerMode)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [shuffleTargets, setShuffleTargets] = useState<string[]>([])
  const [claimedDropIds, setClaimedDropIds] = useState<string[]>([])
  const [trimIds, setTrimIds] = useState<string[]>([])
  const [dropColor, setDropColor] = useState<Color>('orange')
  const [turnSeconds, setTurnSeconds] = useState(TURN_SECONDS)
  const [openingShuffle, setOpeningShuffle] = useState(false)
  const [moveNotice, setMoveNotice] = useState<string | null>(null)
  const [attackSpotlight, setAttackSpotlight] = useState<AttackSpotlight | null>(null)
  const lock = useRef(false)
  const moveNoticeTimer = useRef<number | null>(null)
  const attackTimer = useRef<number | null>(null)

  const commitAction = (source: GameState, action: Action) => {
    const next = apply(source, action)
    setState(next)
    saveMatch(next)
    setShuffleTargets([])
    setClaimedDropIds([])
    setTrimIds([])
  }

  const dispatch = (action: Action) => {
    if (lock.current) return
    const presentation = attackPresentationFor(state, action)

    if (presentation) {
      lock.current = true
      setAttackSpotlight(presentation)
      if (attackTimer.current) window.clearTimeout(attackTimer.current)
      attackTimer.current = window.setTimeout(() => {
        commitAction(state, action)
        setAttackSpotlight(null)
        lock.current = false
      }, beginnerMode ? 900 : 650)
      return
    }

    lock.current = true
    try {
      commitAction(state, action)
    } finally {
      window.setTimeout(() => {
        lock.current = false
      }, 180)
    }
  }

  const updateBeginnerMode = (value: boolean) => {
    setBeginnerMode(value)
    savePreferences({ tutorialPromptSeen, beginnerMode: value })
  }

  const dismissFirstVisit = (openTutorial: boolean) => {
    setFirstVisitOpen(false)
    setTutorialPromptSeen(true)
    savePreferences({ tutorialPromptSeen: true, beginnerMode })
    if (openTutorial) setTutorialOpen(true)
  }

  const start = () => {
    if (openingShuffle) return
    setOpeningShuffle(true)
    window.setTimeout(() => {
      const next = apply(emptyMenuState(menuTest), {
        type: 'START_MATCH',
        opponentCount: menuCount,
        testMode: menuTest,
      })
      setState(next)
      saveMatch(next)
      setShowStart(false)
      setOpeningShuffle(false)
    }, 1400)
  }

  const activeActorId = actorId(state)

  useEffect(() => {
    if (
      showStart ||
      tutorialOpen ||
      openingShuffle ||
      !activeActorId ||
      activeActorId === 'human' ||
      state.phase.type === 'menu' ||
      state.phase.type === 'round_over' ||
      state.phase.type === 'match_over'
    ) {
      return
    }

    const timer = window.setTimeout(() => {
      try {
        const action = chooseAiAction(state)
        setMoveNotice(actionLabel(state, action))
        const presentation = attackPresentationFor(state, action)

        const resolveMove = () => {
          const next = reduce(state, action)
          setState(next)
          saveMatch(next)
          setAttackSpotlight(null)
        }

        if (presentation) {
          setAttackSpotlight(presentation)
          if (attackTimer.current) window.clearTimeout(attackTimer.current)
          attackTimer.current = window.setTimeout(resolveMove, beginnerMode ? 900 : 650)
        } else {
          resolveMove()
        }

        if (moveNoticeTimer.current) window.clearTimeout(moveNoticeTimer.current)
        moveNoticeTimer.current = window.setTimeout(
          () => setMoveNotice(null),
          beginnerMode ? 1800 : 1100,
        )
      } catch {
        setMoveNotice(null)
        setAttackSpotlight(null)
      }
    }, beginnerMode ? 1500 : 900)

    return () => window.clearTimeout(timer)
  }, [activeActorId, beginnerMode, openingShuffle, showStart, state, tutorialOpen])

  useEffect(() => {
    setTurnSeconds(TURN_SECONDS)
  }, [activeActorId, state.roundStarterIndex, showStart])

  useEffect(() => {
    if (
      showStart ||
      tutorialOpen ||
      beginnerMode ||
      !activeActorId ||
      state.phase.type === 'menu' ||
      state.phase.type === 'round_over' ||
      state.phase.type === 'match_over'
    ) {
      return
    }
    const timer = window.setInterval(() => {
      setTurnSeconds((seconds) => Math.max(0, seconds - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [activeActorId, beginnerMode, showStart, state.phase.type, tutorialOpen])

  const humanTurn =
    actorId(state) === 'human' &&
    (state.phase.type === 'choose_action' || state.phase.type === 'choose_targets')
  const waiting = Boolean(actorId(state) && actorId(state) !== 'human')
  const opponents = state.players.filter((player) => !player.isHuman)
  const topDiscardId = state.discardPile.at(-1)
  const topDiscard = topDiscardId ? state.catalog[topDiscardId] : undefined
  const canTakeDiscard =
    state.phase.type === 'choose_action' &&
    currentPlayer(state).id === 'human' &&
    playerById(state, 'human').hand.length === 5 &&
    topDiscard?.kind === 'number'

  return (
    <div className="syh-app">
      <header className="syh-top">
        <strong>SHOW YOUR HAND</strong>
        <nav>
          <button
            type="button"
            className={beginnerMode ? 'is-mode-on' : ''}
            aria-pressed={beginnerMode}
            onClick={() => updateBeginnerMode(!beginnerMode)}
          >
            {beginnerMode ? 'Beginner on' : 'Beginner off'}
          </button>
          <button type="button" onClick={() => setTutorialOpen(true)}>
            Tutorial
          </button>
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

      {openingShuffle ? (
        <div className="syh-opening-shuffle" role="status" aria-live="polite">
          <div className="syh-opening-shuffle-card syh-opening-card-one" />
          <div className="syh-opening-shuffle-card syh-opening-card-two" />
          <div className="syh-opening-shuffle-card syh-opening-card-three" />
          <strong>SHUFFLING THE DECK</strong>
          <span>Mixing all 70 cards before the deal…</span>
        </div>
      ) : null}

      {moveNotice ? (
        <div className="syh-move-notice" role="status" aria-live="polite">
          {moveNotice}
        </div>
      ) : null}

      <FirstVisitPrompt
        open={firstVisitOpen}
        onTutorial={() => dismissFirstVisit(true)}
        onSkip={() => dismissFirstVisit(false)}
      />

      {showStart || state.phase.type === 'menu' ? (
        <StartScreen
          opponentCount={menuCount}
          testMode={menuTest}
          beginnerMode={beginnerMode}
          hasSave={Boolean(saved && saved.phase.type !== 'menu')}
          onCount={setMenuCount}
          onTestMode={setMenuTest}
          onBeginnerMode={updateBeginnerMode}
          onStart={start}
          onResume={() => {
            if (saved) {
              setState(saved)
              setShowStart(false)
            }
          }}
          onRules={() => setRulesOpen(true)}
          onTutorial={() => setTutorialOpen(true)}
        />
      ) : (
        <main className={`syh-table ${waiting ? 'is-locked' : ''}`}>
          <p className="syh-instruction">{instructionFor(state)}</p>
          {beginnerMode && beginnerHelp(state) ? (
            <p className="syh-beginner-help">
              <b>Beginner tip</b>
              <span>{beginnerHelp(state)}</span>
            </p>
          ) : null}
          {state.testMode ? (
            <p className="syh-count-line">
              Cards in play: {countInPlay(state)} / 70 · Draw {state.drawPile.length} · Discard{' '}
              {state.discardPile.length}
            </p>
          ) : null}

          <div className="syh-board" data-player-count={state.players.length}>
          {attackSpotlight ? (
            <div className="syh-attack-spotlight" role="status" aria-live="polite">
              <span>{attackSpotlight.actor} plays</span>
              <img
                src={state.catalog[attackSpotlight.cardId]?.art}
                alt={attackSpotlight.label}
              />
              <strong>{attackSpotlight.label}</strong>
            </div>
          ) : null}
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
              <div className={`syh-pile syh-draw-pile ${openingShuffle ? 'is-shuffling' : ''}`}>
                <CardView faceDown />
                <span>Draw · {state.drawPile.length}</span>
              </div>
              <div className={`syh-pile ${canTakeDiscard ? 'is-takeable' : ''}`}>
                <CardView
                  card={topDiscard}
                  faceDown={!topDiscard}
                  label={canTakeDiscard ? 'Drag the numbered discard down toward your hand' : undefined}
                  gestureEnabled={Boolean(canTakeDiscard)}
                  onSwipe={(direction) => {
                    if (canTakeDiscard && direction === 'down') {
                      dispatch({ type: 'TAKE_DISCARD', playerId: 'human' })
                    }
                  }}
                />
                <span>Discard · {state.discardPile.length}</span>
              </div>
            </div>
            <div className="syh-status">
              <span className="syh-clockwise">↻ Clockwise</span>
              <span>Turn: <b>{nameOf(state, currentPlayer(state).id)}</b></span>
              {beginnerMode ? (
                <span className="syh-beginner-chip">BEGINNER · NO CLOCK</span>
              ) : (
                <span className={`syh-turn-timer ${turnSeconds <= 15 ? 'is-low' : ''}`}>
                  ⏱ {formatTurnTime(turnSeconds)}
                </span>
              )}
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

          {state.phase.type === 'claim_dropped' && state.phase.claimantId === 'human' ? (
            <section className="syh-chooser syh-claim-chooser">
              <div className="syh-claim-cards">
                {state.phase.cardIds.map((id) => {
                  const card = state.catalog[id]
                  const selected = claimedDropIds.includes(id)
                  return (
                    <CardView
                      key={id}
                      card={card}
                      compact
                      selected={selected}
                      onClick={() =>
                        setClaimedDropIds((current) =>
                          current.includes(id)
                            ? current.filter((item) => item !== id)
                            : [...current, id],
                        )
                      }
                    />
                  )
                })}
              </div>
              <div className="syh-shuffle-bar">
                <button
                  type="button"
                  className="syh-primary"
                  onClick={() =>
                    dispatch({
                      type: 'CLAIM_DROPPED',
                      playerId: 'human',
                      cardIds: claimedDropIds,
                    })
                  }
                >
                  {claimedDropIds.length ? `Claim ${claimedDropIds.length}` : 'Take none'}
                </button>
              </div>
            </section>
          ) : null}

          {state.phase.type === 'trim_hand' && state.phase.playerId === 'human' ? (
            <section className="syh-chooser syh-trim-chooser">
              <div className="syh-claim-cards">
                {handCards(state, 'human').map((card) => {
                  const selected = trimIds.includes(card.id)
                  const excess = playerById(state, 'human').hand.length - 5
                  return (
                    <CardView
                      key={card.id}
                      card={card}
                      compact
                      selected={selected}
                      onClick={() =>
                        setTrimIds((current) => {
                          if (current.includes(card.id)) {
                            return current.filter((id) => id !== card.id)
                          }
                          if (current.length >= excess) return current
                          return [...current, card.id]
                        })
                      }
                    />
                  )
                })}
              </div>
              <div className="syh-shuffle-bar">
                <button
                  type="button"
                  className="syh-primary"
                  disabled={trimIds.length !== playerById(state, 'human').hand.length - 5}
                  onClick={() =>
                    dispatch({
                      type: 'TRIM_HAND',
                      playerId: 'human',
                      cardIds: trimIds,
                    })
                  }
                >
                  Discard extras
                </button>
              </div>
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
                  gestureEnabled={humanTurn && state.phase.type === 'choose_action'}
                  label={
                    humanTurn && state.phase.type === 'choose_action'
                      ? 'Drag this card with your finger and swipe up to play it'
                      : undefined
                  }
                  onSwipe={(direction) => {
                    if (humanTurn && state.phase.type === 'choose_action' && direction === 'up') {
                      dispatch({ type: 'SELECT_CARD', playerId: 'human', cardId: card.id })
                    }
                  }}
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

      <Tutorial open={tutorialOpen} onClose={() => setTutorialOpen(false)} />
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
