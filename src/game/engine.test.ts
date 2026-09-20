import { describe, expect, it } from 'vitest'
import { advanceComputers, chooseAiAction, isHiddenFromAi, publicView, reduceStrict } from './ai'
import { assertConservation } from './deck'
import { actorId, canDeclare, reduce } from './engine'
import { playerById } from './helpers'
import { fixture } from './testKit'

describe('attacks and defenses', () => {
  it('reveals a Show Your Hand target until the turn ends, and Blank blocks it', () => {
    let state = fixture({
      hands: {
        human: ['show-your-hand-1', 'orange-1-a', 'orange-2-a', 'orange-3-a', 'orange-4-a'],
        'cpu-1': ['blank-01', 'blue-1-a', 'blue-2-a', 'blue-3-a', 'blue-4-a'],
        'cpu-2': ['green-1-a', 'green-2-a', 'green-3-a', 'green-4-a', 'skip-1'],
      },
      current: 'human',
    })
    state = reduceStrict(state, {
      type: 'CONFIRM_ATTACK',
      playerId: 'human',
      cardId: 'show-your-hand-1',
      targetIds: ['cpu-2'],
    })
    expect(state.phase.type).toBe('await_defense')
    state = reduceStrict(state, {
      type: 'RESPOND_DEFENSE',
      playerId: 'cpu-2',
      response: 'accept',
    })
    expect(state.revealedUntilTurnEnd).toContain('cpu-2')
    expect(state.players.every((player) => player.hand.length === 5)).toBe(true)

    state = fixture({
      hands: {
        human: ['show-your-hand-2', 'orange-1-b', 'orange-2-b', 'orange-3-b', 'orange-4-b'],
        'cpu-1': ['blank-02', 'blue-1-b', 'blue-2-b', 'blue-3-b', 'blue-5-a'],
      },
      current: 'human',
    })
    state = reduceStrict(state, {
      type: 'CONFIRM_ATTACK',
      playerId: 'human',
      cardId: 'show-your-hand-2',
      targetIds: ['cpu-1'],
    })
    state = reduceStrict(state, {
      type: 'RESPOND_DEFENSE',
      playerId: 'cpu-1',
      response: 'blank',
      cardId: 'blank-02',
    })
    expect(state.revealedUntilTurnEnd).not.toContain('cpu-1')
    expect(playerById(state, 'cpu-1').hand).not.toContain('blank-02')
  })

  it('drops a named color, lets the attacker claim cards, and supports a reverse', () => {
    let state = fixture({
      hands: {
        human: ['drop-color-1', 'skip-1', 'skip-2', 'blank-03', 'shuffle-1'],
        'cpu-1': ['orange-1-a', 'orange-2-a', 'blue-5-a', 'green-5-a', 'purple-5-a'],
      },
      current: 'human',
    })
    state = reduceStrict(state, {
      type: 'CONFIRM_ATTACK',
      playerId: 'human',
      cardId: 'drop-color-1',
      targetIds: ['cpu-1'],
      color: 'orange',
    })
    state = reduceStrict(state, {
      type: 'RESPOND_DEFENSE',
      playerId: 'cpu-1',
      response: 'accept',
    })
    expect(state.phase.type).toBe('claim_dropped')
    if (state.phase.type === 'claim_dropped') {
      expect(state.phase.claimantId).toBe('human')
      expect(state.phase.cardIds).toEqual(expect.arrayContaining(['orange-1-a', 'orange-2-a']))
    }

    state = reduceStrict(state, {
      type: 'CLAIM_DROPPED',
      playerId: 'human',
      cardIds: ['orange-1-a', 'orange-2-a'],
    })
    expect(state.phase.type).toBe('trim_hand')
    state = reduceStrict(state, {
      type: 'TRIM_HAND',
      playerId: 'human',
      cardIds: ['skip-1'],
    })
    expect(playerById(state, 'human').hand).toContain('orange-1-a')
    expect(playerById(state, 'human').hand).toContain('orange-2-a')
    expect(playerById(state, 'human').hand).toHaveLength(5)
    expect(playerById(state, 'cpu-1').hand).toHaveLength(5)
    assertConservation(state)

    state = fixture({
      hands: {
        human: ['drop-color-2', 'orange-1-b', 'orange-2-b', 'orange-3-a', 'blank-04'],
        'cpu-1': ['drop-color-3', 'blue-1-a', 'blue-2-a', 'blue-3-a', 'blue-4-a'],
      },
      current: 'human',
    })
    state = reduceStrict(state, {
      type: 'CONFIRM_ATTACK',
      playerId: 'human',
      cardId: 'drop-color-2',
      targetIds: ['cpu-1'],
      color: 'blue',
    })
    state = reduceStrict(state, {
      type: 'RESPOND_DEFENSE',
      playerId: 'cpu-1',
      response: 'counter',
      cardId: 'drop-color-3',
    })
    expect(state.phase.type).toBe('choose_reverse_color')
    state = reduceStrict(state, { type: 'CHOOSE_REVERSE_COLOR', playerId: 'cpu-1', color: 'orange' })
    expect(state.phase.type).toBe('await_reverse_blank')
    state = reduceStrict(state, {
      type: 'RESPOND_REVERSE_BLANK',
      playerId: 'human',
      response: 'accept',
    })
    expect(state.phase.type).toBe('claim_dropped')
    if (state.phase.type === 'claim_dropped') {
      expect(state.phase.claimantId).toBe('cpu-1')
      expect(state.phase.targetId).toBe('human')
    }
    state = reduceStrict(state, {
      type: 'CLAIM_DROPPED',
      playerId: 'cpu-1',
      cardIds: [],
    })
    expect(
      playerById(state, 'human').hand.some((id) => {
        const card = state.catalog[id]
        return card.kind === 'number' && card.color === 'orange'
      }),
    ).toBe(false)
    expect(playerById(state, 'cpu-1').hand.filter((id) => id.startsWith('blue-')).length).toBeGreaterThan(0)
  })
  it('cancels Skip on Blank or counter and does not steal the turn', () => {
    let state = fixture({
      hands: {
        human: ['skip-1', 'orange-5-a', 'blue-5-b', 'green-5-b', 'purple-5-b'],
        'cpu-1': ['skip-2', 'blank-05', 'orange-1-a', 'blue-1-a', 'green-1-a'],
        'cpu-2': ['shuffle-2', 'drop-color-4', 'orange-2-a', 'blue-2-a', 'green-2-a'],
      },
      current: 'human',
    })
    state = reduceStrict(state, { type: 'SELECT_CARD', playerId: 'human', cardId: 'skip-1' })
    state = reduceStrict(state, {
      type: 'RESPOND_DEFENSE',
      playerId: 'cpu-1',
      response: 'counter',
      cardId: 'skip-2',
    })
    expect(state.skippedPlayerId).toBeNull()
    expect(state.phase.type).toBe('choose_action')
    expect(state.players[state.currentPlayerIndex].id).toBe('cpu-1')
  })

  it('resolves two-target Shuffle after all responses, with Blank and backfire rules', () => {
    const before = fixture({
      hands: {
        human: ['shuffle-1', 'orange-5-b', 'blue-5-a', 'green-5-a', 'purple-4-a'],
        'cpu-1': ['blank-06', 'orange-1-a', 'orange-2-a', 'orange-3-a', 'orange-4-a'],
        'cpu-2': ['shuffle-2', 'blue-1-a', 'blue-2-a', 'blue-3-a', 'blue-4-a'],
      },
      current: 'human',
      seed: 99,
    })
    const cpu1Before = [...playerById(before, 'cpu-1').hand]
    const cpu2Before = [...playerById(before, 'cpu-2').hand]
    const humanBefore = [...playerById(before, 'human').hand]

    let state = reduceStrict(before, {
      type: 'CONFIRM_ATTACK',
      playerId: 'human',
      cardId: 'shuffle-1',
      targetIds: ['cpu-1', 'cpu-2'],
    })
    expect(state.phase.type).toBe('await_defense')
    expect((state.phase as { responderId: string }).responderId).toBe('cpu-1')
    expect(playerById(state, 'cpu-2').hand).toEqual(cpu2Before)

    state = reduceStrict(state, {
      type: 'RESPOND_DEFENSE',
      playerId: 'cpu-1',
      response: 'blank',
      cardId: 'blank-06',
    })
    expect(state.phase.type).toBe('await_defense')
    expect(playerById(state, 'cpu-1').hand).not.toContain('blank-06')
    expect(playerById(state, 'cpu-2').hand).toEqual(cpu2Before)

    state = reduceStrict(state, {
      type: 'RESPOND_DEFENSE',
      playerId: 'cpu-2',
      response: 'counter',
      cardId: 'shuffle-2',
    })

    const cpu1After = playerById(state, 'cpu-1').hand
    const keptCore = cpu1Before.filter((id) => id !== 'blank-06')
    expect(keptCore.every((id) => cpu1After.includes(id))).toBe(true)
    expect(playerById(state, 'cpu-2').hand).not.toEqual(cpu2Before.filter((id) => id !== 'shuffle-2'))
    expect(playerById(state, 'human').hand).not.toEqual(humanBefore.filter((id) => id !== 'shuffle-1'))
    expect(playerById(state, 'human').hand).not.toContain('shuffle-1')
    expect(playerById(state, 'cpu-2').hand).not.toContain('shuffle-2')
    expect(state.players.every((player) => player.hand.length === 5)).toBe(true)
    assertConservation(state)
  })

  it('shuffles an unprotected original target even when the other target counters', () => {
    const before = fixture({
      hands: {
        human: ['shuffle-3', 'orange-1-b', 'blue-1-b', 'green-1-b', 'purple-1-a'],
        'cpu-1': ['purple-2-a', 'purple-3-a', 'purple-4-b', 'purple-5-a', 'skip-3'],
        'cpu-2': ['shuffle-4', 'green-2-b', 'green-3-b', 'green-4-b', 'green-5-b'],
      },
      current: 'human',
      seed: 3,
    })
    const exposed = [...playerById(before, 'cpu-1').hand]
    let state = reduceStrict(before, {
      type: 'CONFIRM_ATTACK',
      playerId: 'human',
      cardId: 'shuffle-3',
      targetIds: ['cpu-1', 'cpu-2'],
    })
    state = reduceStrict(state, {
      type: 'RESPOND_DEFENSE',
      playerId: 'cpu-1',
      response: 'accept',
    })
    state = reduceStrict(state, {
      type: 'RESPOND_DEFENSE',
      playerId: 'cpu-2',
      response: 'counter',
    })
    expect(playerById(state, 'cpu-1').hand.some((id) => !exposed.includes(id))).toBe(true)
    expect(playerById(state, 'human').hand).toHaveLength(5)
    expect(playerById(state, 'cpu-2').hand).toHaveLength(5)
  })
})

