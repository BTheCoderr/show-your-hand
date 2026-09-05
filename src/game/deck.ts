import { COLORS, type Card, type Color, type NumberValue, type SpecialKind } from './types'

export function artForNumber(color: Color, number: NumberValue): string {
  return `/cards/${color}-${number}.png`
}

export function artForSpecial(kind: Card['kind']): string {
  return `/cards/${kind}.png`
}

export function createCatalog(): Record<string, Card> {
  const catalog: Record<string, Card> = {}

  for (const color of COLORS) {
    for (const number of [1, 2, 3, 4, 5] as NumberValue[]) {
      for (const copy of ['a', 'b'] as const) {
        const id = `${color}-${number}-${copy}`
        catalog[id] = {
          id,
          kind: 'number',
          color,
          number,
          art: artForNumber(color, number),
        }
      }
    }
  }

  for (let i = 1; i <= 10; i++) {
    const id = `blank-${String(i).padStart(2, '0')}`
    catalog[id] = { id, kind: 'blank', art: artForSpecial('blank') }
  }

  const specials: Array<[SpecialKind, number]> = [
    ['show-your-hand', 5],
    ['drop-color', 5],
    ['skip', 5],
    ['shuffle', 5],
  ]
  for (const [kind, count] of specials) {
    for (let i = 1; i <= count; i++) {
      const id = `${kind}-${i}`
      catalog[id] = { id, kind, art: artForSpecial(kind) }
    }
  }

  return catalog
}

export function allCardIds(catalog: Record<string, Card>): string[] {
  return Object.keys(catalog).sort()
}

export function locateCards(state: {
  catalog: Record<string, Card>
  players: { hand: string[] }[]
  drawPile: string[]
  discardPile: string[]
}): Map<string, string> {
  const locations = new Map<string, string>()
  state.players.forEach((player, index) => {
    for (const id of player.hand) locations.set(id, `hand:${index}`)
  })
  for (const id of state.drawPile) locations.set(id, 'draw')
  for (const id of state.discardPile) locations.set(id, 'discard')
  return locations
}

export function assertConservation(state: {
  catalog: Record<string, Card>
  players: { hand: string[] }[]
  drawPile: string[]
  discardPile: string[]
}): void {
  const expected = allCardIds(state.catalog)
  const seen: string[] = []
  for (const player of state.players) seen.push(...player.hand)
  seen.push(...state.drawPile, ...state.discardPile)

  if (seen.length !== 70 || expected.length !== 70) {
    throw new Error(`Deck size drifted: in-play ${seen.length}, catalog ${expected.length}`)
  }

  const unique = new Set(seen)
  if (unique.size !== 70) {
    const dupes = seen.filter((id, index) => seen.indexOf(id) !== index)
    throw new Error(`Duplicate card IDs in play: ${[...new Set(dupes)].join(', ')}`)
  }

  for (const id of expected) {
    if (!unique.has(id)) throw new Error(`Missing card ${id}`)
  }
  for (const id of seen) {
    if (!state.catalog[id]) throw new Error(`Unknown card ${id}`)
  }
}

export function expectedComposition(): Record<string, number> {
  return {
    numbered: 40,
    blank: 10,
    'show-your-hand': 5,
    'drop-color': 5,
    skip: 5,
    shuffle: 5,
  }
}
