import { describe, expect, it } from 'vitest'
import { createCatalog } from './deck'
import { scoreHand } from './scoring'
import type { Card } from './types'

const catalog = createCatalog()

function cards(...ids: string[]): Card[] {
  return ids.map((id) => catalog[id])
}

describe('scoring', () => {
  it('scores 1–5 same color as 4 points', () => {
    expect(
      scoreHand(cards('orange-1-a', 'orange-2-a', 'orange-3-a', 'orange-4-a', 'orange-5-a')),
    ).toMatchObject({ points: 4, combo: 'run-same-color' })
  })

  it('scores five of one color as 3 points', () => {
    expect(
      scoreHand(cards('blue-1-a', 'blue-1-b', 'blue-2-a', 'blue-4-a', 'blue-5-a')),
    ).toMatchObject({ points: 3, combo: 'five-color' })
  })

  it('scores five of one number as 2 points', () => {
    expect(
      scoreHand(cards('orange-3-a', 'blue-3-a', 'green-3-a', 'purple-3-a', 'orange-3-b')),
    ).toMatchObject({ points: 2, combo: 'five-number' })
  })

  it('scores 1–5 mixed colors as 1 point', () => {
    expect(
      scoreHand(cards('orange-1-a', 'blue-2-a', 'green-3-a', 'purple-4-a', 'orange-5-a')),
    ).toMatchObject({ points: 1, combo: 'run-mixed' })
  })

  it('awards only the highest when combinations overlap', () => {
    const runSame = scoreHand(
      cards('green-1-a', 'green-2-a', 'green-3-a', 'green-4-a', 'green-5-a'),
    )
    expect(runSame?.points).toBe(4)
    expect(runSame?.combo).toBe('run-same-color')
  })

  it('rejects specials and short hands', () => {
    expect(
      scoreHand(cards('orange-1-a', 'orange-2-a', 'orange-3-a', 'orange-4-a', 'blank-01')),
    ).toBeNull()
    expect(scoreHand(cards('orange-1-a', 'orange-2-a', 'orange-3-a', 'orange-4-a'))).toBeNull()
    expect(
      scoreHand(cards('orange-1-a', 'orange-1-b', 'blue-2-a', 'green-3-a', 'purple-4-a')),
    ).toBeNull()
  })
})
