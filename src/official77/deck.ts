import {
  REGULAR_COLORS,
  type Card77,
  type Catalog77,
  type NumberValue77,
  type SpecialKind77,
} from './types'

export const STANDARD_DECK_SIZE = 77
export const HARDCORE_DECK_SIZE = 67
const NUMBERS: readonly NumberValue77[] = [1, 2, 3, 4, 5]

/**
 * Official locked inventory. /cards/ paths are references ONLY:
 * missing artwork must be supplied and approved before integration.
 */
export function createCatalog77(): Catalog77 {
  const catalog: Catalog77 = {}

  for (const color of REGULAR_COLORS) {
    for (const number of NUMBERS) {
      for (const copy of ['a', 'b'] as const) {
        const id = `${color}-${number}-${copy}`
        catalog[id] = {
          id, kind: 'number', color, number,
          artPath: `/cards/${color}-${number}.png`,
        }
      }
    }
  }

  for (const number of NUMBERS) {
    const id = `purple-${number}`
    catalog[id] = { id, kind: 'purple', number, artPath: `/cards/purple-${number}.png` }
  }

  for (let i = 1; i <= 2; i++) {
    const id = `wild-${i}`
    catalog[id] = { id, kind: 'wild', artPath: '/cards/wild.png' }
  }

  const specialCounts: readonly (readonly [SpecialKind77, number])[] = [
    ['blank', 10],
    ['show-your-hand', 5],
    ['drop-color', 5],
    ['skip', 5],
    ['shuffle', 5],
  ]

  for (const [kind, count] of specialCounts) {
    for (let i = 1; i <= count; i++) {
      const id = kind === 'blank'
        ? `blank-${String(i).padStart(2, '0')}`
        : `${kind}-${i}`
      catalog[id] = { id, kind, artPath: `/cards/${kind}.png` }
    }
  }

  if (Object.keys(catalog).length !== STANDARD_DECK_SIZE) {
    throw new Error('Official Standard Edition deck must contain exactly 77 cards')
  }
  return catalog
}

export function createDeck77(options: { hardcore?: boolean } = {}): Card77[] {
  return Object.values(createCatalog77())
    .filter((card) => !options.hardcore || card.kind !== 'blank')
}

export function expectedComposition77(): Record<Card77['kind'], number> {
  return {
    number: 40,
    purple: 5,
    wild: 2,
    blank: 10,
    'show-your-hand': 5,
    'drop-color': 5,
    skip: 5,
    shuffle: 5,
  }
}

/** Throws if an in-progress 77-card game loses or duplicates any physical card. */
export function assert77Conservation(
  catalog: Catalog77,
  hands: readonly (readonly string[])[],
  drawPile: readonly string[],
  discardPile: readonly string[],
): void {
  const expected = Object.keys(catalog)
  const seen = [...hands.flat(), ...drawPile, ...discardPile]
  if (expected.length !== STANDARD_DECK_SIZE || seen.length !== STANDARD_DECK_SIZE) {
    throw new Error(`77-card conservation failed (catalog ${expected.length}, in play ${seen.length})`)
  }
  const set = new Set(seen)
  if (set.size !== STANDARD_DECK_SIZE) throw new Error('77-card conservation: duplicate IDs')
  if (expected.some((id) => !set.has(id)) || seen.some((id) => !catalog[id])) {
    throw new Error('77-card conservation: missing or unknown card')
  }
}
