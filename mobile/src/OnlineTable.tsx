import { useState } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import {
  actorId,
  canDeclare,
  instructionFor,
  validDefenseChoices,
} from '../../src/game/engine'
import { clockwiseOthers, handCards, nextOpponent, playerById } from '../../src/game/helpers'
import { scoreHand } from '../../src/game/scoring'
import type { Action, Color } from '../../src/game/types'
import { COLORS } from '../../src/game/types'
import type {
  AuthoritativeResponse,
  OnlineRoom,
  OnlineSession,
} from './onlineApi'
import { submitAction } from './onlineApi'
import { CardTile } from './CardTile'
import { GameTable, WinningHand } from './GameTable'
import { playMobileFeedback } from './feedback'
import { formatTurnSeconds, useTurnTimer } from './useTurnTimer'
import { theme } from './theme'

type Props = {
  room: OnlineRoom
  session: OnlineSession
  busy: boolean
  onBusyChange: (busy: boolean) => void
  onRoomPatch: (response: AuthoritativeResponse) => void
  onError: (message: string | null) => void
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

export function OnlineTable({
  room,
  session,
  busy,
  onBusyChange,
  onRoomPatch,
  onError,
}: Props) {
  const state = room.gameState
  const [dropColor, setDropColor] = useState<Color>('orange')
  const [claimIds, setClaimIds] = useState<string[]>([])
  const [trimIds, setTrimIds] = useState<string[]>([])
  const [targetIds, setTargetIds] = useState<string[]>([])
  const turnSeconds = useTurnTimer(state, room.beginnerMode)

  if (!state) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Waiting for the server game state…</Text>
      </View>
    )
  }

  const localId = session.gamePlayerId
  const local = playerById(state, localId)
  const localHand = handCards(state, localId)
  const active = actorId(state)
  const topDiscardId = state.discardPile.at(-1)
  const topDiscard = topDiscardId ? state.catalog[topDiscardId] : undefined
  const instruction = instructionFor(state, localId)
  const phase = state.phase
  const chooseAction = phase.type === 'choose_action' && active === localId
  const trimming = phase.type === 'trim_hand' && phase.playerId === localId
  const canTakeDiscard =
    chooseAction &&
    local.hand.length === 5 &&
    topDiscard?.kind === 'number'

  const dispatch = async (action: Action) => {
    if (busy) return
    onBusyChange(true)
    onError(null)

    try {
      await playMobileFeedback(
        action.type === 'CONFIRM_ATTACK'
          ? 'attack'
          : action.type === 'RESPOND_DEFENSE' ||
              action.type === 'RESPOND_REVERSE_BLANK'
            ? 'defense'
            : action.type === 'DECLARE'
              ? 'score'
              : 'card',
      )
      const response = await submitAction(session, room.stateVersion, action)
      setClaimIds([])
      setTrimIds([])
      setTargetIds([])
      onRoomPatch(response)
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error))
    } finally {
      onBusyChange(false)
    }
  }

  const controls = (() => {
    if (phase.type === 'choose_targets' && active === localId) {
      const card = state.catalog[phase.cardId]
      const maxTargets = card.kind === 'shuffle' ? 2 : 1
      const skipTarget = card.kind === 'skip' ? [nextOpponent(state, localId).id] : targetIds
      const validSelection = card.kind === 'skip' || (skipTarget.length >= 1 && skipTarget.length <= maxTargets)
      return (
        <View style={styles.controls}>
          <Text style={styles.controlTitle}>
            {card.kind.replaceAll('-', ' ').toUpperCase()}
          </Text>
          <Text style={styles.controlHint}>
            {card.kind === 'skip'
              ? 'Skip hits the next player clockwise.'
              : `Tap ${maxTargets === 2 ? 'one or two seats' : 'a seat'} around the table.`}
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
                playerId: localId,
                cardId: phase.cardId,
                targetIds: skipTarget,
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

    if (phase.type === 'await_defense' && phase.responderId === localId) {
      const choices = validDefenseChoices(state, localId, phase.attack.kind)
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
                  playerId: localId,
                  response: choice,
                })
              }
            />
          ))}
        </View>
      )
    }

    if (phase.type === 'claim_dropped' && phase.claimantId === localId) {
      return (
        <View style={styles.controls}>
          <Text style={styles.controlTitle}>CLAIM DROPPED CARDS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.inlineCards}>
              {phase.cardIds.map((id) => (
                <CardTile
                  key={id}
                  card={state.catalog[id]}
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
                playerId: localId,
                cardIds: claimIds,
              })
            }
          />
        </View>
      )
    }

    if (phase.type === 'trim_hand' && phase.playerId === localId) {
      const excess = local.hand.length - 5
      return (
        <View style={styles.controls}>
          <Text style={styles.controlTitle}>DISCARD {excess} EXTRA</Text>
          <Text style={styles.controlHint}>
            Pick exactly {excess} card{excess === 1 ? '' : 's'} below.
          </Text>
          <ActionButton
            label={`DISCARD ${trimIds.length}/${excess}`}
            disabled={busy || trimIds.length !== excess}
            onPress={() =>
              void dispatch({
                type: 'TRIM_HAND',
                playerId: localId,
                cardIds: trimIds,
              })
            }
          />
        </View>
      )
    }

    if (phase.type === 'choose_reverse_color' && phase.reverserId === localId) {
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
                    playerId: localId,
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
      phase.attack.attackerId === localId
    ) {
      const hasBlank = localHand.some((card) => card.kind === 'blank')
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
                  playerId: localId,
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
                playerId: localId,
                response: 'accept',
              })
            }
          />
        </View>
      )
    }

    if (phase.type === 'may_declare' && phase.playerId === localId) {
      return (
        <View style={styles.controls}>
          <Text style={styles.controlTitle}>YOU CAN DECLARE</Text>
          <ActionButton
            label="SHOW WINNING HAND"
            disabled={busy}
            onPress={() => void dispatch({ type: 'DECLARE', playerId: localId })}
          />
          <ActionButton
            label="PASS"
            secondary
            disabled={busy}
            onPress={() =>
              void dispatch({ type: 'PASS_DECLARE', playerId: localId })
            }
          />
        </View>
      )
    }

    if (phase.type === 'review_hands' && active === localId) {
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

    if (phase.type === 'round_over') return null

    return null
  })()

  const opponents = clockwiseOthers(state, localId)
  const choosingTargets = phase.type === 'choose_targets' && active === localId
  const targetCard = choosingTargets ? state.catalog[phase.cardId] : null
  const winnerId =
    phase.type === 'round_over' || phase.type === 'match_over' ? phase.winnerId : null
  const winner = winnerId ? playerById(state, winnerId) : null
  const winningCards = winnerId ? handCards(state, winnerId) : []
  const winningScore = scoreHand(winningCards)

  return (
    <GameTable
      opponents={opponents.map((player) => ({
        id: player.id,
        name: player.name,
        score: player.score,
        active: active === player.id,
        cards: handCards(state, player.id),
        hidden: !state.revealedUntilTurnEnd.includes(player.id),
        selected: targetIds.includes(player.id),
        tag: targetIds.includes(player.id)
          ? 'Selected'
          : state.revealedUntilTurnEnd.includes(player.id)
            ? 'Revealed'
            : null,
      }))}
      yourName="YOU"
      yourScore={local.score}
      yourActive={active === localId}
      yourCards={localHand}
      selectedCardIds={
        phase.type === 'choose_targets'
          ? [phase.cardId]
          : phase.type === 'claim_dropped'
            ? claimIds
            : trimIds
      }
      cardDisabled={busy || (!chooseAction && !trimming)}
      onCardPress={
        chooseAction
          ? (card) => void dispatch({ type: 'SELECT_CARD', playerId: localId, cardId: card.id })
          : trimming
            ? (card) => setTrimIds((current) => {
                const excess = local.hand.length - 5
                if (current.includes(card.id)) return current.filter((id) => id !== card.id)
                if (current.length >= excess) return current
                return [...current, card.id]
              })
            : undefined
      }
      onOpponentPress={
        choosingTargets && targetCard && targetCard.kind !== 'skip'
          ? (id) => {
              const maxTargets = targetCard.kind === 'shuffle' ? 2 : 1
              setTargetIds((current) => {
                if (current.includes(id)) return current.filter((target) => target !== id)
                if (current.length >= maxTargets) return maxTargets === 1 ? [id] : current
                return [...current, id]
              })
            }
          : undefined
      }
      onCardSwipeUp={
        chooseAction && !busy
          ? (card) => void dispatch({ type: 'SELECT_CARD', playerId: localId, cardId: card.id })
          : undefined
      }
      drawCount={state.drawPile.length}
      discardCard={topDiscard}
      discardCount={state.discardPile.length}
      canTakeDiscard={canTakeDiscard && !busy}
      onTakeDiscard={() => void dispatch({ type: 'TAKE_DISCARD', playerId: localId })}
      turnLabel={
        active === localId
          ? 'YOUR TURN'
          : active
            ? 'OPPONENT\'S TURN'
            : phase.type === 'match_over'
              ? 'MATCH OVER'
              : 'ROUND BREAK'
      }
      clockLabel={
        turnSeconds === null
          ? 'BEGINNER'
          : formatTurnSeconds(turnSeconds)
      }
      instruction={instruction}
      controls={controls}
      winning={
        winner && winnerId ? (
          <WinningHand
            eyebrow={phase.type === 'match_over' ? 'MATCH WINNER' : 'ROUND WINNER'}
            title={`${winner.name} won ${phase.type === 'match_over' ? 'the match' : 'the round'}`}
            reason={phase.type === 'round_over' ? phase.label : winningScore?.label ?? 'Scoring five-card hand'}
            points={phase.type === 'round_over' ? phase.points : winningScore?.points}
            totalLabel={`${winner.name}: ${winner.score} / ${state.matchPointGoal} match points`}
            cards={winningCards}
            actionLabel="DEAL NEXT ROUND"
            disabled={busy || phase.type !== 'round_over'}
            onAction={() => void dispatch({ type: 'NEXT_ROUND' })}
          />
        ) : null
      }
    />
  )
}

