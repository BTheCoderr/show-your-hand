import { describe, expect, it } from 'vitest'
import { casinoTableDimensions } from './casinoTableGeometry'

describe('casino poker/blackjack table furniture', () => {
  for (const screenWidth of [320, 375, 390, 430, 767, 768, 820, 1024, 1366]) {
    it(`remains a wide casino table at ${screenWidth}px`, () => {
      const frame = casinoTableDimensions(screenWidth)
      expect(frame.width).toBeLessThanOrEqual(screenWidth)
      expect(frame.width / frame.height).toBeGreaterThan(1.2)
      expect(frame.width / frame.height).toBeLessThan(1.6)
      expect(frame.railRadius).toBe(Math.round(frame.height / 2))
      expect(frame.width).toBeGreaterThan(frame.height)
    })
  }

  it('keeps bounded phone/tablet sizes instead of filling the entire viewport height', () => {
    expect(casinoTableDimensions(390)).toMatchObject({ width: 378, tablet: false })
    expect(casinoTableDimensions(1024)).toMatchObject({ width: 900, tablet: true })
  })

  it('rejects nonsensical dimensions', () => {
    expect(() => casinoTableDimensions(0)).toThrow(RangeError)
    expect(() => casinoTableDimensions(Number.NaN)).toThrow(RangeError)
  })
})