describe('table flow', () => {
  it('lets the next player pick up only the top numbered discard before playing', () => {
    let state = fixture({
      hands: {
        human: ['orange-1-a', 'blue-2-a', 'green-3-a', 'purple-4-a', 'blank-07'],
        'cpu-1': ['blue-1-a', 'blue-2-b', 'blue-3-a', 'blue-4-a', 'blue-5-a'],
      },
      current: 'human',
      discard: ['green-5-a'],
    })
    state = reduceStrict(state, { type: 'TAKE_DISCARD', playerId: 'human' })
    expect(playerById(state, 'human').hand).toHaveLength(6)
    expect(playerById(state, 'human').hand).toContain('green-5-a')
    expect(state.discardPile).not.toContain('green-5-a')

    state = reduceStrict(state, {
      type: 'SELECT_CARD',
      playerId: 'human',
      cardId: 'blank-07',
    })
    expect(playerById(state, 'human').hand).toHaveLength(5)
    expect(playerById(state, 'human').hand).toContain('green-5-a')
    expect(state.players[state.currentPlayerIndex].id).toBe('cpu-1')
    assertConservation(state)
  })

  it('does not allow a special card on top of the discard pile to be picked up', () => {
    const state = fixture({
      hands: {
        human: ['orange-1-a', 'orange-2-a', 'orange-3-a', 'orange-4-a', 'orange-5-a'],
        'cpu-1': ['blue-1-a', 'blue-2-a', 'blue-3-a', 'blue-4-a', 'blue-5-a'],
      },
      current: 'human',
      discard: ['skip-1'],
    })
    expect(() => reduceStrict(state, { type: 'TAKE_DISCARD', playerId: 'human' })).toThrow(
      'Only the top numbered discard can be picked up',
    )
  })
  it('recycles the discard pile instead of playing short', () => {
    const state0 = fixture({
      hands: {
        human: ['orange-1-a', 'orange-2-a', 'orange-3-a', 'orange-4-a', 'blank-07'],
        'cpu-1': ['blue-1-a', 'blue-2-a', 'blue-3-a', 'blue-4-a', 'blue-5-a'],
      },
      current: 'human',
      draw: [],
      discard: ['green-1-a', 'green-2-a', 'green-3-a', 'green-4-a', 'green-5-a'],
    })
    const next = reduceStrict(state0, {
      type: 'SELECT_CARD',
      playerId: 'human',
      cardId: 'blank-07',
    })
    expect(next.players.every((player) => player.hand.length === 5)).toBe(true)
    expect(next.history.some((line) => line.includes('shuffled back'))).toBe(true)
    assertConservation(next)
  })

  it('gives declaration priority to the active player, then clockwise', () => {
    const state = fixture({
      hands: {
        human: ['orange-1-a', 'blue-2-a', 'green-3-a', 'purple-4-a', 'orange-5-a'],
        'cpu-1': ['blue-1-a', 'blue-2-b', 'blue-3-a', 'blue-4-a', 'blue-5-a'],
        'cpu-2': ['green-1-a', 'green-2-a', 'green-3-b', 'green-4-a', 'green-5-a'],
      },
      current: 'human',
    })
    expect(canDeclare(state, 'human')).toBe(true)
    const declared = reduceStrict(state, { type: 'DECLARE', playerId: 'human' })
    expect(declared.phase.type).toBe('round_over')
    if (declared.phase.type === 'round_over') {
      expect(declared.phase.winnerId).toBe('human')
      expect(declared.phase.points).toBe(1)
    }
    expect(playerById(declared, 'cpu-1').score).toBe(0)
  })

  it('lets a later player declare if the active player passes the window', () => {
    let state = fixture({
      hands: {
        human: ['orange-1-a', 'orange-2-a', 'orange-3-a', 'orange-4-a', 'blank-08'],
        'cpu-1': ['purple-1-a', 'purple-2-a', 'purple-3-a', 'purple-4-a', 'purple-5-a'],
      },
      current: 'human',
      draw: ['skip-1'],
    })
    state = reduceStrict(state, { type: 'SELECT_CARD', playerId: 'human', cardId: 'blank-08' })
    expect(state.phase.type).toBe('round_over')
    if (state.phase.type === 'round_over') {
      expect(state.phase.winnerId).toBe('cpu-1')
      expect(state.phase.points).toBe(4)
    }
  })

  it('resets the round with all 70 cards and rotates the starter', () => {
    let state = fixture({
      hands: {
        human: ['orange-1-a', 'blue-2-a', 'green-3-a', 'purple-4-a', 'orange-5-a'],
        'cpu-1': ['blank-09', 'skip-4', 'shuffle-5', 'drop-color-5', 'show-your-hand-3'],
      },
      current: 'human',
      scores: { human: 1, 'cpu-1': 0 },
    })
    state = reduceStrict(state, { type: 'DECLARE', playerId: 'human' })
    expect(state.phase.type).toBe('round_over')
    const starter = state.roundStarterIndex
    state = reduceStrict(state, { type: 'NEXT_ROUND' })
    expect(state.phase.type).toBe('choose_action')
    expect(state.roundStarterIndex).toBe((starter + 1) % 2)
    expect(state.players.every((player) => player.hand.length === 5)).toBe(true)
    expect(playerById(state, 'human').score).toBe(2)
    assertConservation(state)
  })

  it('ends the match when a player reaches 5 points', () => {
    const state = fixture({
      hands: {
        human: ['green-1-a', 'green-2-a', 'green-3-a', 'green-4-a', 'green-5-a'],
        'cpu-1': ['blank-10', 'skip-5', 'show-your-hand-4', 'show-your-hand-5', 'drop-color-1'],
      },
      current: 'human',
      scores: { human: 2, 'cpu-1': 1 },
    })
    const next = reduceStrict(state, { type: 'DECLARE', playerId: 'human' })
    expect(next.phase.type).toBe('match_over')
    if (next.phase.type === 'match_over') expect(next.phase.winnerId).toBe('human')
    expect(playerById(next, 'human').score).toBe(6)
  })
})

