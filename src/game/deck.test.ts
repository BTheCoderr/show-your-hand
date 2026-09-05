import { describe, expect, it } from 'vitest'
import { reduceStrict } from './ai'
import { allCardIds, assertConservation, createCatalog, expectedComposition } from './deck'
import { reduce } from './engine'
import { fixture } from './testKit'

describe('deck composition', () => {
  it('contains exactly 70 unique card IDs with the established counts', () => {
    const catalog = createCatalog()
    const ids = allCardIds(catalog)
    expect(ids).toHaveLength(70)
    expect(new Set(ids).size).toBe(70)

    const counts = expectedComposition()
    const numbered = ids.filter((id) => catalog[id].kind === 'number')
    expect(numbered).toHaveLength(counts.numbered)
    expect(ids.filter((id) => catalog[id].kind === 'blank')).toHaveLength(counts.blank)
    expect(ids.filter((id) => catalog[id].kind === 'show-your-hand')).toHaveLength(
      counts['show-your-hand'],
    )
    expect(ids.filter((id) => catalog[id].kind === 'drop-color')).toHaveLength(counts['drop-color'])
    expect(ids.filter((id) => catalog[id].kind === 'skip')).toHaveLength(counts.skip)
    expect(ids.filter((id) => catalog[id].kind === 'shuffle')).toHaveLength(counts.shuffle)

    for (const color of ['orange', 'blue', 'green', 'purple'] as const) {
      for (const n of [1, 2, 3, 4, 5] as const) {
        const copies = numbered.filter((id) => {
          const card = catalog[id]
          return card.kind === 'number' && card.color === color && card.number === n
        })
        expect(copies).toHaveLength(2)
      }
    }
  })

  it('keeps all 70 IDs after dealing and a discard', () => {
    let state = reduce(fixture({ hands: { human: [], 'cpu-1': [] } }), {
      type: 'START_MATCH',
      opponentCount: 2,
      seed: 11,
    })
    assertConservation(state)
    expect(state.players.every((player) => player.hand.length === 5)).toBe(true)
    const cardId = state.players[0].hand.find((id) => {
      const kind = state.catalog[id].kind
      return kind === 'number' || kind === 'blank'
    })
    expect(cardId).toBeTruthy()
    state = reduceStrict(state, { type: 'SELECT_CARD', playerId: 'human', cardId: cardId! })
    assertConservation(state)
    expect(state.players.every((player) => player.hand.length === 5)).toBe(true)
  })
})
