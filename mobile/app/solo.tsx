import { useEffect, useMemo, useState } from 'react'
import { useLocalSearchParams } from 'expo-router'
import {
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
import type { Action, Color, GameState } from '../../src/game/types'
import { COLORS } from '../../src/game/types'
import { CardTile } from '../src/CardTile'
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
import { theme } from '../src/theme'

type OpponentCount = 1 | 2 | 3 | 4 | 5

function parseOpponentCount(raw: string | string[] | undefined): OpponentCount {
  const value = Number(Array.isArray(raw) ? raw[0] : raw)
  return value >= 1 && value <= 5 ? (value as OpponentCount) : 1
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
  }>()
  const opponentCount = parseOpponentCount(params.opponents)
  const beginnerMode = params.beginner !== '0'

  const [game, setGame] = useState<GameState>(() => freshMatch(opponentCount))
  const [dropColor, setDropColor] = useState<Color>('orange')
  const [claimIds, setClaimIds] = useState<string[]>([])
  const [trimIds, setTrimIds] = useState<string[]>([])
  const [targetIds, setTargetIds] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [stats, setStats] = useState<MobileStats>(EMPTY_MOBILE_STATS)

  useEffect(() => {
    void loadMobileStats().then(setStats)
  }, [])

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

  const winnerPanel = (
    winnerId: string,
    label: string,
    points?: number,
  ) => {
    const winner = playerById(game, winnerId)
    const cards = handCards(game, winnerId)

    return (
      <View style={styles.winnerPanel}>
        <Text style={styles.winnerEyebrow}>
          {winnerId === 'human' ? 'YOUR HAND' : `${winner.name.toUpperCase()}'S HAND`}
        </Text>
        <Text style={styles.winnerTitle}>{label}</Text>
        {typeof points === 'number' ? (
          <Text style={styles.winnerPoints}>+{points} POINTS</Text>
        ) : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.winnerCards}>
            {cards.map((card) => (
              <CardTile key={card.id} card={card} compact />
            ))}
          </View>
        </ScrollView>
      </View>
    )
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
            Choose {maxTargets === 2 ? 'one or two opponents' : 'one opponent'}.
          </Text>

          <View style={styles.targetGrid}>
            {opponents.map((opponent) => {
              const selected = targetIds.includes(opponent.id)
              return (
                <Pressable
                  key={opponent.id}
                  onPress={() => toggleTarget(opponent.id, maxTargets)}
                  style={[
                    styles.targetChip,
                    selected && styles.targetChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.targetChipText,
                      selected && styles.targetChipTextActive,
                    ]}
                  >
                    {opponent.name.toUpperCase()}
                  </Text>
                  <Text style={styles.targetScore}>
                    {opponent.score} PTS
                  </Text>
                </Pressable>
              )
            })}
          </View>

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

    if (phase.type === 'round_over') {
      return (
        <View style={styles.controls}>
          {winnerPanel(
            phase.winnerId,
            phase.label,
            phase.points,
          )}
          <ActionButton
            label="DEAL NEXT ROUND"
            disabled={busy}
            onPress={() => void dispatch({ type: 'NEXT_ROUND' })}
          />
        </View>
      )
    }

    if (phase.type === 'match_over') {
      return (
        <View style={styles.controls}>
          {winnerPanel(
            phase.winnerId,
            phase.winnerId === 'human' ? 'YOU WON THE MATCH' : 'MATCH WINNER',
          )}
          <ActionButton
            label="NEW MATCH"
            disabled={busy}
            onPress={async () => {
              await playMobileFeedback(
                phase.winnerId === 'human' ? 'win' : 'tap',
              )
              setGame(freshMatch(opponentCount))
              setClaimIds([])
              setTrimIds([])
              setTargetIds([])
            }}
          />
        </View>
      )
    }

    return null
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.topMeta}>
          <View>
            <Text style={styles.modeLabel}>
              {beginnerMode ? 'BEGINNER MODE' : 'STANDARD'}
            </Text>
            <Text style={styles.tableLabel}>
              1 VS {opponentCount}
            </Text>
          </View>

          {turnSeconds !== null ? (
            <View
              style={[
                styles.timerBadge,
                turnSeconds === 0 && styles.timerExpired,
              ]}
            >
              <Text style={styles.timerLabel}>TURN CLOCK</Text>
              <Text style={styles.timerValue}>
                {formatTurnSeconds(turnSeconds)}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.scoreBoard}>
          <View style={styles.scoreCell}>
            <Text style={styles.scoreLabel}>YOU</Text>
            <Text style={styles.score}>{human.score}</Text>
          </View>

          <View style={styles.turnBadge}>
            <Text style={styles.turnBadgeText}>
              {active === 'human'
                ? 'YOUR MOVE'
                : activePlayer
                  ? `${activePlayer.name.toUpperCase()} MOVE`
                  : phase.type === 'match_over'
                    ? 'MATCH OVER'
                    : 'ROUND BREAK'}
            </Text>
          </View>

          <View style={[styles.scoreCell, styles.scoreCellRight]}>
            <Text style={styles.scoreLabel}>FIRST TO</Text>
            <Text style={styles.score}>{game.matchPointGoal}</Text>
          </View>
        </View>

        <View>
          <Text style={styles.sectionLabel}>OPPONENTS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.opponentsRow}>
              {opponents.map((opponent) => {
                const revealed = game.revealedUntilTurnEnd.includes(opponent.id)
                return (
                  <View
                    key={opponent.id}
                    style={[
                      styles.opponentCard,
                      active === opponent.id && styles.opponentCardActive,
                    ]}
                  >
                    <View style={styles.opponentNameRow}>
                      <Text style={styles.opponentName}>{opponent.name}</Text>
                      <Text style={styles.opponentScore}>{opponent.score} PTS</Text>
                    </View>
                    <View style={styles.opponentHand}>
                      {opponent.hand.map((id) => (
                        <CardTile
                          key={id}
                          hidden={!revealed}
                          card={game.catalog[id]}
                          compact
                        />
                      ))}
                    </View>
                  </View>
                )
              })}
            </View>
          </ScrollView>
        </View>

        <View style={styles.table}>
          <View>
            <Text style={styles.sectionLabel}>DRAW · {game.drawPile.length}</Text>
            <CardTile hidden compact />
          </View>
          <View>
            <Text style={styles.sectionLabel}>
              DISCARD · {game.discardPile.length}
            </Text>
            <CardTile card={topDiscard} compact />
          </View>
        </View>

        <View style={styles.instruction}>
          <Text style={styles.instructionText}>{instruction}</Text>
          {turnSeconds === 0 ? (
            <Text style={styles.timerHint}>
              Clock expired — finish the turn when ready.
            </Text>
          ) : null}
        </View>

        {humanChooseAction ? (
          <View style={styles.quickActions}>
            <ActionButton
              label="PICK UP DISCARD"
              secondary
              disabled={busy || !canTakeDiscard}
              onPress={() =>
                void dispatch({ type: 'TAKE_DISCARD', playerId: 'human' })
              }
            />
            <ActionButton
              label="DECLARE"
              disabled={busy || !canDeclare(game, 'human')}
              onPress={() => void dispatch({ type: 'DECLARE', playerId: 'human' })}
            />
          </View>
        ) : null}

        {renderControls()}

        <View>
          <View style={styles.handHeading}>
            <Text style={styles.sectionLabel}>YOUR HAND</Text>
            <Text style={styles.handCount}>{human.hand.length} CARDS</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.hand}>
              {humanHand.map((card) => {
                const selected =
                  (phase.type === 'choose_targets' && phase.cardId === card.id) ||
                  claimIds.includes(card.id) ||
                  trimIds.includes(card.id)

                return (
                  <CardTile
                    key={card.id}
                    card={card}
                    selected={selected}
                    disabled={busy || (!humanChooseAction && !trimming)}
                    onPress={
                      humanChooseAction
                        ? () =>
                            void dispatch({
                              type: 'SELECT_CARD',
                              playerId: 'human',
                              cardId: card.id,
                            })
                        : trimming
                          ? () =>
                              setTrimIds((current) => {
                                const excess = human.hand.length - 5
                                if (current.includes(card.id)) {
                                  return current.filter((id) => id !== card.id)
                                }
                                if (current.length >= excess) return current
                                return [...current, card.id]
                              })
                          : undefined
                    }
                  />
                )
              })}
            </View>
          </ScrollView>
        </View>

        <View style={styles.statsStrip}>
          <Text style={styles.statsTitle}>DEVICE STATS</Text>
          <Text style={styles.statsText}>
            {stats.wins} wins · {stats.roundsWon} rounds · {stats.attacksPlayed} attacks · best {stats.bestHandPoints} pts
          </Text>
        </View>

        <Text style={styles.historyTitle}>LAST MOVES</Text>
        {game.history
          .slice(-6)
          .reverse()
          .map((line, index) => (
            <Text key={`${line}-${index}`} style={styles.historyLine}>
              {line}
            </Text>
          ))}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
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
