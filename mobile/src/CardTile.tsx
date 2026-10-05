import { useMemo } from 'react'
import {
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import type { Card } from '../../src/game/types'
import { sourceForArt } from './cardAssets'
import { theme } from './theme'

type Props = {
  card?: Card
  hidden?: boolean
  selected?: boolean
  disabled?: boolean
  onPress?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  compact?: boolean
}

export function CardTile({
  card,
  hidden = false,
  selected = false,
  disabled = false,
  onPress,
  onSwipeUp,
  onSwipeDown,
  compact = false,
}: Props) {
  const art = hidden ? '/cards/back.png' : card?.art ?? '/cards/back.png'
  const label = hidden
    ? 'Hidden card'
    : card?.kind === 'number'
      ? `${card.color} ${card.number}`
      : card?.kind.replaceAll('-', ' ') ?? 'Card'

  const actionable = Boolean(onPress || onSwipeUp || onSwipeDown)

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => {
          if (disabled || (!onSwipeUp && !onSwipeDown)) return false
          return (
            Math.abs(gesture.dy) > 10 &&
            Math.abs(gesture.dy) > Math.abs(gesture.dx) * 1.2
          )
        },
        onPanResponderRelease: (_, gesture) => {
          if (disabled) return
          if (gesture.dy <= -34) onSwipeUp?.()
          if (gesture.dy >= 34) onSwipeDown?.()
        },
        onPanResponderTerminationRequest: () => true,
      }),
    [disabled, onSwipeDown, onSwipeUp],
  )

  return (
    <View {...panResponder.panHandlers}>
      <Pressable
        accessibilityRole={actionable ? 'button' : undefined}
        accessibilityLabel={label}
        accessibilityHint={
          onSwipeUp || onSwipeDown
            ? [
                onSwipeUp ? 'Swipe up to play.' : '',
                onSwipeDown ? 'Swipe down for the alternate action.' : '',
              ]
                .filter(Boolean)
                .join(' ')
            : undefined
        }
        disabled={disabled || !actionable}
        onPress={onPress}
        style={({ pressed }) => [
          styles.wrap,
          compact && styles.compact,
          selected && styles.selected,
          pressed && !disabled && styles.pressed,
          disabled && actionable && styles.disabled,
        ]}
      >
        <Image
          source={sourceForArt(art)}
          style={styles.image}
          resizeMode="contain"
        />
        {!hidden && !compact ? (
          <View style={styles.caption}>
            <Text style={styles.captionText} numberOfLines={1}>
              {label.toUpperCase()}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    width: 104,
    height: 150,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: '#101010',
    overflow: 'hidden',
  },
  compact: {
    width: 62,
    height: 90,
    borderRadius: 10,
  },
  selected: {
    borderColor: theme.orange,
    borderWidth: 3,
    transform: [{ translateY: -8 }],
  },
  pressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.6,
  },
  image: {
    flex: 1,
    width: '100%',
    backgroundColor: '#0e0e0e',
  },
  caption: {
    minHeight: 24,
    justifyContent: 'center',
    paddingHorizontal: 5,
    backgroundColor: '#111',
  },
  captionText: {
    color: theme.muted,
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
  },
})
