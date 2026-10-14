import { describe, expect, it } from 'vitest'
import { assertConservation } from './deck'
import { emptyMenuState, reduce } from './engine'
import { clockwiseOthers, drawOne } from './helpers'
import type { OpponentCount } from './types'

describe('tables from 1v1 through 1v6', () => {
  it('deals five cards to every seat and keeps the 70-card deck intact', () => {
    for (const opponentCount of [1, 2, 3, 4, 5, 6] as OpponentCount[]) {
      const state = reduce(emptyMenuState(false), {
        type: 'START_MATCH',
        opponentCount,
        seed: 70 + opponentCount,
      })
      expect(state.players.map((player) => player.id)).toEqual([
        'human',
        ...Array.from({ length: opponentCount }, (_, index) => `cpu-${index + 1}`),
      ])
      expect(state.players.every((player) => player.hand.length === 5)).toBe(true)
      expect(state.drawPile.length).toBe(70 - state.players.length * 5)
      expect(state.currentPlayerIndex).toBe(0)
      expect(clockwiseOthers(state, 'human').map((player) => player.id)).toEqual(
        state.players.slice(1).map((player) => player.id),
      )
      assertConservation(state)
    }
  })

  it('keeps clockwise order when the viewer is not the host', () => {
    const state = reduce(emptyMenuState(false), {
      type: 'START_MATCH',
      opponentCount: 6,
      seed: 7,
    })
    expect(clockwiseOthers(state, 'cpu-3').map((player) => player.id)).toEqual([
      'cpu-4',
      'cpu-5',
      'cpu-6',
      'human',
      'cpu-1',
      'cpu-2',
    ])
  })

  it('sends Skip to the next clockwise seat at a seven-player table', () => {
    const state = reduce(emptyMenuState(false), {
      type: 'START_MATCH',
      opponentCount: 6,
      seed: 11,
    })
    const drawIndex = state.drawPile.findIndex((id) => state.catalog[id].kind === 'skip')
    expect(drawIndex).toBeGreaterThanOrEqual(0)
    const [skipId] = state.players[0].hand.splice(0, 1, state.drawPile[drawIndex])
    state.drawPile[drawIndex] = skipId
    const next = reduce(state, {
      type: 'SELECT_CARD',
      playerId: 'human',
      cardId: state.players[0].hand[0],
    })
    expect(next.phase.type).toBe('await_defense')
    if (next.phase.type === 'await_defense') {
      expect(next.phase.attack.targetIds).toEqual(['cpu-1'])
      expect(next.phase.responderId).toBe('cpu-1')
    }
    assertConservation(next)
  })

  it('shuffles the discard back in when a full table empties the draw pile', () => {
    const state = reduce(emptyMenuState(false), {
      type: 'START_MATCH',
      opponentCount: 6,
      seed: 7,
    })
    state.discardPile.push(...state.drawPile.splice(0))
    const drawn = drawOne(state)
    expect(drawn).toBeTruthy()
    expect(state.history.at(-1)).toMatch(/shuffled back/)
    state.discardPile.push(drawn)
    assertConservation(state)
  })
})
