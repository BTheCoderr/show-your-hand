import { useMemo, type ReactNode } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native'
import type { Card } from '../../src/game/types'
import { opponentSeat, type TableSeat } from '../../src/ui/tableSeats'
import { CardTile } from './CardTile'
import { theme } from './theme'

export type TableOpponent = {
  id: string
  name: string
  score: number
  active: boolean
  cards: Card[]
  hidden: boolean
  selected?: boolean
  tag?: string | null
}

type Frame = { width: number; height: number }

type Props = {
  opponents: TableOpponent[]
  yourName: string
  yourScore: number
  yourActive: boolean
  yourCards: Card[]
  selectedCardIds: string[]
  cardDisabled?: boolean
  onCardPress?: (card: Card) => void
  onCardSwipeUp?: (card: Card) => void
  onOpponentPress?: (id: string) => void
  drawCount: number
  discardCard?: Card
  discardCount: number
  canTakeDiscard?: boolean
  onTakeDiscard?: () => void
  turnLabel: string
  clockLabel?: string | null
  instruction?: string
  controls?: ReactNode
  winning?: ReactNode
}

const FAN = [-7, -3.5, 0, 3.5, 7]
const FAN_DROP = [8, 3, 0, 3, 8]

function seatStyle(place: TableSeat, tablet: boolean): ViewStyle {
  const shared: ViewStyle = { position: 'absolute', zIndex: 3, alignItems: 'center' }
  if (place === 'top') {
    return { ...shared, top: tablet ? '4%' : '2%', left: 0, right: 0 }
  }
  if (place === 'top-left') {
    return {
      ...shared,
      top: tablet ? '6%' : '2%',
      left: tablet ? '8%' : 4,
      transform: [{ rotate: '-4deg' }],
    }
  }
  if (place === 'top-right') {
    return {
      ...shared,
      top: tablet ? '6%' : '2%',
      right: tablet ? '8%' : 4,
      transform: [{ rotate: '4deg' }],
    }
  }
  if (place === 'left') {
    return {
      ...shared,
      top: tablet ? '24%' : '22%',
      left: tablet ? 16 : 4,
      transform: [{ rotate: '-4deg' }],
    }
  }
  return {
    ...shared,
    top: tablet ? '24%' : '22%',
    right: tablet ? 16 : 4,
    transform: [{ rotate: '4deg' }],
  }
}

function frames(width: number, opponentCount: number) {
  const tablet = width >= 768
  const headsUp = opponentCount <= 1
  const crowded = opponentCount >= 4
  const opponent: Frame = tablet
    ? headsUp
      ? { width: 74, height: 104 }
      : crowded
        ? { width: 48, height: 68 }
        : { width: 58, height: 82 }
    : headsUp
      ? { width: 44, height: 62 }
      : crowded
        ? { width: 30, height: 42 }
        : { width: 36, height: 50 }
  const overlap = Math.round(opponent.width * (headsUp ? 0.18 : 0.36))
  const you: Frame = tablet ? { width: 108, height: 152 } : { width: 74, height: 106 }
  const pile: Frame = tablet ? { width: 82, height: 116 } : { width: 54, height: 76 }
  return { tablet, opponent, overlap, you, pile }
}

function OpponentFan({
  cards,
  hidden,
  frame,
  overlap,
}: {
  cards: Card[]
  hidden: boolean
  frame: Frame
  overlap: number
}) {
  return (
    <View style={styles.fan}>
      {cards.map((card, index) => (
        <View key={card.id} style={index === 0 ? undefined : { marginLeft: -overlap }}>
          <CardTile card={card} hidden={hidden || card.art === '/cards/back.png'} frame={frame} />
        </View>
      ))}
    </View>
  )
}

