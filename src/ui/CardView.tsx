import type { Card } from '../game/types'

type Props = {
  card?: Card
  faceDown?: boolean
  selected?: boolean
  disabled?: boolean
  compact?: boolean
  label?: string
  onClick?: () => void
}

export function CardView({
  card,
  faceDown = false,
  selected = false,
  disabled = false,
  compact = false,
  label,
  onClick,
}: Props) {
  const src = faceDown || !card ? '/cards/back.png' : card.art
  const alt = faceDown || !card ? 'Card back' : card.kind === 'number' ? `${card.color} ${card.number}` : card.kind
  return (
    <button
      type="button"
      className={`syh-card ${compact ? 'is-compact' : ''} ${selected ? 'is-selected' : ''}`}
      onClick={onClick}
      disabled={disabled || !onClick}
      aria-label={label ?? alt}
    >
      <img src={src} alt={alt} draggable={false} />
    </button>
  )
}
