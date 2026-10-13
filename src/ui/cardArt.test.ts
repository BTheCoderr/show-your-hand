import { describe, expect, it } from 'vitest'
import { createCatalog } from '../game/deck'
import { resolveCardArt } from './cardArt'

describe('new card art compatibility', () => {
  it('uses new art for compatible numbered colors', () => {
    for (const color of ['orange', 'green', 'purple']) {
      for (let n = 1; n <= 5; n++) {
        expect(resolveCardArt(`/cards/${color}-${n}.png`)).toBe(
          `/cards/v2/${color}-${n}.jpeg`,
        )
      }
    }
  })

  it('upgrades the back and compatible special artwork', () => {
    for (const kind of ['back', 'blank', 'show-your-hand', 'drop-color', 'skip']) {
      expect(resolveCardArt(`/cards/${kind}.png`)).toBe(
        `/cards/v2/${kind}.jpeg`,
      )
    }
  })

  it('never mislabels blue or Shuffle cards', () => {
    expect(resolveCardArt('/cards/blue-1.png')).toBe('/cards/blue-1.png')
    expect(resolveCardArt('/cards/blue-5.png')).toBe('/cards/blue-5.png')
    expect(resolveCardArt('/cards/shuffle.png')).toBe('/cards/shuffle.png')
  })

  it('preserves existing deck size, colors, and persisted art values', () => {
    const catalog = createCatalog()
    expect(Object.keys(catalog)).toHaveLength(70)
    const blue = Object.values(catalog).find(
      (card) => card.kind === 'number' && card.color === 'blue',
    )
    expect(blue?.art).toMatch(/^\/cards\/blue-[1-5]\.png$/)
    expect(resolveCardArt(blue!.art)).toEqual(blue!.art)
    expect(resolveCardArt('/cards/unknown.png')).toBe('/cards/unknown.png')
  })
})
