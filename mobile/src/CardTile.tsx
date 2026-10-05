import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import type { Card } from '../../src/game/types'
import { sourceForArt } from './cardAssets'
import { theme } from './theme'

type Props = {
  card?: Card
  hidden?: boolean
  selected?: boolean
  disabled?: boolean
  onPress?: () => void
  compact?: boolean
}

export function CardTile({
  card,
  hidden = false,
  selected = false,
  disabled = false,
  onPress,
  compact = false,
}: Props) {
  const art = hidden ? '/cards/back.png' : card?.art ?? '/cards/back.png'
  const label = hidden
    ? 'Hidden card'
    : card?.kind === 'number'
      ? `${card.color} ${card.number}`
      : card?.kind.replaceAll('-', ' ') ?? 'Card'

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={label}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.wrap,
        compact && styles.compact,
        selected && styles.selected,
        pressed && !disabled && styles.pressed,
        disabled && onPress && styles.disabled,
      ]}
    >
      <Image source={sourceForArt(art)} style={styles.image} resizeMode="contain" />
      {!hidden && !compact ? (
        <View style={styles.caption}>
          <Text style={styles.captionText} numberOfLines={1}>
            {label.toUpperCase()}
          </Text>
        </View>
      ) : null}
    </Pressable>
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
