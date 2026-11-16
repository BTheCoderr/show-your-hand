import { describe, expect, it } from 'vitest'
import { createCatalog77 } from './deck'
import { canStopSkip77, forcedDropColor77, resolveShuffleTargets77 } from './effects'

const catalog = createCatalog77()

describe('locked 77-card attack/defense effect decisions', () => {
  it('lets only Blank stop Skip; Skip never counters Skip', () => {
    expect(canStopSkip77(catalog['blank-01'])).toBe(true)
    expect(canStopSkip77(catalog['skip-2'])).toBe(false)
    expect(canStopSkip77(catalog['shuffle-1'])).toBe(false)
    expect(canStopSkip77(null)).toBe(false)
  })

  it('keeps Purple and Wild when a regular color is dropped', () => {
    const hand = [
      catalog['red-1-a'], catalog['red-4-b'], catalog['purple-3'],
      catalog['wild-1'], catalog['green-2-a'],
    ]
    const outcome = forcedDropColor77(hand, 'red')
    expect(outcome.dropped.map((c) => c.id)).toEqual(['red-1-a', 'red-4-b'])
    expect(outcome.retained.map((c) => c.id)).toEqual(['purple-3', 'wild-1', 'green-2-a'])
  })

  it('applies each Blank independently on a two-person Shuffle attack', () => {
    expect(resolveShuffleTargets77({
      attackerId: 'a',
      targetIds: ['b', 'c'],
      responses: { b: 'blank', c: 'accept' },
    })).toEqual({
      cancelledOriginalAttack: false, redirectedToAttacker: false, affectedPlayerIds: ['c'],
    })
  })

  it('reversal cancels Shuffle for BOTH original targets and affects ONLY the attacker', () => {
    expect(resolveShuffleTargets77({
      attackerId: 'a',
      targetIds: ['b', 'c'],
      responses: { b: 'shuffle', c: 'accept' },
    })).toEqual({
      cancelledOriginalAttack: true, redirectedToAttacker: true, affectedPlayerIds: ['a'],
    })
  })

  it('lets the original attacker use Blank against a Shuffle reversal', () => {
    expect(resolveShuffleTargets77({
      attackerId: 'a',
      targetIds: ['b', 'c'],
      responses: { b: 'shuffle', c: 'blank' },
      attackerBlocksReversal: true,
    })).toMatchObject({ redirectedToAttacker: true, affectedPlayerIds: [] })
  })

  it('rejects invalid duplicate and missing targets without inventing a move', () => {
    expect(() => resolveShuffleTargets77({
      attackerId: 'a', targetIds: ['b', 'b'], responses: { b: 'accept' },
    })).toThrow(/invalid/)
    expect(() => resolveShuffleTargets77({
      attackerId: 'a', targetIds: ['b', 'c'], responses: { b: 'blank' },
    })).toThrow(/Missing/)
  })
})
