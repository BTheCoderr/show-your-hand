import type { Card, ComboName, NumberCard, ScoreResult } from './types'

const LABELS: Record<ComboName, string> = {
  'run-same-color': '1–5 same color',
  'five-color': 'Five of one color',
  'five-number': 'Five of one number',
  'run-mixed': '1–5 mixed colors',
}

/** Highest qualifying combination only. Specials never score. */
export function scoreHand(cards: Card[]): ScoreResult | null {
  if (cards.length !== 5) return null
  if (!cards.every((card) => card.kind === 'number')) return null

  const numbers = cards as NumberCard[]
  const values = numbers.map((card) => card.number).sort((a, b) => a - b)
  const colors = numbers.map((card) => card.color)
  const allSameColor = colors.every((color) => color === colors[0])
  const allSameNumber = numbers.every((card) => card.number === numbers[0].number)
  const isRun = values.join(',') === '1,2,3,4,5'

  if (isRun && allSameColor) {
    return { points: 4, combo: 'run-same-color', label: LABELS['run-same-color'] }
  }
  if (allSameColor) {
    return { points: 3, combo: 'five-color', label: LABELS['five-color'] }
  }
  if (allSameNumber) {
    return { points: 2, combo: 'five-number', label: LABELS['five-number'] }
  }
  if (isRun) {
    return { points: 1, combo: 'run-mixed', label: LABELS['run-mixed'] }
  }
  return null
}

export function comboLabel(combo: ComboName): string {
  return LABELS[combo]
}
