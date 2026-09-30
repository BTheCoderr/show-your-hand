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
import {
  clearInviteFromLocation,
  createRoom,
  getRoom,
  inviteCodeFromLocation,
  joinRoom,
  leaveRoom,
  loadOnlineSession,
  onlineConfigured,
  requestRematch,
  saveOnlineSession,
  setRoomReady,
  startRoom,
  submitRoomAction,
  type OnlineRoom,
  type OnlineSession,
} from './online/rooms'
import type { Action, Color, GameState } from './game/types'
import { COLORS } from './game/types'
import { CardView } from './ui/CardView'
import { FirstVisitPrompt } from './ui/FirstVisitPrompt'
import { OnlineLobby } from './ui/OnlineLobby'
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

function beginnerHelp(state: GameState, viewerId: string): string | null {
  const phase = state.phase
  switch (phase.type) {
    case 'choose_action':
      if (currentPlayer(state).id !== viewerId) {
        return currentPlayer(state).isHuman
          ? 'Watch the glowing seat and the move banner. Your opponent is deciding what to do.'
          : 'Watch the glowing seat and the move banner. The computer will make one visible move at a time.'
      }
      return canDeclare(state, viewerId)
        ? 'You have a scoring hand. You can Declare now, or keep playing if you want to improve it.'
        : 'Swipe one card upward. Number cards and Blank are discarded; attack cards will guide you to a target.'
    case 'choose_targets': {
      const card = state.catalog[phase.cardId]
      if (card.kind === 'shuffle') return 'Tap one or two opponents, then press Confirm Shuffle.'
      if (card.kind === 'drop-color') return 'Choose a color first, then tap the opponent you want to attack.'
      return 'Tap the opponent whose hand you want revealed.'
    }
    case 'await_defense':
      if (phase.responderId !== viewerId) return 'The targeted player is deciding whether to defend.'
      return 'Accept the attack, use Blank to cancel it, or use a matching special to counter when available.'
    case 'claim_dropped':
      return phase.claimantId === viewerId
        ? 'Tap any dropped cards you want to keep. You may take none, some, or all of them.'
        : 'The attacker may claim cards that were forced out by Drop Color.'
    case 'trim_hand':
      return phase.playerId === viewerId
        ? 'You claimed extra cards. Choose enough cards to discard until your hand is back to five.'
        : 'The computer is trimming its hand back to five cards.'
    case 'choose_reverse_color':
      return phase.reverserId === viewerId
        ? 'Your matching Drop Color reversed the attack. Pick the color the original attacker must drop.'
        : 'A Drop Color counter reversed the attack.'
    case 'await_reverse_blank':
      return phase.attack.attackerId === viewerId
        ? 'You can spend a Blank to cancel the reversed Drop Color, or accept it.'
        : 'The original attacker gets one chance to Blank the reversal.'
    case 'may_declare':
      return phase.playerId === viewerId
        ? 'Your hand scores. Declare it to end the round and collect the points, or pass.'
        : `${nameOf(state, phase.playerId)} has a scoring hand and may declare.`
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
  const restoredOnlineSession = useMemo(() => loadOnlineSession(), [])
  const initialInviteCode = useMemo(() => inviteCodeFromLocation(), [])
  const [inviteCode, setInviteCode] = useState<string | null>(initialInviteCode)
  const [menuCount, setMenuCount] = useState<1 | 2 | 3 | 4 | 5>(2)
  const [menuTest, setMenuTest] = useState(false)
  const [showStart, setShowStart] = useState(
    () => Boolean(restoredOnlineSession) || !saved || saved.phase.type === 'menu',
  )
  const [state, setState] = useState<GameState>(() =>
    restoredOnlineSession ? emptyMenuState() : saved ?? emptyMenuState(),
  )
  const [rulesOpen, setRulesOpen] = useState(false)
  const [tutorialOpen, setTutorialOpen] = useState(false)
  const [tutorialPromptSeen, setTutorialPromptSeen] = useState(initialPreferences.tutorialPromptSeen)
  const [firstVisitOpen, setFirstVisitOpen] = useState(!initialPreferences.tutorialPromptSeen)
  const [beginnerMode, setBeginnerMode] = useState(initialPreferences.beginnerMode)
  const [onlineSession, setOnlineSession] = useState<OnlineSession | null>(restoredOnlineSession)
  const [onlineRoom, setOnlineRoom] = useState<OnlineRoom | null>(null)
  const [onlineLobbyOpen, setOnlineLobbyOpen] = useState(
    Boolean(restoredOnlineSession || initialInviteCode),
  )
  const [onlineBusy, setOnlineBusy] = useState(false)
  const [onlineError, setOnlineError] = useState<string | null>(null)
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
  const aiAttackTimer = useRef<number | null>(null)
  const rematchAutoStart = useRef<number | null>(null)

  const localPlayerId = onlineSession?.gamePlayerId ?? 'human'
  const onlineInGame = Boolean(onlineSession && onlineRoom?.status === 'in_game')

  const updateOnlineSession = (session: OnlineSession | null) => {
    setOnlineSession(session)
    saveOnlineSession(session)
  }

  const syncOnlineRoom = (room: OnlineRoom, session: OnlineSession) => {
    setOnlineRoom(room)
    const nextSession =
      room.stateVersion === session.stateVersion
        ? session
        : { ...session, stateVersion: room.stateVersion }
    if (nextSession !== session) updateOnlineSession(nextSession)

    if (room.gameState) {
      setState(room.gameState)
      setShowStart(false)
      if (room.status === 'in_game' || room.status === 'completed') {
        setOnlineLobbyOpen(false)
      }
    }

    if (room.status === 'waiting') setOnlineLobbyOpen(true)
  }

  const refreshOnlineRoom = async (session = onlineSession) => {
    if (!session) return
    const room = await getRoom(session)
    syncOnlineRoom(room, session)
  }

  const commitAction = async (source: GameState, action: Action) => {
    if (onlineSession && onlineRoom?.status === 'in_game') {
      try {
        const result = await submitRoomAction(onlineSession, action)
        const nextSession = { ...onlineSession, stateVersion: result.stateVersion }
        updateOnlineSession(nextSession)
        setOnlineRoom((room) =>
          room
            ? {
                ...room,
                gameState: result.gameState,
                stateVersion: result.stateVersion,
                status: result.status,
              }
            : room,
        )
        setState(result.gameState)
        setOnlineError(null)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        setOnlineError(
          message === 'STALE_STATE'
            ? 'The table changed. Syncing the latest move…'
            : message === 'NOT_YOUR_TURN'
              ? 'That move is not yours to make. Syncing the table…'
              : message,
        )
        await refreshOnlineRoom(onlineSession)
        throw error
      }
    } else {
      const next = apply(source, action)
      saveMatch(next)
      setState(next)
    }

    setShuffleTargets([])
    setClaimedDropIds([])
    setTrimIds([])
  }

  const dispatch = (action: Action) => {
    if (lock.current) return
    const presentation = attackPresentationFor(state, action)
    lock.current = true

    const run = async () => {
      try {
        await commitAction(state, action)
      } catch {
        // Online errors are surfaced in the lobby/status UI and the latest room is reloaded.
      } finally {
        setAttackSpotlight(null)
        window.setTimeout(() => {
          lock.current = false
        }, 180)
      }
    }

    if (presentation) {
      setAttackSpotlight(presentation)
      if (attackTimer.current) window.clearTimeout(attackTimer.current)
      attackTimer.current = window.setTimeout(() => {
        void run()
      }, beginnerMode ? 900 : 650)
      return
    }

    void run()
  }

  const updateBeginnerMode = (value: boolean) => {
    setBeginnerMode(value)
    savePreferences({ tutorialPromptSeen, beginnerMode: value })
  }

  const openTutorial = () => {
    if (attackTimer.current) window.clearTimeout(attackTimer.current)
    if (aiAttackTimer.current) window.clearTimeout(aiAttackTimer.current)
    setAttackSpotlight(null)
    lock.current = false
    setTutorialOpen(true)
  }

  const dismissFirstVisit = (shouldOpenTutorial: boolean) => {
    setFirstVisitOpen(false)
    setTutorialPromptSeen(true)
    savePreferences({ tutorialPromptSeen: true, beginnerMode })
    if (shouldOpenTutorial) openTutorial()
  }

  const createOnlineRoom = async (name: string) => {
    setOnlineBusy(true)
    setOnlineError(null)
    try {
      const session = await createRoom(name)
      updateOnlineSession(session)
      const room = await getRoom(session)
      setOnlineRoom(room)
      setOnlineLobbyOpen(true)
    } catch (error) {
      setOnlineError(error instanceof Error ? error.message : String(error))
    } finally {
      setOnlineBusy(false)
    }
  }

  const joinOnlineRoom = async (code: string, name: string) => {
    setOnlineBusy(true)
    setOnlineError(null)
    try {
      const session = await joinRoom(code, name)
      updateOnlineSession(session)
      const room = await getRoom(session)
      setOnlineRoom(room)
      setInviteCode(null)
      clearInviteFromLocation()
      setOnlineLobbyOpen(true)
    } catch (error) {
      setOnlineError(error instanceof Error ? error.message : String(error))
    } finally {
      setOnlineBusy(false)
    }
  }

  const startOnlineMatch = async () => {
    if (!onlineSession || !onlineRoom || !onlineSession.isHost) return
    if (
      onlineRoom.players.length !== 2 ||
      !onlineRoom.players.every((player) => player.ready)
    ) {
      return
    }

    setOnlineBusy(true)
    setOnlineError(null)
    setOpeningShuffle(true)
    try {
      const result = await startRoom(onlineSession)
      const nextSession = { ...onlineSession, stateVersion: result.stateVersion }
      updateOnlineSession(nextSession)
      setOnlineRoom({
        ...onlineRoom,
        status: result.status,
        gameState: result.gameState,
        stateVersion: result.stateVersion,
        players: onlineRoom.players.map((player) => ({ ...player, ready: false })),
      })
      setState(result.gameState)
      setShowStart(false)
      setOnlineLobbyOpen(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setOnlineError(message)
      if (message === 'STALE_STATE') await refreshOnlineRoom(onlineSession)
    } finally {
      setOpeningShuffle(false)
      setOnlineBusy(false)
    }
  }

  const setOnlineReady = async (ready: boolean) => {
    if (!onlineSession) return
    setOnlineBusy(true)
    setOnlineError(null)
    try {
      await setRoomReady(onlineSession, ready)
      await refreshOnlineRoom(onlineSession)
    } catch (error) {
      setOnlineError(error instanceof Error ? error.message : String(error))
    } finally {
      setOnlineBusy(false)
    }
  }

  const toggleOnlineRematch = async () => {
    if (!onlineSession || !onlineRoom || onlineRoom.status !== 'completed') return
    const current = onlineRoom.players.find(
      (player) => player.gamePlayerId === onlineSession.gamePlayerId,
    )
    setOnlineBusy(true)
    setOnlineError(null)
    try {
      await requestRematch(onlineSession, !current?.rematchReady)
      await refreshOnlineRoom(onlineSession)
    } catch (error) {
      setOnlineError(error instanceof Error ? error.message : String(error))
    } finally {
      setOnlineBusy(false)
    }
  }

  const leaveOnlineMatch = async () => {
    const session = onlineSession
    setOnlineBusy(true)
    setOnlineError(null)
    try {
      if (session) await leaveRoom(session)
    } catch (error) {
      setOnlineError(error instanceof Error ? error.message : String(error))
    } finally {
      updateOnlineSession(null)
      setOnlineRoom(null)
      setInviteCode(null)
      clearInviteFromLocation()
      setOnlineLobbyOpen(false)
      clearMatch()
      setState(emptyMenuState(menuTest))
      setShowStart(true)
      setOnlineBusy(false)
    }
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
      Boolean(onlineSession) ||
      !activeActorId ||
      activeActorId === localPlayerId ||
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
          if (aiAttackTimer.current) window.clearTimeout(aiAttackTimer.current)
          aiAttackTimer.current = window.setTimeout(resolveMove, beginnerMode ? 900 : 650)
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

    return () => {
      window.clearTimeout(timer)
      if (aiAttackTimer.current) window.clearTimeout(aiAttackTimer.current)
    }
  }, [activeActorId, beginnerMode, localPlayerId, onlineSession, openingShuffle, showStart, state, tutorialOpen])

  useEffect(() => {
    if (!onlineSession) return

    let cancelled = false
    const tick = async () => {
      try {
        const room = await getRoom(onlineSession)
        if (cancelled) return
        setOnlineError(null)
        syncOnlineRoom(room, onlineSession)
      } catch (error) {
        if (cancelled) return
        setOnlineError(error instanceof Error ? error.message : String(error))
      }
    }

    void tick()
    const timer = window.setInterval(() => {
      void tick()
    }, 1200)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [onlineSession?.roomId, onlineSession?.playerToken, onlineSession?.stateVersion])

  useEffect(() => {
    if (
      !onlineSession?.isHost ||
      !onlineRoom ||
      onlineRoom.status !== 'waiting' ||
      onlineRoom.rematchSequence <= 0 ||
      onlineBusy ||
      onlineRoom.players.length !== 2 ||
      !onlineRoom.players.every((player) => player.ready)
    ) {
      return
    }

    if (rematchAutoStart.current === onlineRoom.rematchSequence) return
    rematchAutoStart.current = onlineRoom.rematchSequence
    void startOnlineMatch()
  }, [
    onlineBusy,
    onlineRoom?.players,
    onlineRoom?.rematchSequence,
    onlineRoom?.status,
    onlineSession?.isHost,
  ])

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
    actorId(state) === localPlayerId &&
    (state.phase.type === 'choose_action' || state.phase.type === 'choose_targets')
  const waiting = Boolean(actorId(state) && actorId(state) !== localPlayerId)
  const opponents = state.players.filter((player) => player.id !== localPlayerId)
  const topDiscardId = state.discardPile.at(-1)
  const topDiscard = topDiscardId ? state.catalog[topDiscardId] : undefined
  const canTakeDiscard =
    state.phase.type === 'choose_action' &&
    currentPlayer(state).id === localPlayerId &&
    playerById(state, localPlayerId).hand.length === 5 &&
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
          <button type="button" onClick={openTutorial}>
            Tutorial
          </button>
          <button type="button" onClick={() => setRulesOpen(true)}>
            Rules
          </button>
          <button type="button" onClick={() => setHistoryOpen((value) => !value)}>
            History
          </button>
          {onlineSession ? (
            <button type="button" className="is-online" onClick={() => setOnlineLobbyOpen(true)}>
              Room {onlineSession.roomCode}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => dispatch({ type: 'TOGGLE_TEST_MODE' })}
            >
              {state.testMode ? 'Test on' : 'Test off'}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (onlineSession) {
                void leaveOnlineMatch()
                return
              }
              clearMatch()
              setState(emptyMenuState(menuTest))
              setShowStart(true)
            }}
          >
            {onlineSession ? 'Leave online' : 'Restart'}
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
          onTutorial={openTutorial}
          onOnline={() => {
            setOnlineError(null)
            setOnlineLobbyOpen(true)
          }}
        />
      ) : (
        <main className={`syh-table ${waiting ? 'is-locked' : ''}`}>
          <p className="syh-instruction">{instructionFor(state, localPlayerId)}</p>
          {onlineInGame ? (
            <p className="syh-online-status">
              <span className="syh-online-pulse" />
              ONLINE · ROOM {onlineSession?.roomCode} · {waiting ? 'OPPONENT TURN' : 'YOUR TURN'}
            </p>
          ) : null}
          {onlineInGame && onlineError ? (
            <p className="syh-online-error syh-online-game-error" role="alert">
              {onlineError}
            </p>
          ) : null}
          {beginnerMode && beginnerHelp(state, localPlayerId) ? (
            <p className="syh-beginner-help">
              <b>Beginner tip</b>
              <span>{beginnerHelp(state, localPlayerId)}</span>
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
                const targetOpponent =
                  humanTurn && state.phase.type === 'choose_targets'
                    ? () => {
                        const selected = state.catalog[state.phase.cardId]
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
                            playerId: localPlayerId,
                            cardId: selected.id,
                            targetIds: [player.id],
                            color: dropColor,
                          })
                          return
                        }
                        dispatch({
                          type: 'CONFIRM_ATTACK',
                          playerId: localPlayerId,
                          cardId: selected.id,
                          targetIds: [player.id],
                        })
                      }
                    : undefined

                return (
                  <article
                    key={player.id}
                    className={`syh-seat ${opponentSeatClass(index, opponents.length)} ${active ? 'is-active' : ''}`}
                  >
                    <div className="syh-row">
                      {onlineSession && !reveal
                        ? player.hand.map((_, cardIndex) => (
                            <CardView
                              key={`${player.id}-hidden-${cardIndex}`}
                              faceDown
                              compact
                              onClick={targetOpponent}
                            />
                          ))
                        : handCards(state, player.id).map((card) => (
                            <CardView
                              key={card.id}
                              card={card}
                              faceDown={!reveal}
                              compact
                              onClick={targetOpponent}
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
                      dispatch({ type: 'TAKE_DISCARD', playerId: localPlayerId })
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

          {state.phase.type === 'choose_targets' && activeActorId === localPlayerId ? (
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
                        playerId: localPlayerId,
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

          {state.phase.type === 'claim_dropped' && state.phase.claimantId === localPlayerId ? (
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
                      playerId: localPlayerId,
                      cardIds: claimedDropIds,
                    })
                  }
                >
                  {claimedDropIds.length ? `Claim ${claimedDropIds.length}` : 'Take none'}
                </button>
              </div>
            </section>
          ) : null}

          {state.phase.type === 'trim_hand' && state.phase.playerId === localPlayerId ? (
            <section className="syh-chooser syh-trim-chooser">
              <div className="syh-claim-cards">
                {handCards(state, localPlayerId).map((card) => {
                  const selected = trimIds.includes(card.id)
                  const excess = playerById(state, localPlayerId).hand.length - 5
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
                  disabled={trimIds.length !== playerById(state, localPlayerId).hand.length - 5}
                  onClick={() =>
                    dispatch({
                      type: 'TRIM_HAND',
                      playerId: localPlayerId,
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
              state.players[state.currentPlayerIndex].id === localPlayerId ? 'is-active' : ''
            }`}
          >
            <header className="syh-nameplate">
              <span>You · {playerById(state, localPlayerId).score} pts</span>
              <span className="syh-you-meta">
                {scoreHand(handCards(state, localPlayerId)) ? (
                  <em>Scoring hand ready</em>
                ) : null}
                {state.players[state.currentPlayerIndex].id === localPlayerId ? (
                  <span className="syh-turn-chip">YOUR TURN</span>
                ) : null}
              </span>
            </header>
            <div className="syh-row is-you">
              {handCards(state, localPlayerId).map((card) => (
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
                      dispatch({ type: 'SELECT_CARD', playerId: localPlayerId, cardId: card.id })
                    }
                  }}
                />
              ))}
            </div>
            <div className="syh-you-actions">
              <button
                type="button"
                className="syh-primary"
                disabled={!canDeclare(state, localPlayerId)}
                data-testid="declare-hand"
                onClick={() => dispatch({ type: 'DECLARE', playerId: localPlayerId })}
              >
                Declare Hand
              </button>
              {state.phase.type === 'may_declare' && state.phase.playerId === localPlayerId ? (
                <button
                  type="button"
                  className="syh-secondary"
                  onClick={() => dispatch({ type: 'PASS_DECLARE', playerId: localPlayerId })}
                >
                  Pass
                </button>
              ) : null}
              {state.phase.type === 'review_hands' && actorId(state) === localPlayerId ? (
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

          {state.phase.type === 'await_defense' && state.phase.responderId === localPlayerId ? (
            <DefensePrompt
              title={`Defend against ${state.phase.attack.kind.replace(/-/g, ' ')}`}
              choices={validDefenseChoices(state, localPlayerId, state.phase.attack.kind)}
              onChoose={(response) =>
                dispatch({ type: 'RESPOND_DEFENSE', playerId: localPlayerId, response })
              }
            />
          ) : null}

          {state.phase.type === 'choose_reverse_color' && state.phase.reverserId === localPlayerId ? (
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
                        dispatch({ type: 'CHOOSE_REVERSE_COLOR', playerId: localPlayerId, color })
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
          state.phase.attack.attackerId === localPlayerId ? (
            <DefensePrompt
              title={`Reverse Drop Color — ${state.phase.reverseColor}`}
              choices={
                handCards(state, localPlayerId).some((card) => card.kind === 'blank')
                  ? ['accept', 'blank']
                  : ['accept']
              }
              onChoose={(response) =>
                dispatch({
                  type: 'RESPOND_REVERSE_BLANK',
                  playerId: localPlayerId,
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
              <div className="syh-modal-card syh-match-over-card">
                <p className="syh-kicker">Final score</p>
                <h2>Match over</h2>
                <p>{nameOf(state, state.phase.winnerId)} reached {state.matchPointGoal} points.</p>
                {onlineSession ? (
                  <>
                    <p className="syh-rematch-status">
                      {onlineRoom?.players.find(
                        (player) => player.gamePlayerId === onlineSession.gamePlayerId,
                      )?.rematchReady
                        ? 'Rematch requested. Waiting for your opponent…'
                        : 'Run it back with the same opponent and the same room code.'}
                    </p>
                    <div className="syh-match-over-actions">
                      <button
                        type="button"
                        className="syh-primary"
                        disabled={onlineBusy}
                        onClick={() => void toggleOnlineRematch()}
                      >
                        {onlineRoom?.players.find(
                          (player) => player.gamePlayerId === onlineSession.gamePlayerId,
                        )?.rematchReady
                          ? 'Rematch requested ✓'
                          : 'Rematch'}
                      </button>
                      <button
                        type="button"
                        className="syh-secondary"
                        disabled={onlineBusy}
                        onClick={() => void leaveOnlineMatch()}
                      >
                        Leave table
                      </button>
                    </div>
                  </>
                ) : (
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
                )}
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

      <OnlineLobby
        open={onlineLobbyOpen}
        configured={onlineConfigured}
        inviteCode={inviteCode}
        session={onlineSession}
        room={onlineRoom}
        busy={onlineBusy}
        error={onlineError}
        onClose={() => setOnlineLobbyOpen(false)}
        onCreate={(name) => {
          void createOnlineRoom(name)
        }}
        onJoin={(code, name) => {
          void joinOnlineRoom(code, name)
        }}
        onReady={(ready) => {
          void setOnlineReady(ready)
        }}
        onStart={() => {
          void startOnlineMatch()
        }}
        onLeave={() => {
          void leaveOnlineMatch()
        }}
      />

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
