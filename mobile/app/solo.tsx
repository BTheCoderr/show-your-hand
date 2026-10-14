import { useEffect, useMemo, useState } from 'react'
import { useLocalSearchParams } from 'expo-router'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { advanceComputers } from '../../src/game/ai'
import {
  actorId,
  canDeclare,
  emptyMenuState,
  instructionFor,
  reduce,
  validDefenseChoices,
} from '../../src/game/engine'
import { handCards, playerById } from '../../src/game/helpers'
import { scoreHand } from '../../src/game/scoring'
import type { Action, Color, GameState, OpponentCount } from '../../src/game/types'
import { COLORS } from '../../src/game/types'
import { CardTile } from '../src/CardTile'
import { GameTable, WinningHand } from '../src/GameTable'
import { playMobileFeedback } from '../src/feedback'
import {
  EMPTY_MOBILE_STATS,
  loadMobileStats,
  saveMobileStats,
  statsAfterAction,
  type MobileStats,
} from '../src/mobileStats'
import {
  formatTurnSeconds,
  useTurnTimer,
} from '../src/useTurnTimer'
import { clearSoloSave, loadSoloSave, saveSoloSave } from '../src/soloPersist'
import { theme } from '../src/theme'

function parseOpponentCount(raw: string | string[] | undefined): OpponentCount {
  const value = Number(Array.isArray(raw) ? raw[0] : raw)
  return value >= 1 && value <= 6 ? (value as OpponentCount) : 1
}

function freshMatch(opponentCount: OpponentCount): GameState {
  return advanceComputers(
    reduce(emptyMenuState(false), {
      type: 'START_MATCH',
      opponentCount,
      testMode: false,
    }),
  )
}

function ActionButton({
  label,
  onPress,
  secondary = false,
  disabled = false,
}: {
  label: string
  onPress: () => void
  secondary?: boolean
  disabled?: boolean
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.buttonSecondary,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
      ]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  )
}

