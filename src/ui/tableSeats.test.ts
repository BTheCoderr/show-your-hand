import { describe, expect, it } from 'vitest'
import { opponentSeat, teammateSeatIndex } from './tableSeats'

describe('table seating', () => {
  it('puts the only opponent across the table', () => {
    expect(opponentSeat(0, 1)).toBe('top')
  })

  it('seats two opponents on the upper corners', () => {
    expect([opponentSeat(0, 2), opponentSeat(1, 2)]).toEqual(['top-left', 'top-right'])
  })

  it('keeps the planned 2v2 teammate directly across without enabling teams', () => {
    expect(opponentSeat(0, 3)).toBe('left')
    expect(opponentSeat(1, 3)).toBe('top')
    expect(opponentSeat(2, 3)).toBe('right')
    expect(teammateSeatIndex(3)).toBe(1)
  })

  it('adds the sixth opponent on the lower right, still clockwise from the left', () => {
    expect([0, 1, 2, 3, 4, 5].map((index) => opponentSeat(index, 6))).toEqual([
      'left',
      'top-left',
      'top',
      'top-right',
      'right',
      'lower-right',
    ])
    expect(teammateSeatIndex(6)).toBe(2)
  })

  it('spreads five opponents around the table instead of one row', () => {
    expect([0, 1, 2, 3, 4].map((index) => opponentSeat(index, 5))).toEqual([
      'left',
      'top-left',
      'top',
      'top-right',
      'right',
    ])
  })
})
