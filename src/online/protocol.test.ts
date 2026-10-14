import { describe, expect, it } from 'vitest'
import { emptyMenuState, reduce } from '../game/engine'
import { onlineActionError, onlineRosterError, onlineStateInvariantError, seatGamePlayerId } from './protocol'

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
    for (let seat = 2; seat <= 6; seat += 1) {
      tooMany.players.push({ ...tooMany.players[1], id: `cpu-${seat}`, name: `Phantom ${seat}` })
    }
    expect(onlineStateInvariantError(before, tooMany)).toMatch(/between two and six/)

    const testMode = structuredClone(before)
    testMode.testMode = true
    expect(onlineStateInvariantError(before, testMode)).toMatch(/Test mode/)
  })

  it('accepts a full six-player roster and rejects a short or mis-seated table', () => {
    const full = Array.from({ length: 6 }, (_, seat) => ({
      seat,
      gamePlayerId: seatGamePlayerId(seat),
      ready: true,
    }))
    expect(onlineRosterError(full, 6)).toBeNull()
    expect(onlineRosterError(full.slice(0, 3), 6)).toMatch(/filled/)
    expect(onlineRosterError(full.map((player) => ({ ...player, ready: player.seat === 0 })), 6)).toMatch(/ready/)
    expect(onlineRosterError([{ ...full[0] }, { ...full[1], gamePlayerId: 'cpu-9' }], 2)).toMatch(/mapping/)
    expect(onlineRosterError(full, 7)).toMatch(/two to six/)
    expect(() => seatGamePlayerId(6)).toThrow(/six-player/)
  })
})
