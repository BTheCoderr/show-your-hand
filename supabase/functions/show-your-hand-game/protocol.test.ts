import { describe, expect, it } from 'vitest'
import { emptyMenuState, reduce } from './game/engine.ts'
import { onlineActionError, onlineStateInvariantError } from './protocol.ts'

function onlineState() {
  const state = reduce(emptyMenuState(false), {
    type: 'START_MATCH',
    opponentCount: 1,
    testMode: false,
    seed: 12345,
  })
  state.players = state.players.map((player) => ({ ...player, isHuman: true }))
  return state
}

describe('show-your-hand-game online protocol', () => {
  it('blocks control-plane actions from a live match', () => {
    const state = onlineState()
    expect(onlineActionError(state, { type: 'RESTART' })).toMatch(/not available/)
    expect(onlineActionError(state, { type: 'TOGGLE_TEST_MODE' })).toMatch(/not available/)
    expect(
      onlineActionError(state, { type: 'START_MATCH', opponentCount: 5, testMode: true }),
    ).toMatch(/not available/)
  })

  it('permits only actions for the active phase', () => {
    const state = onlineState()
    const cardId = state.players[state.currentPlayerIndex].hand[0]
    expect(
      onlineActionError(state, {
        type: 'SELECT_CARD',
        playerId: state.players[state.currentPlayerIndex].id,
        cardId,
      }),
    ).toBeNull()
    expect(onlineActionError(state, { type: 'NEXT_ROUND' })).toMatch(/not allowed/)
  })

  it('rejects a mutated table shape before commit', () => {
    const before = onlineState()
    const after = structuredClone(before)
    after.players.push({ ...after.players[1], id: 'phantom', name: 'Phantom' })
    expect(onlineStateInvariantError(before, after)).toMatch(/exactly two/)
  })
})
