import { describe, expect, it } from 'vitest'
import { assert77Conservation, createCatalog77, createDeck77, expectedComposition77 } from './deck'
import { evaluateHand77, isPurpleVictory77 } from './scoring'
import type { Card77 } from './types'

const catalog = createCatalog77()
const cards = (...ids: string[]): Card77[] => ids.map((id) => {
  const card = catalog[id]
  if (!card) throw new Error(`Missing fixture card ${id}`)
  return card
})

describe('locked October 2026 Standard Edition inventory', () => {
  it('contains exactly 77 different physical cards in the prescribed groups', () => {
    expect(Object.keys(catalog)).toHaveLength(77)
    expect(new Set(Object.keys(catalog)).size).toBe(77)
    for (const [kind, count] of Object.entries(expectedComposition77())) {
      expect(Object.values(catalog).filter((card) => card.kind === kind)).toHaveLength(count)
    }
  })

  it('has two copies each of 1–5 in four regular colors and NO blue', () => {
    for (const color of ['green', 'orange', 'yellow', 'red'] as const) {
      for (const number of [1, 2, 3, 4, 5] as const) {
        expect(Object.values(catalog).filter((card) =>
          card.kind === 'number' && card.color === color && card.number === number,
        )).toHaveLength(2)
      }
    }
    expect(Object.keys(catalog).some((id) => id.startsWith('blue-'))).toBe(false)
  })

  it('contains exactly one physical Purple card per number and two Wilds', () => {
    expect(Object.values(catalog).filter((card) => card.kind === 'purple')).toHaveLength(5)
    for (let number = 1; number <= 5; number++) {
      expect(catalog[`purple-${number}`]).toMatchObject({ kind: 'purple', number })
    }
    expect(catalog['wild-1'].kind).toBe('wild')
    expect(catalog['wild-2'].kind).toBe('wild')
  })

  it('removes only the ten Blank cards for 67-card Hardcore Mode', () => {
    const hardcore = createDeck77({ hardcore: true })
    expect(hardcore).toHaveLength(67)
    expect(hardcore.every((card) => card.kind !== 'blank')).toBe(true)
    expect(createDeck77()).toHaveLength(77)
  })

  it('checks conservation and rejects duplicates and missing cards', () => {
    const ids = Object.keys(catalog)
    expect(() => assert77Conservation(catalog, [ids.slice(0, 5)], ids.slice(5), [])).not.toThrow()
    expect(() => assert77Conservation(catalog, [[ids[0], ids[0], ...ids.slice(2, 5)]], ids.slice(5), [])).toThrow(/duplicate/)
    expect(() => assert77Conservation(catalog, [ids.slice(0, 4)], ids.slice(5), [])).toThrow(/conservation/)
  })
})

describe('locked Purple Victory', () => {
  it('awards exactly five points and immediate match win for Purple 1–5', () => {
    const hand = cards('purple-1', 'purple-2', 'purple-3', 'purple-4', 'purple-5')
    expect(isPurpleVictory77(hand)).toBe(true)
    expect(evaluateHand77(hand)).toMatchObject({
      status: 'scored', points: 5, combo: 'purple-victory', instantMatchWin: true,
    })
  })

  it('never allows mixed Purple runs, same numbers, or partial sets to score', () => {
    expect(evaluateHand77(cards('purple-1', 'red-2-a', 'green-3-a', 'orange-4-a', 'yellow-5-a'))).toEqual({ status: 'no-score' })
    expect(evaluateHand77(cards('purple-3', 'red-3-a', 'green-3-a', 'orange-3-a', 'yellow-3-a'))).toEqual({ status: 'no-score' })
    expect(evaluateHand77(cards('purple-1', 'purple-2', 'purple-3', 'purple-4', 'wild-1'))).toEqual({ status: 'no-score' })
    expect(evaluateHand77(cards('purple-1', 'purple-2', 'purple-3', 'wild-1', 'wild-2'))).toEqual({ status: 'no-score' })
  })
})

describe('approved ordinary hand scoring with Wilds', () => {
  it('awards four for a natural or Wild-completed same-color run', () => {
    expect(evaluateHand77(cards('red-1-a', 'red-2-a', 'red-3-a', 'red-4-a', 'red-5-a'))).toMatchObject({ points: 4, combo: 'run-same-color' })
    expect(evaluateHand77(cards('red-1-a', 'red-2-a', 'red-3-a', 'wild-1', 'wild-2'))).toMatchObject({ points: 4, combo: 'run-same-color' })
  })

  it('awards three for five of a color with or without Wilds', () => {
    expect(evaluateHand77(cards('green-1-a', 'green-1-b', 'green-2-a', 'green-4-a', 'green-4-b'))).toMatchObject({ points: 3, combo: 'five-color' })
    expect(evaluateHand77(cards('yellow-1-a', 'yellow-2-a', 'yellow-2-b', 'wild-1', 'wild-2'))).toMatchObject({ points: 3, combo: 'five-color' })
  })

  it('allows both Wilds to stand for the SAME number to make five of a kind', () => {
    expect(evaluateHand77(cards('red-3-a', 'green-3-a', 'orange-3-a', 'wild-1', 'wild-2'))).toMatchObject({
      status: 'scored', points: 2, combo: 'five-number', instantMatchWin: false,
    })
  })

  it('flags the unapproved mixed 1–5 rule instead of inventing a fifth regular color', () => {
    expect(evaluateHand77(cards('red-1-a', 'orange-2-a', 'yellow-3-a', 'green-4-a', 'red-5-a'))).toMatchObject({
      status: 'pending-one-point-rule',
    })
  })

  it('rejects five-card hands containing attack or defense cards', () => {
    expect(evaluateHand77(cards('red-1-a', 'red-2-a', 'red-3-a', 'red-4-a', 'blank-01'))).toEqual({ status: 'no-score' })
    expect(evaluateHand77(cards('red-1-a', 'red-2-a', 'red-3-a', 'red-4-a', 'shuffle-1'))).toEqual({ status: 'no-score' })
    expect(evaluateHand77(cards('red-1-a', 'red-1-b', 'green-2-a', 'yellow-3-a', 'wild-1'))).toEqual({ status: 'no-score' })
  })
})
