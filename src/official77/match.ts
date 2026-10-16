import type { Evaluation77 } from './scoring'

export const MATCH_POINT_GOAL_77 = 5

export type MatchResolution77 =
  | { status: 'not-scoring'; newTotal: number; matchWon: false }
  | { status: 'pending-one-point-rule'; newTotal: number; matchWon: false }
  | {
      status: 'scored'
      pointsAwarded: 2 | 3 | 4 | 5
      newTotal: number
      matchWon: boolean
      winReason: 'purple-instant' | 'five-accumulated-points' | null
    }

/**
 * Approved October 16, 2026 match-win conditions:
 *   (A) any scoring player/team reaches five accumulated ordinary points;
 *   (B) the five ACTUAL Purple 1–5 cards win immediately.
 *
 * Purple cannot contribute toward regular points. This resolver assumes the
 * upstream evaluator enforces that strict physical-card restriction.
 *
 * Pass the score of the player or team being awarded this hand. A future team
 * game passes its TEAM score; team scoring itself is not yet implemented.
 */
export function resolveMatch77(
  hand: Evaluation77,
  previousTotal: number,
): MatchResolution77 {
  if (!Number.isSafeInteger(previousTotal) || previousTotal < 0) {
    throw new Error('Match score must be a nonnegative integer')
  }
  if (hand.status === 'pending-one-point-rule') {
    return { status: 'pending-one-point-rule', newTotal: previousTotal, matchWon: false }
  }
  if (hand.status === 'no-score') {
    return { status: 'not-scoring', newTotal: previousTotal, matchWon: false }
  }

  if (hand.combo === 'purple-victory') {
    // Purple is always an instant match win, even when the total is below five.
    // It never represents a partially mixed or Wild-substituted hand.
    return {
      status: 'scored',
      pointsAwarded: 5,
      newTotal: previousTotal + 5,
      matchWon: true,
      winReason: 'purple-instant',
    }
  }

  const newTotal = previousTotal + hand.points
  const matchWon = newTotal >= MATCH_POINT_GOAL_77
  return {
    status: 'scored',
    pointsAwarded: hand.points,
    newTotal,
    matchWon,
    winReason: matchWon ? 'five-accumulated-points' : null,
  }
}
