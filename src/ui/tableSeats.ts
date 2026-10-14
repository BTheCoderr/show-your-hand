/**
 * Seats around the human, who always sits at the bottom.
 * The first opponent is the next player clockwise.
 * With three opponents, the across seat (`top`) is the planned 2v2 teammate seat.
 * This map does not enable team rules.
 */
export type TableSeat = 'top' | 'top-left' | 'top-right' | 'left' | 'right'

const SEATS: Record<number, TableSeat[]> = {
  1: ['top'],
  2: ['top-left', 'top-right'],
  3: ['left', 'top', 'right'],
  4: ['left', 'top-left', 'top-right', 'right'],
  5: ['left', 'top-left', 'top', 'top-right', 'right'],
}

export function opponentSeat(index: number, opponentCount: number): TableSeat {
  return SEATS[opponentCount]?.[index] ?? 'top'
}

export function teammateSeatIndex(opponentCount: number): number | null {
  const seats = SEATS[opponentCount]
  if (!seats) return null
  const across = seats.indexOf('top')
  return across === -1 ? null : across
}
