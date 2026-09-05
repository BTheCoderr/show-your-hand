import { shuffleInPlace } from './rng'
import { scoreHand } from './scoring'
import type { Card, Color, GameState, Player, PlayerId } from './types'

export function cloneState(state: GameState): GameState {
  return structuredClone(state)
}

export function playerById(state: GameState, id: PlayerId): Player {
  const player = state.players.find((item) => item.id === id)
  if (!player) throw new Error(`Unknown player ${id}`)
  return player
}

export function currentPlayer(state: GameState): Player {
  return state.players[state.currentPlayerIndex]
}

export function playerIndex(state: GameState, id: PlayerId): number {
  const index = state.players.findIndex((item) => item.id === id)
  if (index < 0) throw new Error(`Unknown player ${id}`)
  return index
}

export function cardsOf(state: GameState, ids: string[]): Card[] {
  return ids.map((id) => {
    const card = state.catalog[id]
    if (!card) throw new Error(`Unknown card ${id}`)
    return card
  })
}

export function handCards(state: GameState, id: PlayerId): Card[] {
  return cardsOf(state, playerById(state, id).hand)
}

export function clockwiseFrom(state: GameState, startId: PlayerId): Player[] {
  const start = playerIndex(state, startId)
  const ordered: Player[] = []
  for (let i = 0; i < state.players.length; i++) {
    ordered.push(state.players[(start + i) % state.players.length])
  }
  return ordered
}

export function clockwiseOthers(state: GameState, startId: PlayerId): Player[] {
  return clockwiseFrom(state, startId).slice(1)
}

export function nextOpponent(state: GameState, fromId: PlayerId): Player {
  return clockwiseOthers(state, fromId)[0]
}

export function orderTargetsClockwise(
  state: GameState,
  attackerId: PlayerId,
  targetIds: PlayerId[],
): PlayerId[] {
  const wanted = new Set(targetIds)
  return clockwiseOthers(state, attackerId)
    .map((player) => player.id)
    .filter((id) => wanted.has(id))
}

export function nameOf(state: GameState, id: PlayerId): string {
  return playerById(state, id).name
}

export function log(state: GameState, message: string): void {
  state.history = [...state.history, message].slice(-80)
}

export function recycleDiscard(state: GameState): void {
  if (state.drawPile.length > 0) return
  if (state.discardPile.length === 0) return
  state.drawPile = shuffleInPlace([...state.discardPile], state)
  state.discardPile = []
  log(state, 'Draw pile empty — discarded cards were shuffled back in.')
}

export function drawOne(state: GameState): string {
  recycleDiscard(state)
  const id = state.drawPile.shift()
  if (!id) {
    throw new Error('Cannot draw: draw and discard are empty (play-short is disabled).')
  }
  return id
}

export function refillPlayer(state: GameState, player: Player): void {
  while (player.hand.length < 5) {
    player.hand.push(drawOne(state))
  }
}

export function refillAll(state: GameState): void {
  const start = currentPlayer(state)
  for (const player of clockwiseFrom(state, start.id)) {
    refillPlayer(state, player)
  }
  for (const player of state.players) {
    if (player.hand.length !== 5) {
      throw new Error(`${player.name} has ${player.hand.length} cards after refill`)
    }
  }
}

export function spendFromHand(state: GameState, playerId: PlayerId, cardId: string): void {
  const player = playerById(state, playerId)
  const index = player.hand.indexOf(cardId)
  if (index < 0) throw new Error(`${player.name} does not hold ${cardId}`)
  player.hand.splice(index, 1)
  state.discardPile.push(cardId)
}

export function dropColorFromHand(
  state: GameState,
  playerId: PlayerId,
  color: Color,
): string[] {
  const player = playerById(state, playerId)
  const dropped: string[] = []
  const kept: string[] = []
  for (const id of player.hand) {
    const card = state.catalog[id]
    if (card.kind === 'number' && card.color === color) {
      dropped.push(id)
    } else {
      kept.push(id)
    }
  }
  player.hand = kept
  state.discardPile.push(...dropped)
  return dropped
}

export function playerScore(state: GameState, playerId: PlayerId) {
  return scoreHand(handCards(state, playerId))
}

export function firstQualifying(
  state: GameState,
  fromId: PlayerId,
  skipIds: Set<PlayerId> = new Set(),
): Player | null {
  for (const player of clockwiseFrom(state, fromId)) {
    if (skipIds.has(player.id)) continue
    if (playerScore(state, player.id)) return player
  }
  return null
}