describe('computer players', () => {
  it('only issues legal moves and never reads hidden hands', () => {
    let state = reduce(
      fixture({ hands: { human: [], 'cpu-1': [], 'cpu-2': [] } }),
      { type: 'START_MATCH', opponentCount: 2, seed: 2026 },
    )
    const humanCard = playerById(state, 'human').hand.find((id) => {
      const kind = state.catalog[id].kind
      return kind === 'number' || kind === 'blank'
    })
    expect(humanCard).toBeTruthy()
    state = reduceStrict(state, { type: 'SELECT_CARD', playerId: 'human', cardId: humanCard! })
    const hidden = [...playerById(state, 'human').hand]
    state = advanceComputers(state)
    const view = publicView(state, 'cpu-1')
    expect(view.revealedHands.human).toBeUndefined()
    expect(isHiddenFromAi(state, 'cpu-1', 'human')).toBe(true)
    expect(hidden).toEqual(playerById(state, 'human').hand)
  })

  it('plays complete seeded matches with only legal computer actions', () => {
    for (const seed of [1, 8, 21, 44, 90]) {
      let state = reduce(fixture({ hands: { human: [] } }), {
        type: 'START_MATCH',
        opponentCount: 1,
        seed,
      })
      let guard = 0
      while (state.phase.type !== 'match_over' && guard < 400) {
        guard += 1
        if (state.phase.type === 'round_over') {
          state = reduceStrict(state, { type: 'NEXT_ROUND' })
          continue
        }
        const actor = actorId(state)
        if (actor === 'human') {
          if (canDeclare(state, 'human')) {
            state = reduceStrict(state, { type: 'DECLARE', playerId: 'human' })
            continue
          }
          if (state.phase.type === 'claim_dropped') {
            state = reduceStrict(state, {
              type: 'CLAIM_DROPPED',
              playerId: 'human',
              cardIds: [],
            })
            continue
          }
          if (state.phase.type === 'trim_hand') {
            const excess = playerById(state, 'human').hand.length - 5
            state = reduceStrict(state, {
              type: 'TRIM_HAND',
              playerId: 'human',
              cardIds: playerById(state, 'human').hand.slice(0, excess),
            })
            continue
          }
          if (state.phase.type === 'await_defense') {
            state = reduceStrict(state, {
              type: 'RESPOND_DEFENSE',
              playerId: 'human',
              response: 'accept',
            })
            continue
          }
          if (state.phase.type === 'choose_reverse_color') {
            state = reduceStrict(state, {
              type: 'CHOOSE_REVERSE_COLOR',
              playerId: 'human',
              color: 'orange',
            })
            continue
          }
          if (state.phase.type === 'await_reverse_blank') {
            state = reduceStrict(state, {
              type: 'RESPOND_REVERSE_BLANK',
              playerId: 'human',
              response: 'accept',
            })
            continue
          }
          if (state.phase.type === 'may_declare') {
            state = reduceStrict(state, { type: 'PASS_DECLARE', playerId: 'human' })
            continue
          }
          if (state.phase.type === 'review_hands') {
            state = reduceStrict(state, { type: 'CONTINUE' })
            continue
          }
          const discard = playerById(state, 'human').hand.find((id) => {
            const kind = state.catalog[id].kind
            return kind === 'number' || kind === 'blank'
          }) ?? playerById(state, 'human').hand[0]
          const kind = state.catalog[discard].kind
          if (kind === 'number' || kind === 'blank') {
            state = reduceStrict(state, { type: 'SELECT_CARD', playerId: 'human', cardId: discard })
          } else if (kind === 'skip') {
            state = reduceStrict(state, { type: 'SELECT_CARD', playerId: 'human', cardId: discard })
          } else if (kind === 'shuffle' || kind === 'show-your-hand' || kind === 'drop-color') {
            state = reduceStrict(state, {
              type: 'CONFIRM_ATTACK',
              playerId: 'human',
              cardId: discard,
              targetIds: ['cpu-1'],
              color: kind === 'drop-color' ? 'blue' : undefined,
            })
          }
        } else if (actor) {
          state = reduceStrict(state, chooseAiAction(state))
        } else {
          throw new Error(`Stuck in phase ${state.phase.type}`)
        }
        assertConservation(state)
        if (
          state.phase.type === 'choose_action' ||
          state.phase.type === 'may_declare' ||
          state.phase.type === 'review_hands' ||
          state.phase.type === 'round_over' ||
          state.phase.type === 'match_over'
        ) {
          expect(state.players.every((player) => player.hand.length === 5)).toBe(true)
        }
      }
      expect(state.phase.type).toBe('match_over')
    }
  })
})
