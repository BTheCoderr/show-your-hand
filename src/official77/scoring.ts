import { REGULAR_COLORS, type Card77, type NumberValue77, type RegularColor } from './types'

/**
 * October 2026 confirmed five-card scoring rules:
 * 1 point for a regular-color 1–5 run using at least two regular colors;
 * 2, 3, 4 points for the corresponding higher ordinary scoring categories;
 * 5 points and instant match victory ONLY for the five actual Purple 1–5 cards.
 */
export type ConfirmedScore77 = {
  status: 'scored'
  points: 1 | 2 | 3 | 4 | 5
  combo: 'run-mixed' | 'five-number' | 'five-color' | 'run-same-color' | 'purple-victory'
  label: string
  instantMatchWin: boolean
}
export type Evaluation77 =
  | ConfirmedScore77
  | { status: 'no-score' }

const NUMBERS: readonly NumberValue77[] = [1, 2, 3, 4, 5]

type RegularAssignment = { color: RegularColor; number: NumberValue77 }

export function isPurpleVictory77(cards: readonly Card77[]): boolean {
  return cards.length === 5 &&
    cards.every((card) => card.kind === 'purple') &&
    NUMBERS.every((value) => cards.some((card) => card.kind === 'purple' && card.number === value))
}

function assessAssignment(cards: readonly RegularAssignment[]): 0 | 1 | 2 | 3 | 4 {
  const sameColor = cards.every((card) => card.color === cards[0].color)
  const sameNumber = cards.every((card) => card.number === cards[0].number)
  const run = NUMBERS.every((n) => cards.some((card) => card.number === n))

  if (sameColor && run) return 4
  if (sameColor) return 3
  if (sameNumber) return 2
  // 1–5 using at least two regular colors earns exactly one point.
  // The original five-different-colors wording was replaced by the owner.
  if (run && !sameColor) return 1
  return 0
}

const CONFIRMED_LABELS: Record<1 | 2 | 3 | 4, ConfirmedScore77> = {
  1: { status: 'scored', points: 1, combo: 'run-mixed', label: '1–5 in mixed regular colors', instantMatchWin: false },
  2: { status: 'scored', points: 2, combo: 'five-number', label: 'Five of one number', instantMatchWin: false },
  3: { status: 'scored', points: 3, combo: 'five-color', label: 'Five of one regular color', instantMatchWin: false },
  4: { status: 'scored', points: 4, combo: 'run-same-color', label: '1–5 of one regular color', instantMatchWin: false },
}

export function evaluateHand77(cards: readonly Card77[]): Evaluation77 {
  if (cards.length !== 5 || new Set(cards.map((card) => card.id)).size !== 5) {
    return { status: 'no-score' }
  }

  if (isPurpleVictory77(cards)) {
    return {
      status: 'scored', points: 5, combo: 'purple-victory',
      label: 'Purple 1–5 — instant match win', instantMatchWin: true,
    }
  }

  // Purple cannot score with any regular color or Wild, even when it
  // incidentally resembles a conventional run, same-number or same-color hand.
  if (cards.some((card) => card.kind === 'purple')) return { status: 'no-score' }
  if (cards.some((card) => card.kind !== 'number' && card.kind !== 'wild')) {
    return { status: 'no-score' }
  }

  const fixed: RegularAssignment[] = cards
    .filter((card): card is Extract<Card77, { kind: 'number' }> => card.kind === 'number')
    .map(({ color, number }) => ({ color, number }))
  const wildCount = cards.filter((card) => card.kind === 'wild').length
  // There are exactly two physical Wild cards in the locked 77-card deck.
  if (wildCount > 2) return { status: 'no-score' }

  const result: { best: 0 | 1 | 2 | 3 | 4 } = { best: 0 }
  const expand = (assigned: RegularAssignment[], left: number): void => {
    if (left === 0) {
      const outcome = assessAssignment(assigned)
      if (outcome > result.best) result.best = outcome
      return
    }
    for (const color of REGULAR_COLORS) {
      for (const number of NUMBERS) {
        expand([...assigned, { color, number }], left - 1)
      }
    }
  }
  expand(fixed, wildCount)

  if (result.best === 4) return { ...CONFIRMED_LABELS[4] }
  if (result.best === 3) return { ...CONFIRMED_LABELS[3] }
  if (result.best === 2) return { ...CONFIRMED_LABELS[2] }
  if (result.best === 1) return { ...CONFIRMED_LABELS[1] }
  return { status: 'no-score' }
}
