import { useMemo, useState } from 'react'
import * as Haptics from 'expo-haptics'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
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
import { theme } from '../src/theme'

function freshMatch(): GameState {
  return advanceComputers(
    reduce(emptyMenuState(false), {
      type: 'START_MATCH',
      opponentCount: 1,
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
  const [game, setGame] = useState<GameState>(() => freshMatch())
  const [dropColor, setDropColor] = useState<Color>('orange')
  const [trimIds, setTrimIds] = useState<string[]>([])

  const human = playerById(game, 'human')
  const cpu = playerById(game, 'cpu-1')
  const humanHand = handCards(game, 'human')
  const active = actorId(game)
  const topDiscardId = game.discardPile.at(-1)
  const topDiscard = topDiscardId ? game.catalog[topDiscardId] : undefined
  const instruction = useMemo(() => instructionFor(game, 'human'), [game])

  const dispatch = async (action: Action) => {
    await Haptics.selectionAsync()
    setGame((current) => advanceComputers(reduce(current, action)))
    setTrimIds([])
  }

  const phase = game.phase
  const humanChooseAction = phase.type === 'choose_action' && active === 'human'
  const canTakeDiscard =
    humanChooseAction &&
    human.hand.length === 5 &&
    topDiscard?.kind === 'number'

  const renderControls = () => {
    if (phase.type === 'choose_targets' && active === 'human') {
      const card = game.catalog[phase.cardId]
      return (
        <View style={styles.controls}>
          <Text style={styles.controlTitle}>
            {card.kind.replaceAll('-', ' ').toUpperCase()}
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
                ? `ATTACK CPU · ${dropColor.toUpperCase()}`
                : 'ATTACK CPU'
            }
            onPress={() =>
              void dispatch({
                type: 'CONFIRM_ATTACK',
                playerId: 'human',
                cardId: phase.cardId,
                targetIds: ['cpu-1'],
                ...(card.kind === 'drop-color' ? { color: dropColor } : {}),
              })
            }
          />
          <ActionButton
            label="CANCEL"
            secondary
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
          <ActionButton
            label={`CLAIM ALL ${phase.cardIds.length}`}
            onPress={() =>
              void dispatch({
                type: 'CLAIM_DROPPED',
                playerId: 'human',
                cardIds: phase.cardIds,
              })
            }
          />
          <ActionButton
            label="CLAIM NONE"
            secondary
            onPress={() =>
              void dispatch({
                type: 'CLAIM_DROPPED',
                playerId: 'human',
                cardIds: [],
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
            disabled={trimIds.length !== excess}
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
            onPress={() => void dispatch({ type: 'DECLARE', playerId: 'human' })}
          />
          <ActionButton
            label="PASS"
            secondary
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
            onPress={() => void dispatch({ type: 'CONTINUE' })}
          />
        </View>
      )
    }

    if (phase.type === 'round_over') {
      return (
        <View style={styles.controls}>
          <Text style={styles.controlTitle}>
            {phase.winnerId === 'human' ? 'YOU WON THE ROUND' : 'CPU WON THE ROUND'}
          </Text>
          <Text style={styles.controlHint}>
            +{phase.points} · {phase.label}
          </Text>
          <ActionButton
            label="DEAL NEXT ROUND"
            onPress={() => void dispatch({ type: 'NEXT_ROUND' })}
          />
        </View>
      )
    }

    if (phase.type === 'match_over') {
      return (
        <View style={styles.controls}>
          <Text style={styles.controlTitle}>
            {phase.winnerId === 'human' ? 'YOU WON THE MATCH' : 'CPU WON THE MATCH'}
          </Text>
          <ActionButton
            label="NEW MATCH"
            onPress={async () => {
              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              )
              setGame(freshMatch())
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
        <View style={styles.scoreRow}>
          <View>
            <Text style={styles.scoreLabel}>YOU</Text>
            <Text style={styles.score}>{human.score}</Text>
          </View>
          <View style={styles.turnBadge}>
            <Text style={styles.turnBadgeText}>
              {active === 'human' ? 'YOUR MOVE' : active ? 'CPU MOVE' : 'ROUND BREAK'}
            </Text>
          </View>
          <View style={styles.scoreRight}>
            <Text style={styles.scoreLabel}>CPU</Text>
            <Text style={styles.score}>{cpu.score}</Text>
          </View>
        </View>

        <View style={styles.opponentArea}>
          <Text style={styles.sectionLabel}>CPU HAND · {cpu.hand.length}</Text>
          <View style={styles.opponentHand}>
            {cpu.hand.map((id) => (
              <CardTile
                key={id}
                hidden={!game.revealedUntilTurnEnd.includes('cpu-1')}
                card={game.catalog[id]}
                compact
              />
            ))}
          </View>
        </View>

        <View style={styles.table}>
          <View>
            <Text style={styles.sectionLabel}>DRAW · {game.drawPile.length}</Text>
            <CardTile hidden compact />
          </View>
          <View>
            <Text style={styles.sectionLabel}>DISCARD · {game.discardPile.length}</Text>
            <CardTile card={topDiscard} compact />
          </View>
        </View>

        <View style={styles.instruction}>
          <Text style={styles.instructionText}>{instruction}</Text>
        </View>

        {humanChooseAction ? (
          <View style={styles.quickActions}>
            <ActionButton
              label="PICK UP DISCARD"
              secondary
              disabled={!canTakeDiscard}
              onPress={() =>
                void dispatch({ type: 'TAKE_DISCARD', playerId: 'human' })
              }
            />
            <ActionButton
              label="DECLARE"
              disabled={!canDeclare(game, 'human')}
              onPress={() => void dispatch({ type: 'DECLARE', playerId: 'human' })}
            />
          </View>
        ) : null}

        {renderControls()}

        <View>
          <Text style={styles.sectionLabel}>YOUR HAND</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.hand}>
              {humanHand.map((card) => {
                const trimming =
                  phase.type === 'trim_hand' && phase.playerId === 'human'
                const selected =
                  (phase.type === 'choose_targets' && phase.cardId === card.id) ||
                  trimIds.includes(card.id)

                return (
                  <CardTile
                    key={card.id}
                    card={card}
                    selected={selected}
                    disabled={!humanChooseAction && !trimming}
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
                              setTrimIds((current) =>
                                current.includes(card.id)
                                  ? current.filter((id) => id !== card.id)
                                  : [...current, card.id],
                              )
                          : undefined
                    }
                  />
                )
              })}
            </View>
          </ScrollView>
        </View>

        <Text style={styles.historyTitle}>LAST MOVES</Text>
        {game.history
          .slice(-5)
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
  page: { padding: 16, paddingBottom: 36, gap: 16 },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreRight: { alignItems: 'flex-end' },
  scoreLabel: {
    color: theme.muted,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  score: { color: theme.text, fontSize: 36, fontWeight: '900', lineHeight: 40 },
  turnBadge: {
    backgroundColor: theme.panel,
    borderColor: theme.line,
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  turnBadgeText: {
    color: theme.orange,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  opponentArea: { alignItems: 'center', gap: 8 },
  opponentHand: { flexDirection: 'row', gap: 4 },
  sectionLabel: {
    color: theme.muted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginBottom: 7,
  },
  table: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 28,
    paddingVertical: 6,
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
  quickActions: { flexDirection: 'row', gap: 8 },
  controls: {
    backgroundColor: theme.panel,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 16,
    padding: 14,
    gap: 9,
  },
  controlTitle: { color: theme.text, fontSize: 16, fontWeight: '900' },
  controlHint: { color: theme.muted, fontSize: 12 },
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
  colorChipActive: { borderColor: theme.orange, borderWidth: 2 },
  colorText: { color: theme.text, fontSize: 10, fontWeight: '900' },
  hand: {
    flexDirection: 'row',
    gap: 9,
    paddingVertical: 12,
    paddingHorizontal: 2,
  },
  historyTitle: {
    color: theme.orange,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.3,
    marginTop: 4,
  },
  historyLine: { color: theme.muted, fontSize: 11, lineHeight: 17 },
})
