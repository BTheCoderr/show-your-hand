import { describe, expect, it } from 'vitest'
import { createCatalog77 } from './deck'
import { resolveMatch77 } from './match'
import { evaluateHand77 } from './scoring'

const catalog = createCatalog77()
const score = (...ids: string[]) => evaluateHand77(ids.map((id) => catalog[id]))

describe('both owner-approved match-win conditions', () => {
  it('lets a normal 4-point hand take a player or team from 1 to 5 points', () => {
    expect(resolveMatch77(score('red-1-a', 'red-2-a', 'red-3-a', 'red-4-a', 'red-5-a'), 1))
      .toMatchObject({
        status: 'scored', pointsAwarded: 4, newTotal: 5,
        matchWon: true, winReason: 'five-accumulated-points',
      })
  })

  it('keeps matches going below five accumulated points', () => {
    expect(resolveMatch77(score('green-1-a', 'green-1-b', 'green-2-a', 'green-3-a', 'green-3-b'), 0))
      .toMatchObject({
        status: 'scored', pointsAwarded: 3, newTotal: 3,
        matchWon: false, winReason: null,
      })
  })

  it('gives Purple 1–5 an instant win from any nonnegative starting score', () => {
    for (const existing of [0, 1, 3, 4]) {
      const hand = score('purple-1', 'purple-2', 'purple-3', 'purple-4', 'purple-5')
      expect(resolveMatch77(hand, existing)).toMatchObject({
        status: 'scored', pointsAwarded: 5, matchWon: true, winReason: 'purple-instant',
        newTotal: existing + 5,
      })
    }
  })

  it('never turns mixed Purple/regular hands into ordinary points or victory', () => {
    const invalid = [
      ['purple-1', 'red-2-a', 'green-3-a', 'yellow-4-a', 'orange-5-a'],
      ['purple-3', 'red-3-a', 'green-3-a', 'orange-3-a', 'yellow-3-a'],
      ['purple-1', 'purple-2', 'purple-3', 'purple-4', 'wild-1'],
      ['purple-1', 'purple-2', 'purple-3', 'wild-1', 'wild-2'],
    ]
    for (const hand of invalid) {
      expect(resolveMatch77(score(...hand), 4)).toEqual({
        status: 'not-scoring', newTotal: 4, matchWon: false,
      })
    }
  })

  it('treats one-point color rule as unresolved, not as a win at four points', () => {
    expect(resolveMatch77(score('red-1-a', 'orange-2-a', 'yellow-3-a', 'green-4-a', 'red-5-a'), 4))
      .toEqual({ status: 'pending-one-point-rule', newTotal: 4, matchWon: false })
  })

  it('rejects invalid score totals', () => {
    const hand = score('purple-1', 'purple-2', 'purple-3', 'purple-4', 'purple-5')
    for (const total of [-1, NaN, 1.5, Number.POSITIVE_INFINITY]) {
      expect(() => resolveMatch77(hand, total)).toThrow(/nonnegative integer/)
    }
  })
})
