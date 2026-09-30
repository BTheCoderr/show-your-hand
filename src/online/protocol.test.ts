import { describe, expect, it } from 'vitest'
import { emptyMenuState, reduce } from '../game/engine'
import { onlineActionError, onlineStateInvariantError } from './protocol'

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

describe('online action protocol', () => {
  it('rejects menu/control actions even when the engine would otherwise accept them', () => {
    const state = onlineState()

    expect(onlineActionError(state, { type: 'RESTART' })).toMatch(/not available/)
    expect(onlineActionError(state, { type: 'TOGGLE_TEST_MODE' })).toMatch(/not available/)
    expect(
      onlineActionError(state, { type: 'START_MATCH', opponentCount: 5, testMode: true }),
    ).toMatch(/not available/)
  })

  it('only permits actions that belong to the current phase', () => {
    const state = onlineState()
    const current = state.players[state.currentPlayerIndex]

    expect(
      onlineActionError(state, {
        type: 'SELECT_CARD',
        playerId: current.id,
        cardId: current.hand[0],
      }),
    ).toBeNull()
    expect(onlineActionError(state, { type: 'NEXT_ROUND' })).toMatch(/not allowed/)
  })

  it('rejects online state changes that alter table identity or enable test mode', () => {
    const before = onlineState()
    const tooMany = structuredClone(before)
    tooMany.players.push({ ...tooMany.players[1], id: 'cpu-9', name: 'Phantom' })
    expect(onlineStateInvariantError(before, tooMany)).toMatch(/exactly two/)

    const testMode = structuredClone(before)
    testMode.testMode = true
    expect(onlineStateInvariantError(before, testMode)).toMatch(/Test mode/)
  })
})
