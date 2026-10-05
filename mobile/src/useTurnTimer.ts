import { useEffect, useState } from 'react'
import type { GameState } from '../../src/game/types'

export const TURN_SECONDS = 120

export function formatTurnSeconds(total: number): string {
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function useTurnTimer(
  state: GameState,
  beginnerMode: boolean,
): number | null {
  const [seconds, setSeconds] = useState(TURN_SECONDS)
  const phaseKey = `${state.currentPlayerIndex}:${state.phase.type}`

  useEffect(() => {
    setSeconds(TURN_SECONDS)
  }, [phaseKey])

  useEffect(() => {
    if (beginnerMode) return
    if (
      state.phase.type === 'round_over' ||
      state.phase.type === 'match_over' ||
      state.phase.type === 'menu'
    ) {
      return
    }

    const timer = setInterval(() => {
      setSeconds((current) => Math.max(0, current - 1))
    }, 1000)

    return () => clearInterval(timer)
  }, [beginnerMode, phaseKey, state.phase.type])

  return beginnerMode ? null : seconds
}