const styles = StyleSheet.create({
  empty: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: theme.muted,
  },
  page: {
    padding: 16,
    paddingBottom: 36,
    gap: 16,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreRight: {
    alignItems: 'flex-end',
  },
  scoreLabel: {
    color: theme.muted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    maxWidth: 110,
  },
  score: {
    color: theme.text,
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 38,
  },
  turnCenter: {
    alignItems: 'center',
    gap: 4,
  },
  turnBadge: {
    backgroundColor: theme.panel,
    borderColor: theme.line,
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  turnBadgeText: {
    color: theme.orange,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  turnTimer: {
    color: theme.text,
    fontSize: 12,
    fontWeight: '900',
  },
  turnTimerExpired: {
    color: theme.danger,
  },
  beginnerBadge: {
    color: theme.muted,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },
  opponentArea: {
    alignItems: 'center',
    gap: 8,
  },
  opponentHand: {
    flexDirection: 'row',
    gap: 4,
  },
  sectionLabel: {
    color: theme.muted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
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
  gestureHint: {
    color: theme.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 6,
  },
  timerHint: {
    color: theme.danger,
    fontSize: 10,
    marginTop: 5,
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
  buttonDisabled: {
    opacity: 0.35,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    color: theme.text,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  colors: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
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
  historyLine: {
    color: theme.muted,
    fontSize: 11,
    lineHeight: 17,
  },
})