export function GameTable({
  opponents,
  yourName,
  yourScore,
  yourActive,
  yourCards,
  selectedCardIds,
  cardDisabled = false,
  onCardPress,
  onCardSwipeUp,
  onOpponentPress,
  drawCount,
  discardCard,
  discardCount,
  canTakeDiscard = false,
  onTakeDiscard,
  turnLabel,
  clockLabel,
  instruction,
  controls,
  winning,
}: Props) {
  const { width } = useWindowDimensions()
  const size = useMemo(
    () => frames(width, opponents.length),
    [opponents.length, width],
  )
  const radius = Math.round(width * (size.tablet ? 0.16 : 0.12))

  return (
    <View style={styles.fill}>
      <View
        style={[
          styles.felt,
          {
            borderRadius: radius,
            borderWidth: size.tablet ? 14 : 7,
          },
        ]}
      >
        <View pointerEvents="none" style={[styles.ring, { borderRadius: radius - 12 }]} />
        <Text pointerEvents="none" style={[styles.mark, size.tablet && styles.markTablet]}>
          SHOW YOUR HAND
        </Text>

        {opponents.map((opponent, index) => {
          const place = opponentSeat(index, opponents.length)
          return (
            <Pressable
              key={opponent.id}
              accessibilityRole={onOpponentPress ? 'button' : 'text'}
              accessibilityLabel={`${opponent.name}, ${opponent.score} points${opponent.active ? ', their turn' : ''}`}
              disabled={!onOpponentPress}
              onPress={() => onOpponentPress?.(opponent.id)}
              style={seatStyle(place, size.tablet)}
            >
              <OpponentFan
                cards={opponent.cards}
                hidden={opponent.hidden}
                frame={size.opponent}
                overlap={size.overlap}
              />
              <View style={[styles.nameplate, opponent.active && styles.nameplateActive, opponent.selected && styles.nameplateSelected]}>
                <Text style={styles.seatName} numberOfLines={1}>{opponent.name}</Text>
                <Text style={styles.seatScore}>{opponent.score}</Text>
                {opponent.active ? <Text style={styles.turnChip}>TURN</Text> : null}
              </View>
              {opponent.tag ? <Text style={styles.tag}>{opponent.tag}</Text> : null}
            </Pressable>
          )
        })}

        <View style={[styles.center, size.tablet && styles.centerTablet]} pointerEvents="box-none">
          <View style={styles.piles}>
            <View style={styles.pile}>
              <CardTile hidden frame={size.pile} />
              <Text style={styles.pileLabel}>DRAW · {drawCount}</Text>
            </View>
            <View style={styles.pile}>
              <CardTile
                card={discardCard}
                hidden={!discardCard}
                frame={size.pile}
                disabled={!canTakeDiscard}
                onSwipeDown={canTakeDiscard ? onTakeDiscard : undefined}
                onPress={canTakeDiscard ? onTakeDiscard : undefined}
              />
              <Text style={styles.pileLabel}>DISCARD · {discardCount}</Text>
            </View>
          </View>
          <View style={styles.status}>
            <Text style={styles.clockwise}>↻ CLOCKWISE</Text>
            <Text style={styles.turnText} numberOfLines={1}>{turnLabel}</Text>
            {clockLabel ? <Text style={styles.clock}>{clockLabel}</Text> : null}
          </View>
        </View>

        <View style={styles.you}>
          <View style={[styles.nameplate, yourActive && styles.nameplateActive]}>
            <Text style={styles.seatName}>{yourName}</Text>
            <Text style={styles.seatScore}>{yourScore}</Text>
            {yourActive ? <Text style={styles.turnChip}>TURN</Text> : null}
          </View>
          <View style={styles.fan}>
            {yourCards.map((card, index) => {
              const count = yourCards.length
              const fanIndex = count === 5 ? index : Math.round((index / Math.max(count - 1, 1)) * 4)
              const selected = selectedCardIds.includes(card.id)
              return (
                <View
                  key={card.id}
                  style={{
                    marginLeft: index === 0 ? 0 : -(size.tablet ? 26 : 20),
                    transform: [
                      { rotate: `${FAN[fanIndex] ?? 0}deg` },
                      { translateY: (FAN_DROP[fanIndex] ?? 0) + (selected ? -12 : 0) },
                    ],
                  }}
                >
                  <CardTile
                    card={card}
                    frame={size.you}
                    selected={selected}
                    disabled={cardDisabled || (!onCardPress && !onCardSwipeUp)}
                    onPress={onCardPress ? () => onCardPress(card) : undefined}
                    onSwipeUp={onCardSwipeUp ? () => onCardSwipeUp(card) : undefined}
                  />
                </View>
              )
            })}
          </View>
          {instruction ? (
            <Text style={styles.instruction} numberOfLines={2}>{instruction}</Text>
          ) : null}
        </View>

        {controls ? (
          <View style={[styles.controls, size.tablet && styles.controlsTablet]}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.controlsInner}
            >
              {controls}
            </ScrollView>
          </View>
        ) : null}

        {winning}
      </View>
    </View>
  )
}

