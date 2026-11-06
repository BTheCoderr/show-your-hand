import { describe, expect, it } from "vitest"
import {
  assertStandard77Conservation,
  createHardcore77Catalog,
  createStandard77Catalog,
  STANDARD_77_COMPOSITION,
  type Card77,
} from "./deck"
import { isMatchWin77, scoreStandard77Hand } from "./scoring"
const catalog = createStandard77Catalog()
const hand = (...ids: string[]): Card77[] => ids.map((id) => {
  const card = catalog[id]
  if (!card) throw new Error("Unknown test card " + id)
  return card
})

describe("Standard Edition deck composition", () => {
  it("has exactly 77 distinct physical cards in the locked inventory", () => {
    const cards = Object.values(catalog)
    expect(cards).toHaveLength(77)
    expect(new Set(cards.map((card) => card.id)).size).toBe(77)
    expect(cards.filter((c) => c.kind === "number")).toHaveLength(40)
    expect(cards.filter((c) => c.kind === "purple")).toHaveLength(5)
    expect(cards.filter((c) => c.kind === "wild")).toHaveLength(2)
    for (const kind of ["blank", "show-your-hand", "drop-color", "skip", "shuffle"] as const) {
      expect(cards.filter((card) => card.kind === kind)).toHaveLength(STANDARD_77_COMPOSITION[kind])
    }
    for (const color of ["red", "green", "orange", "yellow"] as const) {
      for (const number of [1, 2, 3, 4, 5] as const) {
        expect(cards.filter((c) => c.kind === "number" && c.color === color && c.number === number)).toHaveLength(2)
      }
    }
  })
  it("keeps all cards conserved and removes only Blanks in Hardcore Mode", () => {
    assertStandard77Conservation({ catalog, players: [], drawPile: Object.keys(catalog), discardPile: [] })
    expect(() => assertStandard77Conservation({
      catalog, players: [], drawPile: Object.keys(catalog).slice(1), discardPile: [],
    })).toThrow()
    const hardcore = createHardcore77Catalog()
    expect(Object.keys(hardcore)).toHaveLength(67)
    expect(Object.values(hardcore).some((card) => card.kind === "blank")).toBe(false)
    assertStandard77Conservation({ catalog: hardcore, players: [], drawPile: Object.keys(hardcore), discardPile: [] }, true)
  })
})

describe("locked Standard Edition scoring", () => {
  it("gives Purple 1–5 a five-point instant match win, regardless of prior score", () => {
    const score = scoreStandard77Hand(hand("purple-1", "purple-2", "purple-3", "purple-4", "purple-5"))
    expect(score).toEqual({ points: 5, combo: "purple-victory", instantWin: true })
    expect(isMatchWin77(0, score)).toBe(true)
  })
  it("never scores Purple alongside regular cards or either Wild", () => {
    expect(scoreStandard77Hand(hand("purple-1", "purple-2", "purple-3", "purple-4", "wild-1"))).toBeNull()
    expect(scoreStandard77Hand(hand("purple-1", "red-2-a", "green-3-a", "orange-4-a", "yellow-5-a"))).toBeNull()
  })
  it("awards four for same regular-color 1–5", () => {
    expect(scoreStandard77Hand(hand("red-1-a", "red-2-a", "red-3-a", "red-4-a", "red-5-a"))?.points).toBe(4)
  })
  it("awards three for five regular cards of a color with repeated numbers", () => {
    expect(scoreStandard77Hand(hand("green-1-a", "green-1-b", "green-2-a", "green-3-a", "green-5-a"))?.points).toBe(3)
  })
  it("awards two for five of one number across regular colors plus a Wild", () => {
    expect(scoreStandard77Hand(hand("red-2-a", "green-2-a", "orange-2-a", "yellow-2-a", "wild-1"))?.points).toBe(2)
  })
  it("awards one for a 1–5 run with mixed but repeating regular colors", () => {
    expect(scoreStandard77Hand(hand("red-1-a", "green-2-a", "red-3-a", "green-4-a", "red-5-a"))).toMatchObject({ points: 1, combo: "mixed-run" })
  })
  it("allows both Wilds to duplicate a regular color and number", () => {
    const score = scoreStandard77Hand(hand("red-1-a", "red-1-b", "red-3-a", "wild-1", "wild-2"))
    expect(score).toMatchObject({ points: 4, combo: "same-color-run" })
  })
  it("rejects special cards and invalid hand sizes", () => {
    expect(scoreStandard77Hand(hand("red-1-a", "red-2-a", "red-3-a", "red-4-a", "blank-01"))).toBeNull()
    expect(scoreStandard77Hand(hand("red-1-a", "red-2-a", "red-3-a", "red-4-a"))).toBeNull()
  })
  it("wins by accumulating five regular points, not four", () => {
    const score = scoreStandard77Hand(hand("red-1-a", "red-2-a", "red-3-a", "red-4-a", "red-5-a"))
    expect(isMatchWin77(0, score)).toBe(false)
    expect(isMatchWin77(1, score)).toBe(true)
  })
})
