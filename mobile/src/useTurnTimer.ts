import { useEffect, useRef, useState } from 'react'
import { newHistoryEvents, startsAnotherTurn } from '../../src/turnClock'
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
  const previous = useRef<{
    history: string[]
    currentPlayerIndex: number
    roundStarterIndex: number
  } | null>(null)

  const running = Boolean(
    state &&
      !beginnerMode &&
      !['round_over', 'match_over', 'menu'].includes(state.phase.type),
  )

  useEffect(() => {
    if (!state) {
      previous.current = null
      setSeconds(TURN_SECONDS)
      return
    }

    const last = previous.current
    const events = last ? newHistoryEvents(last.history, state.history) : []
    // CPU players may act in one reducer update, returning to the same active
    // player. A player index alone cannot identify a new turn.
    if (
      last &&
      (last.currentPlayerIndex !== state.currentPlayerIndex ||
        last.roundStarterIndex !== state.roundStarterIndex ||
        events.some(startsAnotherTurn))
    ) {
      setSeconds(TURN_SECONDS)
    }

    previous.current = {
      history: state.history,
      currentPlayerIndex: state.currentPlayerIndex,
      roundStarterIndex: state.roundStarterIndex,
    }
  }, [state])

  useEffect(() => {
    if (!running) return

    // Polling returns a fresh object every ~1.2s. Restarting this interval on
    // each object used to keep interrupting the player's clock.
    const timer = setInterval(() => {
      setSeconds((current) => Math.max(0, current - 1))
    }, 1000)

    return () => clearInterval(timer)
  }, [running])

  return beginnerMode ? null : seconds
}
