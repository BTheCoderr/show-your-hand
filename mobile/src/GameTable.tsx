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
import { opponentSeatPosition } from '../../src/ui/tableSeats'
import { casinoTableDimensions } from '../../src/ui/casinoTableGeometry'
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

/** A centered opponent fan, anchored to the same ellipse on every screen. */
function seatStyle(
  index: number,
  opponentCount: number,
  fanWidth: number,
  cardHeight: number,
): ViewStyle {
  const point = opponentSeatPosition(index, opponentCount)
  return {
    position: 'absolute',
    zIndex: 3,
    width: fanWidth,
    alignItems: 'center',
    left: `${(point.x * 100).toFixed(3)}%`,
    top: `${(point.y * 100).toFixed(3)}%`,
    transform: [
      { translateX: -Math.round(fanWidth / 2) },
      { translateY: -Math.round(cardHeight / 2) },
    ],
  }
}

function frames(width: number, opponentCount: number) {
  const tablet = width >= 768
  const headsUp = opponentCount <= 1
  const fullTable = opponentCount >= 5
  const crowded = opponentCount >= 4
  // With five opponents, the top-center seats are less than 80px apart on
  // a 390px iPhone. Five ~100px-wide card fans collide even if the centers
  // follow a perfect oval. Compact the *opponent* cards, never your own hand.
  const opponent: Frame = tablet
    ? headsUp
      ? { width: 74, height: 104 }
      : fullTable
        ? { width: 42, height: 60 }
        : crowded
          ? { width: 48, height: 68 }
          : { width: 58, height: 82 }
    : headsUp
      ? { width: 44, height: 62 }
      : fullTable
        ? { width: 20, height: 28 }
        : crowded
          ? { width: 25, height: 35 }
          : { width: 30, height: 42 }
  const overlap = Math.round(opponent.width * (headsUp ? 0.18 : fullTable ? 0.4 : 0.36))
  const you: Frame = tablet ? { width: 108, height: 152 } : { width: 74, height: 106 }
  const pile: Frame = tablet ? { width: 82, height: 116 } : { width: 42, height: 60 }
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
  // The table is a piece of casino furniture, never a flex-filling portrait pill.
  // 1.25:1 on phones and 1.5:1 on iPad preserves its horizontal curved rail.
  const { width: tableWidth, height: tableHeight, railRadius } = casinoTableDimensions(width)
  const trimRadius = Math.max(railRadius - (size.tablet ? 15 : 11), 20)
  const feltRadius = Math.max(trimRadius - 7, 18)

  return (
    <View style={styles.fill}>
      <ScrollView
        style={styles.tableViewport}
        contentContainerStyle={styles.tableViewportContent}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        <View
          style={[styles.tableShell, { width: tableWidth, height: tableHeight, borderRadius: railRadius }]}
        >
          <View style={[styles.paddedRail, { borderRadius: railRadius }]}>
            <View style={[styles.brassTrim, { borderRadius: trimRadius }]}>
              <View style={[styles.felt, { borderRadius: feltRadius }]}>
                <View pointerEvents="none" style={[styles.innerLine, { borderRadius: feltRadius }]} />
                <View pointerEvents="none" style={[styles.feltInset, { borderRadius: feltRadius }]} />
                <Text pointerEvents="none" style={[styles.mark, size.tablet && styles.markTablet]}>
                  SHOW YOUR HAND
                </Text>

        {opponents.map((opponent, index) => {
          const displayedCards = opponent.cards.length
          const fanWidth = Math.max(
            size.tablet ? 94 : opponents.length >= 5 ? 72 : opponents.length >= 4 ? 86 : 94,
            size.opponent.width +
              Math.max(0, displayedCards - 1) * (size.opponent.width - size.overlap),
          )
          return (
            <Pressable
              key={opponent.id}
              accessibilityRole={onOpponentPress ? 'button' : 'text'}
              accessibilityLabel={`${opponent.name}, ${opponent.score} points${opponent.active ? ', their turn' : ''}`}
              disabled={!onOpponentPress}
              onPress={() => onOpponentPress?.(opponent.id)}
              style={seatStyle(index, opponents.length, fanWidth, size.opponent.height)}
            >
              <OpponentFan
                cards={opponent.cards}
                hidden={opponent.hidden}
                frame={size.opponent}
                overlap={size.overlap}
              />
              <View style={[
                styles.nameplate,
                !size.tablet && opponents.length >= 5 && styles.nameplateCompact,
                opponent.active && styles.nameplateActive,
                opponent.selected && styles.nameplateSelected,
              ]}>
                <Text style={[styles.seatName, !size.tablet && opponents.length >= 5 && styles.seatTextCompact]} numberOfLines={1}>{opponent.name}</Text>
                <Text style={[styles.seatScore, !size.tablet && opponents.length >= 5 && styles.seatTextCompact]}>{opponent.score}</Text>
                {opponent.active && (size.tablet || opponents.length < 5) ? <Text style={styles.turnChip}>TURN</Text> : null}
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
              </View>
            </View>
          </View>
        </View>
        <View style={[styles.you, { maxWidth: tableWidth }]}>
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

      </ScrollView>

        {controls ? (
          <View style={[styles.controls, size.tablet && styles.controlsTablet]}>
            <ScrollView
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.controlsInner}
            >
              {controls}
            </ScrollView>
          </View>
        ) : null}

        {winning}
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
  fill: { flex: 1, minHeight: 0, backgroundColor: '#090909' },
  tableViewport: { flex: 1, width: '100%' },
  tableViewportContent: {
    paddingTop: 10,
    paddingBottom: 10,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  // Layers approximate a real upholstered poker/blackjack table rail.
  tableShell: {
    backgroundColor: '#050806',
    shadowColor: '#000',
    shadowOpacity: 0.68,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 14,
  },
  paddedRail: {
    flex: 1,
    borderWidth: 11,
    borderColor: '#221a15',
    backgroundColor: '#15110c',
    overflow: 'hidden',
  },
  brassTrim: {
    flex: 1,
    borderWidth: 3,
    borderColor: '#bb9956',
    backgroundColor: '#091d13',
    overflow: 'hidden',
  },
  felt: {
    flex: 1,
    backgroundColor: '#155235',
    borderWidth: 5,
    borderColor: '#0d301f',
    overflow: 'hidden',
  },
  innerLine: {
    position: 'absolute',
    top: 4,
    right: 4,
    bottom: 4,
    left: 4,
    borderWidth: 1,
    borderColor: 'rgba(242,207,127,0.35)',
  },
  feltInset: {
    position: 'absolute',
    top: '16%',
    right: '11%',
    bottom: '12%',
    left: '11%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    backgroundColor: 'rgba(8,43,25,0.13)',
  },
  mark: {
    position: 'absolute',
    top: '31%',
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
  nameplateCompact: {
    maxWidth: 72,
    gap: 4,
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  seatTextCompact: {
    fontSize: 9,
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
    // Keep central draw/discard and status *inside* a short horizontal felt.
    top: '47%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  centerTablet: { top: '51%' },
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
    width: '100%',
    zIndex: 5,
    alignItems: 'center',
    gap: 8,
    marginTop: -19,
    paddingBottom: 6,
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
    width: '96%',
    maxHeight: 170,
    alignSelf: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(243, 111, 33, 0.56)',
    backgroundColor: 'rgba(13, 15, 12, 0.97)',
    marginBottom: 3,
  },
  controlsTablet: { width: '72%', maxHeight: 230 },
  controlsInner: { padding: 12, gap: 8 },
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
