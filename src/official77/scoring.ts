import { REGULAR_COLORS, type Card77, type NumberValue77, type RegularColor } from './types'

/**
 * This scorer implements ONLY approved outcomes.
 * The 1-point combination still requires an owner decision: there are only
 * four ordinary colors, and Purple cannot count as a fifth.
 */
export type ConfirmedScore77 = {
  status: 'scored'
  points: 2 | 3 | 4 | 5
  combo: 'five-number' | 'five-color' | 'run-same-color' | 'purple-victory'
  label: string
  instantMatchWin: boolean
}
export type Evaluation77 =
  | ConfirmedScore77
  | { status: 'pending-one-point-rule'; reason: string }
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
  // 1–5 with mixed regular colors is a candidate, NOT a confirmed 1-point hand.
  if (run) return 1
  return 0
}

const CONFIRMED_LABELS: Record<2 | 3 | 4, ConfirmedScore77> = {
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

  let best: 0 | 1 | 2 | 3 | 4 = 0
  const expand = (assigned: RegularAssignment[], left: number): void => {
    if (left === 0) {
      const outcome = assessAssignment(assigned)
      if (outcome > best) best = outcome
      return
    }
    for (const color of REGULAR_COLORS) {
      for (const number of NUMBERS) {
        expand([...assigned, { color, number }], left - 1)
      }
    }
  }
  expand(fixed, wildCount)

  if (best === 4) return { ...CONFIRMED_LABELS[4] }
  if (best === 3) return { ...CONFIRMED_LABELS[3] }
  if (best === 2) return { ...CONFIRMED_LABELS[2] }
  if (best === 1) {
    return {
      status: 'pending-one-point-rule',
      reason: 'Five different regular colors are impossible with the locked four-color deck. Owner clarification required.',
    }
  }
  return { status: 'no-score' }
}
