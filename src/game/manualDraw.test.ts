import { describe, expect, it } from 'vitest'
import { advanceComputers, chooseAiAction, reduceStrict } from './ai'
import { actorId, reduce } from './engine'
import { playerById } from './helpers'
import { fixture } from './testKit'

describe('manual pickup after a drop', () => {
  it('waits for the player to pick up after discarding a number card', () => {
    let state = fixture({
      manualDraw: true,
      hands: {
        human: ['orange-1-a', 'orange-2-a', 'blue-3-a', 'green-4-a', 'purple-5-a'],
        'cpu-1': ['blue-1-a', 'blue-2-a', 'green-3-a', 'purple-4-a', 'skip-1'],
      },
      draw: ['orange-3-b', 'green-1-a'],
      current: 'human',
    })
    state = reduceStrict(state, { type: 'SELECT_CARD', playerId: 'human', cardId: 'purple-5-a' })

    expect(state.phase).toEqual({ type: 'draw_card', playerId: 'human' })
    expect(actorId(state)).toBe('human')
    expect(playerById(state, 'human').hand).toHaveLength(4)
    expect(state.drawPile[0]).toBe('orange-3-b')

    state = reduceStrict(state, { type: 'DRAW_CARD', playerId: 'human' })
    expect(playerById(state, 'human').hand).toContain('orange-3-b')
    expect(playerById(state, 'human').hand).toHaveLength(5)
    expect(state.pendingDrawId).toBeNull()
    expect(state.phase.type).toBe('choose_action')
    expect(state.players[state.currentPlayerIndex].id).toBe('cpu-1')
  })

  it('rejects a pickup from the wrong player or outside the pickup step', () => {
    let state = fixture({
      manualDraw: true,
      hands: {
        human: ['orange-1-a', 'orange-2-a', 'blue-3-a', 'green-4-a', 'purple-5-a'],
        'cpu-1': ['blue-1-a', 'blue-2-a', 'green-3-a', 'purple-4-a', 'skip-1'],
      },
      current: 'human',
    })
    const early = reduce(state, { type: 'DRAW_CARD', playerId: 'human' })
    expect(early.history.at(-1)).toMatch(/^Action blocked:/)

    state = reduceStrict(state, { type: 'SELECT_CARD', playerId: 'human', cardId: 'purple-5-a' })
    const wrong = reduce(state, { type: 'DRAW_CARD', playerId: 'cpu-1' })
    expect(wrong.history.at(-1)).toMatch(/^Action blocked:/)
    expect(wrong.phase).toEqual({ type: 'draw_card', playerId: 'human' })
  })

  it('skips the pickup when the player already took the top discard', () => {
    let state = fixture({
      manualDraw: true,
      hands: {
        human: ['orange-1-a', 'orange-2-a', 'blue-3-a', 'green-4-a', 'purple-5-a'],
        'cpu-1': ['blue-1-a', 'blue-2-a', 'green-3-a', 'purple-4-a', 'skip-1'],
      },
      discard: ['orange-3-a'],
      current: 'human',
    })
    state = reduceStrict(state, { type: 'TAKE_DISCARD', playerId: 'human' })
    state = reduceStrict(state, { type: 'SELECT_CARD', playerId: 'human', cardId: 'purple-5-a' })
    expect(state.phase.type).toBe('choose_action')
    expect(playerById(state, 'human').hand).toHaveLength(5)
  })

  it('refills defenders automatically but lets the attacker pick up their own card', () => {
    let state = fixture({
      manualDraw: true,
      hands: {
        human: ['show-your-hand-1', 'orange-1-a', 'orange-2-a', 'orange-3-a', 'orange-4-a'],
        'cpu-1': ['blank-01', 'blue-1-a', 'blue-2-a', 'blue-3-a', 'blue-4-a'],
      },
      current: 'human',
    })
    state = reduceStrict(state, {
      type: 'CONFIRM_ATTACK',
      playerId: 'human',
      cardId: 'show-your-hand-1',
      targetIds: ['cpu-1'],
    })
    state = reduceStrict(state, {
      type: 'RESPOND_DEFENSE',
      playerId: 'cpu-1',
      response: 'blank',
      cardId: 'blank-01',
    })

    expect(playerById(state, 'cpu-1').hand).toHaveLength(5)
    expect(state.phase).toEqual({ type: 'draw_card', playerId: 'human' })
    state = reduceStrict(state, { type: 'DRAW_CARD', playerId: 'human' })
    expect(playerById(state, 'human').hand).toHaveLength(5)
  })

  it('needs no pickup when a Shuffle reversal deals the attacker a fresh hand', () => {
    let state = fixture({
      manualDraw: true,
      hands: {
        human: ['shuffle-1', 'orange-1-a', 'orange-2-a', 'orange-3-a', 'orange-4-a'],
        'cpu-1': ['shuffle-2', 'blue-1-a', 'blue-2-a', 'blue-3-a', 'blue-4-a'],
      },
      current: 'human',
    })
    state = reduceStrict(state, {
      type: 'CONFIRM_ATTACK',
      playerId: 'human',
      cardId: 'shuffle-1',
      targetIds: ['cpu-1'],
    })
    state = reduceStrict(state, {
      type: 'RESPOND_DEFENSE',
      playerId: 'cpu-1',
      response: 'counter',
      cardId: 'shuffle-2',
    })
    expect(state.phase.type).not.toBe('draw_card')
    expect(state.pendingDrawId).toBeNull()
    expect(state.players.every((player) => player.hand.length === 5)).toBe(true)
  })

  it('has computer players pick up visibly with their own move', () => {
    let state = fixture({
      manualDraw: true,
      hands: {
        'cpu-1': ['blue-1-a', 'blue-1-b', 'green-3-a', 'purple-4-a', 'orange-4-a'],
        human: ['orange-1-a', 'orange-2-a', 'blue-3-a', 'green-4-a', 'purple-5-a'],
      },
      current: 'cpu-1',
    })
    state = reduceStrict(state, chooseAiAction(state))
    expect(state.phase).toEqual({ type: 'draw_card', playerId: 'cpu-1' })
    expect(chooseAiAction(state)).toEqual({ type: 'DRAW_CARD', playerId: 'cpu-1' })

    state = advanceComputers(state)
    expect(actorId(state)).toBe('human')
    expect(playerById(state, 'cpu-1').hand).toHaveLength(5)
  })

  it('keeps automatic refills for matches that did not opt in', () => {
    let state = fixture({
      hands: {
        human: ['orange-1-a', 'orange-2-a', 'blue-3-a', 'green-4-a', 'purple-5-a'],
        'cpu-1': ['blue-1-a', 'blue-2-a', 'green-3-a', 'purple-4-a', 'skip-1'],
      },
      current: 'human',
    })
    state = reduceStrict(state, { type: 'SELECT_CARD', playerId: 'human', cardId: 'purple-5-a' })
    expect(state.phase.type).toBe('choose_action')
    expect(playerById(state, 'human').hand).toHaveLength(5)
  })

  it('plays full manual-draw matches to completion without losing cards', () => {
    for (let seed = 1; seed <= 20; seed++) {
      let state = reduce(
        { ...fixture({ hands: { human: [], 'cpu-1': [] } }) },
        { type: 'START_MATCH', opponentCount: 3, seed, manualDraw: true },
      )
      state.players = state.players.map((player) => ({ ...player, isHuman: false }))
      for (let step = 0; step < 6000 && state.phase.type !== 'match_over'; step++) {
        if (state.phase.type === 'round_over') {
          state = reduceStrict(state, { type: 'NEXT_ROUND' })
          continue
        }
        state = reduceStrict(state, chooseAiAction(state))
      }
      expect(state.phase.type).toBe('match_over')
    }
  })
})
