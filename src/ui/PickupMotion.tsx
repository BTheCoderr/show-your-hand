import { useLayoutEffect, useRef } from 'react'

export type PickupGhost = { playerId: string; progress: number; sway: number }
export type PickupFlight = { key: number; playerId: string; fromProgress: number; sway: number }

type Point = { x: number; y: number }

function centerOf(element: Element | null | undefined): Point | null {
  if (!element) return null
  const rect = element.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) return null
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

function cardSize(pile: HTMLElement | null) {
  const card = pile?.querySelector('.syh-card')
  const rect = card?.getBoundingClientRect()
  return rect && rect.width > 0 ? { width: rect.width, height: rect.height } : { width: 56, height: 78 }
}

function pathPoint(from: Point, to: Point, progress: number, sway: number): Point {
  const t = Math.max(0, Math.min(1, progress))
  const lift = Math.sin(t * Math.PI) * 26
  return {
    x: from.x + (to.x - from.x) * t + sway * 40 * Math.sin(t * Math.PI),
    y: from.y + (to.y - from.y) * t - lift,
  }
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

export function PickupMotionLayer({
  ghost,
  flights,
  pile,
  targetFor,
  onFlightDone,
}: {
  ghost: PickupGhost | null
  flights: PickupFlight[]
  pile: HTMLElement | null
  targetFor: (playerId: string) => HTMLElement | null
  onFlightDone: (key: number) => void
}) {
  const from = centerOf(pile)
  const size = cardSize(pile)
  const ghostTarget = ghost ? centerOf(targetFor(ghost.playerId)) : null
  const ghostPoint =
    ghost && from && ghostTarget ? pathPoint(from, ghostTarget, ghost.progress, ghost.sway) : null

  return (
    <div className="syh-pickup-layer" aria-hidden="true">
      {ghostPoint && ghost ? (
        <img
          className="syh-pickup-card is-live"
          src="/cards/back.png"
          alt=""
          style={{
            width: size.width,
            height: size.height,
            transform: `translate3d(${ghostPoint.x - size.width / 2}px, ${ghostPoint.y - size.height / 2}px, 0) rotate(${ghost.sway * 8}deg) scale(${1.06 - ghost.progress * 0.3})`,
          }}
        />
      ) : null}
      {flights.map((flight) => (
        <FlyingCard
          key={flight.key}
          flight={flight}
          pile={pile}
          target={targetFor(flight.playerId)}
          onDone={() => onFlightDone(flight.key)}
        />
      ))}
    </div>
  )
}

function FlyingCard({
  flight,
  pile,
  target,
  onDone,
}: {
  flight: PickupFlight
  pile: HTMLElement | null
  target: HTMLElement | null
  onDone: () => void
}) {
  const ref = useRef<HTMLImageElement>(null)
  const done = useRef(onDone)
  done.current = onDone

  useLayoutEffect(() => {
    const element = ref.current
    const start = centerOf(pile)
    const end = centerOf(target)
    if (!element || !start || !end || typeof element.animate !== 'function') {
      done.current()
      return
    }
    const size = cardSize(pile)
    const frames = [0, 0.25, 0.5, 0.75, 1].map((step) => {
      const t = flight.fromProgress + (1 - flight.fromProgress) * step
      const point = pathPoint(start, end, t, flight.sway)
      return {
        transform: `translate3d(${point.x - size.width / 2}px, ${point.y - size.height / 2}px, 0) rotate(${flight.sway * 8 * (1 - step)}deg) scale(${1.06 - t * 0.3})`,
        opacity: step === 1 ? 0.15 : 1,
      }
    })
    element.style.width = `${size.width}px`
    element.style.height = `${size.height}px`
    const animation = element.animate(frames, {
      duration: prefersReducedMotion() ? 1 : 520,
      easing: 'cubic-bezier(.3,.7,.3,1)',
      fill: 'forwards',
    })
    animation.onfinish = () => done.current()
    return () => animation.cancel()
  }, [flight, pile, target])

  return <img ref={ref} className="syh-pickup-card" src="/cards/back.png" alt="" />
}