export function WinningHand({
  eyebrow,
  title,
  reason,
  points,
  totalLabel,
  cards,
  actionLabel,
  onAction,
  disabled = false,
}: {
  eyebrow: string
  title: string
  reason: string
  points?: number
  totalLabel: string
  cards: Card[]
  actionLabel: string
  onAction: () => void
  disabled?: boolean
}) {
  const { width } = useWindowDimensions()
  const tablet = width >= 768
  const frame = tablet ? { width: 92, height: 130 } : { width: 58, height: 82 }

  return (
    <View style={styles.winScrim}>
      <View style={[styles.winCard, tablet && styles.winCardTablet]}>
        <Text style={styles.winEyebrow}>{eyebrow}</Text>
        <Text style={styles.winTitle}>{title}</Text>
        <View style={styles.fan}>
          {cards.map((card, index) => (
            <View
              key={card.id}
              style={{
                marginLeft: index === 0 ? 0 : tablet ? 8 : 4,
                transform: [
                  { rotate: `${(FAN[index] ?? 0) / 2}deg` },
                  { translateY: (FAN_DROP[index] ?? 0) / 2 },
                ],
              }}
            >
              <CardTile card={card} frame={frame} />
            </View>
          ))}
        </View>
        <Text style={styles.winReasonLabel}>WHY THIS HAND WON</Text>
        <Text style={styles.winReason}>{reason}</Text>
        {typeof points === 'number' ? (
          <Text style={styles.winPoints}>+{points} {points === 1 ? 'POINT' : 'POINTS'}</Text>
        ) : null}
        <Text style={styles.winTotal}>{totalLabel}</Text>
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={onAction}
          style={[styles.winButton, disabled && styles.winButtonDisabled]}
        >
          <Text style={styles.winButtonText}>{actionLabel}</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1, minHeight: 520 },
  felt: {
    flex: 1,
    marginHorizontal: 2,
    marginBottom: 2,
    borderColor: '#17140f',
    backgroundColor: '#114429',
    overflow: 'hidden',
  },
  ring: {
    position: 'absolute',
    top: 7,
    right: 7,
    bottom: 7,
    left: 7,
    borderWidth: 2,
    borderColor: 'rgba(224, 190, 119, 0.28)',
  },
  mark: {
    position: 'absolute',
    top: '28%',
    left: 12,
    right: 12,
    textAlign: 'center',
    color: 'rgba(245, 236, 216, 0.16)',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
  },
  markTablet: { top: '30%', fontSize: 28, letterSpacing: 4 },
  fan: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  nameplate: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 168,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(9, 10, 9, 0.92)',
  },
  nameplateActive: {
    borderColor: theme.orange,
  },
  nameplateSelected: {
    backgroundColor: '#3a2414',
  },
  seatName: {
    color: theme.text,
    fontSize: 11,
    fontWeight: '900',
    flexShrink: 1,
  },
  seatScore: {
    color: theme.orange,
    fontSize: 11,
    fontWeight: '900',
  },
  turnChip: {
    overflow: 'hidden',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: theme.orange,
    color: '#111',
    fontSize: 8,
    fontWeight: '900',
  },
  tag: {
    marginTop: 3,
    color: '#fff4e8',
    fontSize: 9,
    fontWeight: '800',
  },
  center: {
    position: 'absolute',
    top: '48%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  centerTablet: { top: '44%' },
  piles: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  pile: { alignItems: 'center', gap: 4 },
  pileLabel: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  status: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '92%',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(4, 20, 11, 0.72)',
  },
  clockwise: { color: theme.orange, fontSize: 9, fontWeight: '900' },
  turnText: { color: theme.text, fontSize: 10, fontWeight: '800', flexShrink: 1 },
  clock: { color: theme.text, fontSize: 10, fontWeight: '900' },
  you: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 16,
    zIndex: 4,
    alignItems: 'center',
    gap: 12,
  },
  instruction: {
    marginTop: 4,
    marginHorizontal: 16,
    color: '#efe9df',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  controls: {
    position: 'absolute',
    zIndex: 6,
    left: 16,
    right: 16,
    bottom: '31%',
    maxHeight: 150,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(243, 111, 33, 0.7)',
    backgroundColor: 'rgba(8, 9, 8, 0.94)',
  },
  controlsTablet: { left: '18%', right: '18%', bottom: '24%', maxHeight: 210 },
  controlsInner: { padding: 10, gap: 8 },
  winScrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.72)',
    padding: 16,
  },
  winCard: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(243, 111, 33, 0.45)',
    backgroundColor: '#121212',
  },
  winCardTablet: { maxWidth: 640, padding: 28 },
  winEyebrow: {
    color: theme.orange,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  winTitle: {
    color: theme.text,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
  },
  winReasonLabel: {
    marginTop: 10,
    color: theme.muted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  winReason: {
    color: '#fff4e8',
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  winPoints: {
    color: theme.orange,
    fontSize: 36,
    fontWeight: '900',
    marginTop: 2,
  },
  winTotal: { color: theme.muted, fontSize: 13, fontWeight: '700', marginBottom: 10 },
  winButton: {
    minHeight: 44,
    minWidth: 180,
    borderRadius: 999,
    backgroundColor: theme.orange,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  winButtonDisabled: { opacity: 0.5 },
  winButtonText: { color: '#111', fontSize: 13, fontWeight: '900' },
})
