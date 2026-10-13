import { useEffect, useState } from 'react'
import type { GameState } from '../../src/game/types'

export const TURN_SECONDS = 120

export function formatTurnSeconds(total: number): string {
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function useTurnTimer(
  state: GameState | null,
  beginnerMode: boolean,
): number | null {
  const [seconds, setSeconds] = useState(TURN_SECONDS)
  const phaseKey = state
    ? `${state.roundStarterIndex}:${state.currentPlayerIndex}:${state.phase.type}`
    : 'waiting'
  const running = Boolean(
    state &&
      !beginnerMode &&
      !['round_over', 'match_over', 'menu'].includes(state.phase.type),
  )

  useEffect(() => {
    setSeconds(TURN_SECONDS)
  }, [phaseKey])

  useEffect(() => {
    if (!running) return

    // Polling returns a fresh object every ~1.2s. Restarting this interval on
    // each object used to keep interrupting the player's clock.
    const timer = setInterval(() => {
      setSeconds((current) => Math.max(0, current - 1))
    }, 1000)

    return () => clearInterval(timer)
  }, [running, phaseKey])

  return beginnerMode ? null : seconds
}
