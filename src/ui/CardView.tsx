import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Card } from '../game/types'

export type SwipeDirection = 'up' | 'down' | 'left' | 'right'

type Props = {
  card?: Card
  faceDown?: boolean
  selected?: boolean
  disabled?: boolean
  compact?: boolean
  label?: string
  onClick?: () => void
  gestureEnabled?: boolean
  onSwipe?: (direction: SwipeDirection) => void
}

const SWIPE_THRESHOLD = 46

export function CardView({
  card,
  faceDown = false,
  selected = false,
  disabled = false,
  compact = false,
  label,
  onClick,
  gestureEnabled = false,
  onSwipe,
}: Props) {
  const src = faceDown || !card ? '/cards/back.png' : card.art
  const alt =
    faceDown || !card
      ? 'Card back'
      : card.kind === 'number'
        ? `${card.color} ${card.number}`
        : card.kind
  const start = useRef<{ x: number; y: number } | null>(null)
  const suppressClick = useRef(false)
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false })

  const beginDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!gestureEnabled || disabled) return
    start.current = { x: event.clientX, y: event.clientY }
    suppressClick.current = false
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({ x: 0, y: 0, active: true })
  }

  const moveDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!start.current || !drag.active) return
    const x = event.clientX - start.current.x
    const y = event.clientY - start.current.y
    if (Math.hypot(x, y) > 8) suppressClick.current = true
    setDrag({ x, y, active: true })
  }

  const finishDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!start.current || !drag.active) return
    const x = event.clientX - start.current.x
    const y = event.clientY - start.current.y
    start.current = null
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
    } catch {
      // Pointer capture may already be released by the browser.
    }

    if (Math.max(Math.abs(x), Math.abs(y)) >= SWIPE_THRESHOLD && onSwipe) {
      const direction: SwipeDirection =
        Math.abs(y) >= Math.abs(x)
          ? y < 0
            ? 'up'
            : 'down'
          : x < 0
            ? 'left'
            : 'right'
      suppressClick.current = true
      onSwipe(direction)
    }
    setDrag({ x: 0, y: 0, active: false })
  }

  const cancelDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    start.current = null
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
    } catch {
      // Pointer capture may already be released by the browser.
    }
    setDrag({ x: 0, y: 0, active: false })
  }

  const rotation = Math.max(-8, Math.min(8, drag.x * 0.04))

  return (
    <button
      type="button"
      className={`syh-card ${compact ? 'is-compact' : ''} ${selected ? 'is-selected' : ''} ${gestureEnabled ? 'is-draggable' : ''} ${drag.active ? 'is-dragging' : ''}`}
      onClick={() => {
        if (suppressClick.current) {
          suppressClick.current = false
          return
        }
        onClick?.()
      }}
      onPointerDown={beginDrag}
      onPointerMove={moveDrag}
      onPointerUp={finishDrag}
      onPointerCancel={cancelDrag}
      disabled={disabled || (!onClick && !gestureEnabled)}
      aria-label={label ?? alt}
      style={
        drag.active
          ? {
              transform: `translate3d(${drag.x}px, ${drag.y}px, 0) rotate(${rotation}deg) scale(1.06)`,
              zIndex: 30,
              transition: 'none',
            }
          : undefined
      }
    >
      <img src={src} alt={alt} draggable={false} />
    </button>
  )
}
