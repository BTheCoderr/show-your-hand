/** Locked 77-card Standard Edition inventory. Independent of the live 70-card engine. */
export const REGULAR_COLORS_77 = ["red", "green", "orange", "yellow"] as const
export type RegularColor77 = (typeof REGULAR_COLORS_77)[number]
export const NUMBER_VALUES_77 = [1, 2, 3, 4, 5] as const
export type Number77 = (typeof NUMBER_VALUES_77)[number]
export const SPECIAL_KINDS_77 = ["blank", "show-your-hand", "drop-color", "skip", "shuffle"] as const
export type SpecialKind77 = (typeof SPECIAL_KINDS_77)[number]
export type Card77 =
  | { id: string; kind: "number"; color: RegularColor77; number: Number77 }
  | { id: string; kind: "purple"; number: Number77 }
  | { id: string; kind: "wild" }
  | { id: string; kind: SpecialKind77 }

export const STANDARD_77_COMPOSITION = {
  regular: 40,
  purple: 5,
  wild: 2,
  blank: 10,
  "show-your-hand": 5,
  "drop-color": 5,
  skip: 5,
  shuffle: 5,
  total: 77,
} as const

/** Card identifiers are stable within this spec; artwork wiring is intentionally separate. */
export function createStandard77Catalog(): Record<string, Card77> {
  const result: Record<string, Card77> = {}
  for (const color of REGULAR_COLORS_77) {
    for (const number of NUMBER_VALUES_77) {
      for (const copy of ["a", "b"] as const) {
        const id = color + "-" + number + "-" + copy
        result[id] = { id, kind: "number", color, number }
      }
    }
  }
  for (const number of NUMBER_VALUES_77) {
    const id = "purple-" + number
    result[id] = { id, kind: "purple", number }
  }
  for (let i = 1; i <= 2; i++) {
    const id = "wild-" + i
    result[id] = { id, kind: "wild" }
  }
  for (const [kind, count] of Object.entries({
    blank: 10,
    "show-your-hand": 5,
    "drop-color": 5,
    skip: 5,
    shuffle: 5,
  }) as Array<[SpecialKind77, number]>) {
    for (let i = 1; i <= count; i++) {
      const id = kind + "-" + String(i).padStart(2, "0")
      result[id] = { id, kind }
    }
  }
  return result
}

/** Hardcore Mode removes exactly ten Blanks, leaving 67 physical cards. */
export function createHardcore77Catalog(): Record<string, Card77> {
  const normal = createStandard77Catalog()
  return Object.fromEntries(Object.entries(normal).filter(([, card]) => card.kind !== "blank"))
}

export function assertStandard77Conservation(input: {
  catalog: Record<string, Card77>;
  players: ReadonlyArray<{ hand: ReadonlyArray<string> }>;
  drawPile: ReadonlyArray<string>;
  discardPile: ReadonlyArray<string>;
}, hardcore = false): void {
  const expected = Object.keys(input.catalog).sort()
  const all = [
    ...input.players.flatMap((player) => player.hand),
    ...input.drawPile,
    ...input.discardPile,
  ]
  const expectedSize = hardcore ? 67 : 77
  if (expected.length !== expectedSize || all.length !== expectedSize ||
      new Set(all).size !== expectedSize) {
    throw new Error("Standard77 conservation failed: wrong count or duplicate ID")
  }
  const seen = new Set(all)
  for (const id of expected) if (!seen.has(id)) throw new Error("Missing card " + id)
  for (const id of all) if (!input.catalog[id]) throw new Error("Unknown card " + id)
}
