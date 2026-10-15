import { describe, expect, it } from 'vitest'
import { opponentSeatPosition, teammateSeatIndex } from './tableSeats'

describe('canonical oval poker table seating', () => {
  for (let opponentCount = 1; opponentCount <= 5; opponentCount++) {
    it(`keeps ${opponentCount} opponent seats on a symmetric oval arc`, () => {
      const seats = Array.from({ length: opponentCount }, (_, index) =>
        opponentSeatPosition(index, opponentCount),
      )
      for (const point of seats) {
        expect(point.x).toBeGreaterThan(0.15)
        expect(point.x).toBeLessThan(0.85)
        expect(point.y).toBeGreaterThan(0.1)
        expect(point.y).toBeLessThan(0.56)
      }
      // Player 1 remains at bottom-center (0.5, >0.7) in the native/web render.
      expect(seats.every(point => point.y < 0.65)).toBe(true)
      for (let index = 0; index < Math.floor(opponentCount / 2); index++) {
        const left = seats[index]
        const right = seats[opponentCount - 1 - index]
        expect(left.x + right.x).toBeCloseTo(1, 8)
        expect(left.y).toBeCloseTo(right.y, 8)
        expect(left.x).toBeLessThan(right.x)
      }
      // Clockwise order never jumps backwards around the oval.
      for (let index = 1; index < seats.length; index++) {
        expect(seats[index].x).toBeGreaterThan(seats[index - 1].x - 0.01)
      }
    })
  }


  it('keeps all five opposing card fans and nameplates apart at narrow iPhone widths', () => {
    for (const screenWidth of [320, 375, 390, 430]) {
      const tableWidth = screenWidth - 12
      // Native table shell: 11px padded rail + 3px trim + 5px felt, each side.
      const feltWidth = tableWidth - 38
      const feltHeight = Math.round(tableWidth * 0.78) - 38
      const fanWidth = screenWidth < 360 ? 56 : 72
      const cardHeight = screenWidth < 360 ? 25 : 28
      const nameplateHeight = 23
      const bounds = Array.from({ length: 5 }, (_, index) => {
        const pos = opponentSeatPosition(index, 5)
        const x = pos.x * feltWidth
        const y = pos.y * feltHeight
        return {
          left: x - fanWidth / 2,
          right: x + fanWidth / 2,
          top: y - cardHeight / 2,
          bottom: y + cardHeight / 2 + nameplateHeight,
        }
      })
      for (let i = 0; i < bounds.length; i++) {
        for (let j = i + 1; j < bounds.length; j++) {
          const a = bounds[i]
          const b = bounds[j]
          const horizontalOverlap = Math.min(a.right, b.right) - Math.max(a.left, b.left)
          const verticalOverlap = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
          expect(
            horizontalOverlap <= 0 || verticalOverlap <= 0,
            `Seat ${i} overlaps seat ${j} at ${screenWidth}px`,
          ).toBe(true)
        }
      }
    }
  })

  it('places a heads-up opponent directly opposite the bottom seat', () => {
    expect(opponentSeatPosition(0, 1).x).toBeCloseTo(0.5, 8)
    expect(opponentSeatPosition(0, 1).y).toBeCloseTo(0.14, 8)
  })

  it('keeps the future 2v2 partner opposite without enabling teams', () => {
    expect(opponentSeatPosition(1, 3).x).toBeCloseTo(0.5, 8)
    expect(teammateSeatIndex(3)).toBe(1)
    expect(teammateSeatIndex(5)).toBeNull()
  })

  it('rejects invalid positions rather than quietly stacking them on top', () => {
    expect(() => opponentSeatPosition(5, 5)).toThrow(RangeError)
    expect(() => opponentSeatPosition(0, 6)).toThrow(RangeError)
    expect(() => opponentSeatPosition(-1, 4)).toThrow(RangeError)
  })
})