export default function SoloScreen() {
  const params = useLocalSearchParams<{
    opponents?: string
    beginner?: string
    resume?: string
  }>()
  const wantsResume = params.resume === '1'
  const initialOpponentCount = parseOpponentCount(params.opponents)
  const initialBeginnerMode = params.beginner !== '0'

  const [opponentCount, setOpponentCount] = useState<OpponentCount>(
    initialOpponentCount,
  )
  const [beginnerMode, setBeginnerMode] = useState(initialBeginnerMode)
  const [restoring, setRestoring] = useState(wantsResume)
  const [game, setGame] = useState<GameState>(() =>
    freshMatch(initialOpponentCount),
  )
  const [dropColor, setDropColor] = useState<Color>('orange')
  const [claimIds, setClaimIds] = useState<string[]>([])
  const [trimIds, setTrimIds] = useState<string[]>([])
  const [targetIds, setTargetIds] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [stats, setStats] = useState<MobileStats>(EMPTY_MOBILE_STATS)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    void loadMobileStats().then(setStats)
  }, [])

  useEffect(() => {
    let cancelled = false

    const restore = async () => {
      try {
        if (!wantsResume) {
          await clearSoloSave()
          return
        }

        const saved = await loadSoloSave()
        if (!cancelled && saved && saved.game.phase.type !== 'match_over') {
          setOpponentCount(saved.opponentCount)
          setBeginnerMode(saved.beginnerMode)
          setGame(saved.game)
        } else if (!cancelled) {
          setSaveError('Saved match unavailable. A new table has been started.')
        }
      } catch {
        if (!cancelled) {
          setSaveError('Storage could not be read. This match may not resume after closing the app.')
        }
      } finally {
        // A storage error must never trap the player on the loading screen.
        if (!cancelled) setRestoring(false)
      }
    }

    void restore()
    return () => {
      cancelled = true
    }
  }, [wantsResume])

  useEffect(() => {
    if (restoring) return
    let cancelled = false
    const task =
      game.phase.type === 'match_over'
        ? clearSoloSave()
        : saveSoloSave({
            game,
            opponentCount,
            beginnerMode,
            updatedAt: new Date().toISOString(),
          })

    void task.then(
      () => {
        if (!cancelled) setSaveError(null)
      },
      () => {
        if (!cancelled) {
          setSaveError('This match could not be saved. Check device storage before closing the app.')
        }
      },
    )
    return () => {
      cancelled = true
    }
  }, [game, opponentCount, beginnerMode, restoring])

  const human = playerById(game, 'human')
  const opponents = game.players.filter((player) => player.id !== 'human')
  const humanHand = handCards(game, 'human')
  const active = actorId(game)
  const activePlayer = active ? playerById(game, active) : null
  const topDiscardId = game.discardPile.at(-1)
  const topDiscard = topDiscardId ? game.catalog[topDiscardId] : undefined
  const instruction = useMemo(() => instructionFor(game, 'human'), [game])
  const turnSeconds = useTurnTimer(game, beginnerMode)

  const phase = game.phase
  const humanChooseAction = phase.type === 'choose_action' && active === 'human'
  const trimming = phase.type === 'trim_hand' && phase.playerId === 'human'
  const canTakeDiscard =
    humanChooseAction &&
    human.hand.length === 5 &&
    topDiscard?.kind === 'number'

  const dispatch = async (action: Action) => {
    if (busy) return
    setBusy(true)

    try {
      const feedbackKind =
        action.type === 'CONFIRM_ATTACK'
          ? 'attack'
          : action.type === 'RESPOND_DEFENSE' ||
              action.type === 'RESPOND_REVERSE_BLANK'
            ? 'defense'
            : action.type === 'DECLARE'
              ? 'score'
              : 'card'

      await playMobileFeedback(feedbackKind)

      const next = advanceComputers(reduce(game, action))
      const nextStats = statsAfterAction(stats, game, action, next)

      setGame(next)
      setStats(nextStats)
      void saveMobileStats(nextStats)

      setClaimIds([])
      setTrimIds([])
      setTargetIds([])
    } finally {
      setBusy(false)
    }
  }

  const toggleTarget = (playerId: string, maxTargets: number) => {
    setTargetIds((current) => {
      if (current.includes(playerId)) {
        return current.filter((id) => id !== playerId)
      }
      if (current.length >= maxTargets) {
        return maxTargets === 1 ? [playerId] : current
      }
      return [...current, playerId]
    })
  }

  const renderControls = () => {
    if (phase.type === 'choose_targets' && active === 'human') {
      const card = game.catalog[phase.cardId]
      const maxTargets = card.kind === 'shuffle' ? 2 : 1
      const validSelection =
        targetIds.length >= 1 && targetIds.length <= maxTargets

      return (
        <View style={styles.controls}>
          <Text style={styles.controlTitle}>
            {card.kind.replaceAll('-', ' ').toUpperCase()}
          </Text>
          <Text style={styles.controlHint}>
            Tap {maxTargets === 2 ? 'one or two seats' : 'a seat'} around the table.
          </Text>

          {card.kind === 'drop-color' ? (
            <View style={styles.colors}>
              {COLORS.map((color) => (
                <Pressable
                  key={color}
                  onPress={() => setDropColor(color)}
                  style={[
                    styles.colorChip,
                    dropColor === color && styles.colorChipActive,
                  ]}
                >
                  <Text style={styles.colorText}>{color.toUpperCase()}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <ActionButton
            label={
              card.kind === 'drop-color'
                ? `ATTACK · ${dropColor.toUpperCase()}`
                : card.kind === 'shuffle'
                  ? `SHUFFLE ${targetIds.length || ''}`.trim()
                  : 'ATTACK'
            }
            disabled={busy || !validSelection}
            onPress={() =>
              void dispatch({
                type: 'CONFIRM_ATTACK',
                playerId: 'human',
                cardId: phase.cardId,
                targetIds,
                ...(card.kind === 'drop-color' ? { color: dropColor } : {}),
              })
            }
          />
          <ActionButton
            label="CANCEL"
            secondary
            disabled={busy}
            onPress={() => void dispatch({ type: 'CANCEL_SELECTION' })}
          />
        </View>
      )
    }

    if (phase.type === 'await_defense' && phase.responderId === 'human') {
      const choices = validDefenseChoices(game, 'human', phase.attack.kind)
      return (
        <View style={styles.controls}>
          <Text style={styles.controlTitle}>
            DEFEND · {phase.attack.kind.replaceAll('-', ' ').toUpperCase()}
          </Text>
          {choices.map((choice) => (
            <ActionButton
              key={choice}
              label={choice === 'accept' ? 'TAKE THE HIT' : choice.toUpperCase()}
              secondary={choice === 'accept'}
              disabled={busy}
              onPress={() =>
                void dispatch({
                  type: 'RESPOND_DEFENSE',
                  playerId: 'human',
                  response: choice,
                })
              }
            />
          ))}
        </View>
      )
    }

    if (phase.type === 'claim_dropped' && phase.claimantId === 'human') {
      return (
        <View style={styles.controls}>
          <Text style={styles.controlTitle}>CLAIM DROPPED CARDS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.inlineCards}>
              {phase.cardIds.map((id) => (
                <CardTile
                  key={id}
                  card={game.catalog[id]}
                  compact
                  selected={claimIds.includes(id)}
                  onPress={() =>
                    setClaimIds((current) =>
                      current.includes(id)
                        ? current.filter((value) => value !== id)
                        : [...current, id],
                    )
                  }
                />
              ))}
            </View>
          </ScrollView>
          <ActionButton
            label={claimIds.length ? `CLAIM ${claimIds.length}` : 'TAKE NONE'}
            disabled={busy}
            onPress={() =>
              void dispatch({
                type: 'CLAIM_DROPPED',
                playerId: 'human',
                cardIds: claimIds,
              })
            }
          />
        </View>
      )
    }

    if (phase.type === 'trim_hand' && phase.playerId === 'human') {
      const excess = human.hand.length - 5
      return (
        <View style={styles.controls}>
          <Text style={styles.controlTitle}>DISCARD {excess} EXTRA</Text>
          <Text style={styles.controlHint}>
            Tap exactly {excess} card{excess === 1 ? '' : 's'} in your hand.
          </Text>
          <ActionButton
            label={`DISCARD ${trimIds.length}/${excess}`}
            disabled={busy || trimIds.length !== excess}
            onPress={() =>
              void dispatch({
                type: 'TRIM_HAND',
                playerId: 'human',
                cardIds: trimIds,
              })
            }
          />
        </View>
      )
    }

    if (phase.type === 'choose_reverse_color' && phase.reverserId === 'human') {
      return (
        <View style={styles.controls}>
          <Text style={styles.controlTitle}>REVERSE DROP COLOR</Text>
          <View style={styles.colors}>
            {COLORS.map((color) => (
              <Pressable
                key={color}
                disabled={busy}
                onPress={() =>
                  void dispatch({
                    type: 'CHOOSE_REVERSE_COLOR',
                    playerId: 'human',
                    color,
                  })
                }
                style={styles.colorChip}
              >
                <Text style={styles.colorText}>{color.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )
    }

    if (
      phase.type === 'await_reverse_blank' &&
      phase.attack.attackerId === 'human'
    ) {
      const hasBlank = humanHand.some((card) => card.kind === 'blank')
      return (
        <View style={styles.controls}>
          <Text style={styles.controlTitle}>DROP COLOR CAME BACK</Text>
          {hasBlank ? (
            <ActionButton
              label="PLAY BLANK"
              disabled={busy}
              onPress={() =>
                void dispatch({
                  type: 'RESPOND_REVERSE_BLANK',
                  playerId: 'human',
                  response: 'blank',
                })
              }
            />
          ) : null}
          <ActionButton
            label="ACCEPT REVERSE"
            secondary
            disabled={busy}
            onPress={() =>
              void dispatch({
                type: 'RESPOND_REVERSE_BLANK',
                playerId: 'human',
                response: 'accept',
              })
            }
          />
        </View>
      )
    }

    if (phase.type === 'may_declare' && phase.playerId === 'human') {
      return (
        <View style={styles.controls}>
          <Text style={styles.controlTitle}>YOU CAN DECLARE</Text>
          <ActionButton
            label="SHOW WINNING HAND"
            disabled={busy}
            onPress={() => void dispatch({ type: 'DECLARE', playerId: 'human' })}
          />
          <ActionButton
            label="PASS"
            secondary
            disabled={busy}
            onPress={() =>
              void dispatch({ type: 'PASS_DECLARE', playerId: 'human' })
            }
          />
        </View>
      )
    }

    if (phase.type === 'review_hands' && active === 'human') {
      return (
        <View style={styles.controls}>
          <Text style={styles.controlTitle}>REVIEW THE REVEALED HAND</Text>
          <ActionButton
            label="CONTINUE"
            disabled={busy}
            onPress={() => void dispatch({ type: 'CONTINUE' })}
          />
        </View>
      )
    }

    if (phase.type === 'round_over' || phase.type === 'match_over') {
      return null
    }

    return null
  }

  if (restoring) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Restoring saved table…</Text>
        </View>
      </SafeAreaView>
    )
  }

  const choosingTargets = phase.type === 'choose_targets' && active === 'human'
  const targetCard = choosingTargets ? game.catalog[phase.cardId] : null
  const selectedCardIds =
    phase.type === 'choose_targets'
      ? [phase.cardId]
      : phase.type === 'claim_dropped'
        ? claimIds
        : trimIds
  const winnerId =
    phase.type === 'round_over' || phase.type === 'match_over' ? phase.winnerId : null
  const winner = winnerId ? playerById(game, winnerId) : null
  const winningCards = winnerId ? handCards(game, winnerId) : []
  const winningScore = scoreHand(winningCards)

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.topMeta}>
        <View>
          <Text style={styles.modeLabel}>
            {beginnerMode ? 'BEGINNER MODE' : 'STANDARD'}
          </Text>
          <Text style={styles.tableLabel}>1 VS {opponentCount}</Text>
        </View>
        {turnSeconds !== null ? (
          <View style={[styles.timerBadge, turnSeconds === 0 && styles.timerExpired]}>
            <Text style={styles.timerLabel}>TURN CLOCK</Text>
            <Text style={styles.timerValue}>{formatTurnSeconds(turnSeconds)}</Text>
          </View>
        ) : null}
      </View>

      {saveError ? (
        <Text accessibilityRole="alert" style={styles.saveWarning}>{saveError}</Text>
      ) : null}

      <GameTable
        opponents={opponents.map((opponent) => ({
          id: opponent.id,
          name: opponent.name,
          score: opponent.score,
          active: active === opponent.id,
          cards: handCards(game, opponent.id),
          hidden: !game.testMode && !game.revealedUntilTurnEnd.includes(opponent.id),
          selected: targetIds.includes(opponent.id),
          tag: game.revealedUntilTurnEnd.includes(opponent.id)
            ? 'Revealed'
            : targetIds.includes(opponent.id)
              ? 'Selected'
              : null,
        }))}
        yourName="YOU"
        yourScore={human.score}
        yourActive={active === 'human'}
        yourCards={humanHand}
        selectedCardIds={selectedCardIds}
        cardDisabled={busy || (!humanChooseAction && !trimming)}
        onCardPress={
          humanChooseAction
            ? (card) => void dispatch({ type: 'SELECT_CARD', playerId: 'human', cardId: card.id })
            : trimming
              ? (card) => setTrimIds((current) => {
                  const excess = human.hand.length - 5
                  if (current.includes(card.id)) return current.filter((id) => id !== card.id)
                  if (current.length >= excess) return current
                  return [...current, card.id]
                })
              : undefined
        }
        onCardSwipeUp={
          humanChooseAction
            ? (card) => void dispatch({ type: 'SELECT_CARD', playerId: 'human', cardId: card.id })
            : undefined
        }
        onOpponentPress={
          choosingTargets && targetCard
            ? (id) => toggleTarget(id, targetCard.kind === 'shuffle' ? 2 : 1)
            : undefined
        }
        drawCount={game.drawPile.length}
        discardCard={topDiscard}
        discardCount={game.discardPile.length}
        canTakeDiscard={canTakeDiscard && !busy}
        onTakeDiscard={() => void dispatch({ type: 'TAKE_DISCARD', playerId: 'human' })}
        turnLabel={
          active === 'human'
            ? 'YOUR TURN'
            : activePlayer
              ? `${activePlayer.name.toUpperCase()}'S TURN`
              : phase.type === 'match_over'
                ? 'MATCH OVER'
                : 'ROUND BREAK'
        }
        clockLabel={
          beginnerMode
            ? 'BEGINNER'
            : turnSeconds === null
              ? null
              : formatTurnSeconds(turnSeconds)
        }
        instruction={instruction}
        controls={renderControls()}
        winning={
          winner && winnerId ? (
            <WinningHand
              eyebrow={phase.type === 'match_over' ? 'MATCH WINNER' : 'ROUND WINNER'}
              title={`${winner.name} won ${phase.type === 'match_over' ? 'the match' : 'the round'}`}
              reason={phase.type === 'round_over' ? phase.label : winningScore?.label ?? 'Scoring five-card hand'}
              points={phase.type === 'round_over' ? phase.points : winningScore?.points}
              totalLabel={`${winner.name}: ${winner.score} / ${game.matchPointGoal} match points`}
              cards={winningCards}
              actionLabel={phase.type === 'match_over' ? 'NEW MATCH' : 'DEAL NEXT ROUND'}
              disabled={busy}
              onAction={() => {
                if (phase.type === 'match_over') {
                  void playMobileFeedback(phase.winnerId === 'human' ? 'win' : 'tap')
                  setGame(freshMatch(opponentCount))
                  setClaimIds([])
                  setTrimIds([])
                  setTargetIds([])
                  return
                }
                void dispatch({ type: 'NEXT_ROUND' })
              }}
            />
          ) : null
        }
      />

      <Text style={styles.statsText}>
        {stats.wins} wins · {stats.roundsWon} rounds · best {stats.bestHandPoints} pts
        {game.history.length ? ` · ${game.history[game.history.length - 1]}` : ''}
      </Text>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: theme.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  page: { padding: 16, paddingBottom: 40, gap: 16 },
  topMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modeLabel: {
    color: theme.orange,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  tableLabel: {
    color: theme.text,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
  },
  timerBadge: {
    alignItems: 'flex-end',
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 13,
    backgroundColor: theme.panel,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  timerExpired: {
    borderColor: theme.danger,
  },
  timerLabel: {
    color: theme.muted,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },
  timerValue: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  scoreBoard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreCell: { minWidth: 70 },
  scoreCellRight: { alignItems: 'flex-end' },
  scoreLabel: {
    color: theme.muted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  score: {
    color: theme.text,
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 38,
  },
  turnBadge: {
    backgroundColor: theme.panel,
    borderColor: theme.line,
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 7,
    maxWidth: 160,
  },
  turnBadgeText: {
    color: theme.orange,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.9,
    textAlign: 'center',
  },
  sectionLabel: {
    color: theme.muted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 7,
  },
  opponentsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 2,
  },
  opponentCard: {
    width: 292,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: theme.panel,
    padding: 12,
  },
  opponentCardActive: {
    borderColor: theme.orange,
    borderWidth: 2,
  },
  opponentNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 9,
  },
  opponentName: {
    color: theme.text,
    fontWeight: '900',
    fontSize: 12,
  },
  opponentScore: {
    color: theme.orange,
    fontWeight: '900',
    fontSize: 10,
  },
  opponentHand: {
    flexDirection: 'row',
    gap: 4,
  },
  table: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 28,
    paddingVertical: 4,
  },
  instruction: {
    borderLeftWidth: 3,
    borderLeftColor: theme.orange,
    paddingLeft: 12,
    paddingVertical: 6,
  },
  instructionText: {
    color: theme.text,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
  },
  gestureHint: {
    color: theme.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 6,
  },
  timerHint: {
    color: theme.danger,
    fontSize: 11,
    marginTop: 6,
    fontWeight: '800',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  controls: {
    backgroundColor: theme.panel,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 16,
    padding: 14,
    gap: 9,
  },
  controlTitle: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '900',
  },
  controlHint: {
    color: theme.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  targetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  targetChip: {
    minWidth: 108,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: theme.panel2,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  targetChipActive: {
    borderColor: theme.orange,
    backgroundColor: '#392010',
  },
  targetChipText: {
    color: theme.text,
    fontSize: 11,
    fontWeight: '900',
  },
  targetChipTextActive: { color: '#ffb17c' },
  targetScore: {
    color: theme.muted,
    fontSize: 9,
    fontWeight: '800',
    marginTop: 3,
  },
  button: {
    minHeight: 46,
    flex: 1,
    borderRadius: 12,
    backgroundColor: theme.orange,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  buttonSecondary: {
    backgroundColor: theme.panel2,
    borderWidth: 1,
    borderColor: theme.line,
  },
  buttonDisabled: { opacity: 0.35 },
  buttonPressed: { transform: [{ scale: 0.98 }] },
  saveWarning: {
    color: theme.danger,
    backgroundColor: theme.panel,
    borderColor: theme.danger,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    lineHeight: 18,
  },
  buttonText: {
    color: theme.text,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  colorChip: {
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: theme.panel2,
  },
  colorChipActive: {
    borderColor: theme.orange,
    borderWidth: 2,
  },
  colorText: {
    color: theme.text,
    fontSize: 10,
    fontWeight: '900',
  },
  inlineCards: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 8,
  },
  winnerPanel: {
    gap: 9,
  },
  winnerEyebrow: {
    color: theme.orange,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  winnerTitle: {
    color: theme.text,
    fontSize: 24,
    fontWeight: '900',
  },
  winnerPoints: {
    color: theme.success,
    fontSize: 13,
    fontWeight: '900',
  },
  winnerCards: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 6,
  },
  handHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  handCount: {
    color: theme.orange,
    fontSize: 10,
    fontWeight: '900',
  },
  hand: {
    flexDirection: 'row',
    gap: 9,
    paddingVertical: 12,
    paddingHorizontal: 2,
  },
  statsStrip: {
    borderRadius: 14,
    backgroundColor: theme.panel,
    borderWidth: 1,
    borderColor: theme.line,
    padding: 12,
  },
  statsTitle: {
    color: theme.orange,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  statsText: {
    color: theme.muted,
    fontSize: 11,
    marginTop: 5,
  },
  historyTitle: {
    color: theme.orange,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.3,
    marginTop: 4,
  },
  historyLine: {
    color: theme.muted,
    fontSize: 11,
    lineHeight: 17,
  },
})
