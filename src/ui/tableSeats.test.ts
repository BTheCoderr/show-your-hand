import { describe, expect, it } from 'vitest'
import { clockwiseOpponents } from './tableSeats'

const players = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'].map((id) => ({ id }))

describe('clockwiseOpponents', () => {
  it('shows the next player left and the second player opposite in four-player games', () => {
    expect(clockwiseOpponents(players.slice(0, 4), 'P1').map((p) => p.id)).toEqual([
      'P2', 'P3', 'P4',
    ])
  })

  it('keeps the seat order correct when the viewer is not player one', () => {
    expect(clockwiseOpponents(players.slice(0, 4), 'P3').map((p) => p.id)).toEqual([
      'P4', 'P1', 'P2',
    ])
  })

  it('wraps clockwise through six-player games without duplicating the viewer', () => {
    expect(clockwiseOpponents(players, 'P5').map((p) => p.id)).toEqual([
      'P6', 'P1', 'P2', 'P3', 'P4',
    ])
  })

  it('supports a head-to-head game', () => {
    expect(clockwiseOpponents(players.slice(0, 2), 'P2').map((p) => p.id)).toEqual(['P1'])
  })

  it('does not discard players when the viewer is temporarily absent', () => {
    expect(clockwiseOpponents(players.slice(0, 3), 'not-present')).toEqual(players.slice(0, 3))
  })
})
