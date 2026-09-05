import { describe, expect, it } from 'vitest'
import { chooseAiAction, reduceStrict } from './ai'
import { actorId, canDeclare, reduce } from './engine'
import { playerById } from './helpers'
import { fixture } from './testKit'

function playUntil(state: ReturnType<typeof reduce>, done: (s: typeof state) => boolean, limit = 250) {
  let current = state
  for (let i = 0; i < limit && !done(current); i++) {
    if (current.phase.type === 'round_over') {
      current = reduceStrict(current, { type: 'NEXT_ROUND' })
      continue
    }
    const actor = actorId(current)
    if (actor === 'human') {
      if (current.phase.type === 'review_hands') {
        current = reduceStrict(current, { type: 'CONTINUE' })
        continue
      }
      if (current.phase.type === 'await_defense') {
        const attackKind = current.phase.attack.kind
        const hand = playerById(current, 'human').hand.map((id) => current.catalog[id])
        const response = hand.some((card) => card.kind === attackKind)
          ? 'counter'
          : hand.some((card) => card.kind === 'blank')
            ? 'blank'
            : 'accept'
        current = reduceStrict(current, {
          type: 'RESPOND_DEFENSE',
          playerId: 'human',
          response,
        })
        continue
      }
      if (current.phase.type === 'choose_reverse_color') {
        current = reduceStrict(current, {
          type: 'CHOOSE_REVERSE_COLOR',
          playerId: 'human',
          color: 'orange',
        })
        continue
      }
      if (current.phase.type === 'await_reverse_blank') {
        current = reduceStrict(current, {
          type: 'RESPOND_REVERSE_BLANK',
          playerId: 'human',
          response: 'accept',
        })
        continue
      }
      if (canDeclare(current, 'human')) {
        current = reduceStrict(current, { type: 'DECLARE', playerId: 'human' })
        continue
      }
      if (current.phase.type === 'may_declare') {
        current = reduceStrict(current, { type: 'DECLARE', playerId: 'human' })
        continue
      }
      const junk = playerById(current, 'human').hand.find((id) => {
        const kind = current.catalog[id].kind
        return kind === 'number' || kind === 'blank'
      })
      if (junk) {
        current = reduceStrict(current, { type: 'SELECT_CARD', playerId: 'human', cardId: junk })
        continue
      }
      const card = playerById(current, 'human').hand[0]
      const kind = current.catalog[card].kind
      if (kind === 'skip') {
        current = reduceStrict(current, { type: 'SELECT_CARD', playerId: 'human', cardId: card })
      } else {
        current = reduceStrict(current, {
          type: 'CONFIRM_ATTACK',
          playerId: 'human',
          cardId: card,
          targetIds: current.players.filter((player) => !player.isHuman).map((player) => player.id).slice(0, 1),
          color: kind === 'drop-color' ? 'green' : undefined,
        })
      }
    } else if (actor) {
      current = reduceStrict(current, chooseAiAction(current))
    } else {
      throw new Error(`stuck: ${current.phase.type}`)
    }
  }
  return current
}

describe('scripted playthrough', () => {
  it('completes an attack/counter and a match victory', () => {
    let state = fixture({
      hands: {
        human: ['skip-1', 'orange-1-a', 'blue-1-a', 'green-1-a', 'purple-1-a'],
        'cpu-1': ['skip-2', 'orange-2-a', 'blue-2-a', 'green-2-a', 'purple-2-a'],
      },
      current: 'human',
    })
    state = reduceStrict(state, { type: 'SELECT_CARD', playerId: 'human', cardId: 'skip-1' })
    expect(state.phase.type).toBe('await_defense')
    state = reduceStrict(state, {
      type: 'RESPOND_DEFENSE',
      playerId: 'cpu-1',
      response: 'counter',
    })
    expect(state.skippedPlayerId).toBeNull()
    expect(state.history.some((line) => line.includes('Skip is cancelled'))).toBe(true)

    state = reduce(
      fixture({ hands: { human: [] } }),
      { type: 'START_MATCH', opponentCount: 1, seed: 21 },
    )
    state = playUntil(state, (item) => item.phase.type === 'match_over', 400)
    expect(state.phase.type).toBe('match_over')
    if (state.phase.type === 'match_over') {
      const winner = playerById(state, state.phase.winnerId)
      expect(winner.score).toBeGreaterThanOrEqual(5)
    }
  })
})
