import {
  NUMBER_VALUES_77,
  REGULAR_COLORS_77,
  type Card77,
  type Number77,
  type RegularColor77,
} from "./deck"

export type Combo77 =
  | "purple-victory"
  | "same-color-run"
  | "five-same-color"
  | "five-same-number"
  | "mixed-run"
export type Score77 = { points: 1 | 2 | 3 | 4 | 5; combo: Combo77; instantWin: boolean }
type Regular77 = { color: RegularColor77; number: Number77 }

function regularScore(cards: readonly Regular77[]): Score77 | null {
  if (cards.length !== 5) return null
  const colors = cards.map((c) => c.color)
  const numbers = cards.map((c) => c.number)
  const oneColor = colors.every((c) => c === colors[0])
  const oneNumber = numbers.every((n) => n === numbers[0])
  const run = [...numbers].sort((a, b) => a - b).join(",") === "1,2,3,4,5"
  if (run && oneColor) return { points: 4, combo: "same-color-run", instantWin: false }
  if (oneColor) return { points: 3, combo: "five-same-color", instantWin: false }
  if (oneNumber) return { points: 2, combo: "five-same-number", instantWin: false }
  // Mixed colors may repeat, but must include at least two regular colors.
  if (run && new Set(colors).size >= 2) {
    return { points: 1, combo: "mixed-run", instantWin: false }
  }
  return null
}

const WILD_ROLES: readonly Regular77[] = REGULAR_COLORS_77.flatMap((color) =>
  NUMBER_VALUES_77.map((number) => ({ color, number })),
)

/**
 * Scores the full locked 77-card Standard Edition with at most two Wilds.
 * Wilds can duplicate any regular number/color, but never represent Purple.
 * Purple can score only when all five unique Purple 1-5 are present.
 * No special card participates in scoring.
 */
export function scoreStandard77Hand(cards: readonly Card77[]): Score77 | null {
  if (cards.length !== 5) return null
  const purples = cards.filter((c) => c.kind === "purple")
  if (purples.length > 0) {
    if (purples.length !== 5) return null
    const values = purples.map((c) => (c.kind === "purple" ? c.number : 0))
    return [...values].sort((a, b) => a - b).join(",") === "1,2,3,4,5"
      ? { points: 5, combo: "purple-victory", instantWin: true }
      : null
  }
  const wildCount = cards.filter((c) => c.kind === "wild").length
  if (wildCount > 2 || cards.some((c) => c.kind !== "number" && c.kind !== "wild")) return null
  const fixed = cards.flatMap((c) => c.kind === "number" ? [{ color: c.color, number: c.number }] : [])
  let best: Score77 | null = null
  const evaluate = (resolved: Regular77[]) => {
    const next = regularScore([...fixed, ...resolved])
    if (next && (!best || next.points > best.points)) best = next
  }
  if (wildCount === 0) evaluate([])
  else if (wildCount === 1) {
    for (const a of WILD_ROLES) evaluate([a])
  } else {
    for (const a of WILD_ROLES) for (const b of WILD_ROLES) evaluate([a, b])
  }
  return best
}

export function isMatchWin77(priorPoints: number, score: Score77 | null): boolean {
  return Boolean(score?.instantWin || (score && priorPoints + score.points >= 5))
}
