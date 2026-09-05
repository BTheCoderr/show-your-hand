import { createCatalog, allCardIds } from './deck'
import { playerIndex } from './helpers'
import { seedFrom } from './rng'
import type { GameState, Phase, Player } from './types'
import { MATCH_POINT_GOAL } from './types'

export function fixture(options: {
  hands: Record<string, string[]>
  draw?: string[]
  discard?: string[]
  current?: string
  phase?: Phase
  scores?: Record<string, number>
  revealed?: string[]
  seed?: number
  testMode?: boolean
}): GameState {
  const names: Record<string, string> = { human: 'You' }
  const ids = Object.keys(options.hands)
  const players: Player[] = ids.map((id, index) => ({
    id,
    name: names[id] ?? `CPU ${index}`,
    isHuman: id === 'human',
    hand: [...options.hands[id]],
    score: options.scores?.[id] ?? 0,
  }))

  const catalog = createCatalog()
  const used = new Set([
    ...players.flatMap((player) => player.hand),
    ...(options.draw ?? []),
    ...(options.discard ?? []),
  ])
  const leftover = allCardIds(catalog).filter((id) => !used.has(id))
  const drawPile =
    options.draw === undefined
      ? leftover
      : options.draw.length === 0
        ? []
        : [...options.draw, ...leftover.filter((id) => !options.draw!.includes(id))]
  const discardPile =
    options.draw !== undefined && options.draw.length === 0
      ? [...(options.discard ?? []), ...leftover]
      : [...(options.discard ?? [])]
  const currentId = options.current ?? players[0].id

  const state: GameState = {
    version: 1,
    catalog,
    players,
    drawPile,
    discardPile,
    currentPlayerIndex: playerIndex({ players } as GameState, currentId),
    roundStarterIndex: playerIndex({ players } as GameState, currentId),
    skippedPlayerId: null,
    phase: options.phase ?? { type: 'choose_action' },
    revealedUntilTurnEnd: [...(options.revealed ?? [])],
    history: [],
    testMode: options.testMode ?? false,
    matchPointGoal: MATCH_POINT_GOAL,
    rngState: seedFrom(options.seed ?? 7),
    selectedCardId: null,
  }
  return state
}
