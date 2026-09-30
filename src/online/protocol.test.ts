import { describe, expect, it } from 'vitest'
import { fixture } from '../game/testKit'
import { onlineActionError, onlineStateInvariantError } from './protocol'

describe('online action protocol', () => {
  it('rejects menu/control actions even when the engine would otherwise accept them', () => {
    const state = fixture({ current: 'human' })

    expect(onlineActionError(state, { type: 'RESTART' })).toMatch(/not available/)
    expect(onlineActionError(state, { type: 'TOGGLE_TEST_MODE' })).toMatch(/not available/)
    expect(
      onlineActionError(state, { type: 'START_MATCH', opponentCount: 5, testMode: true }),
    ).toMatch(/not available/)
  })

  it('only permits actions that belong to the current phase', () => {
    const state = fixture({ current: 'human' })

    expect(
      onlineActionError(state, {
        type: 'SELECT_CARD',
        playerId: 'human',
        cardId: state.players[0].hand[0],
      }),
    ).toBeNull()
    expect(onlineActionError(state, { type: 'NEXT_ROUND' })).toMatch(/not allowed/)
  })

  it('rejects online state changes that alter table identity or enable test mode', () => {
    const before = fixture({ current: 'human' })
    const tooMany = structuredClone(before)
    tooMany.players.push({ ...tooMany.players[1], id: 'cpu-9', name: 'Phantom' })
    expect(onlineStateInvariantError(before, tooMany)).toMatch(/exactly two/)

    const testMode = structuredClone(before)
    testMode.testMode = true
    expect(onlineStateInvariantError(before, testMode)).toMatch(/Test mode/)
  })
})
