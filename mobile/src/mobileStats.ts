import * as SecureStore from 'expo-secure-store'
import { handCards } from '../../src/game/helpers'
import { scoreHand } from '../../src/game/scoring'
import type { Action, GameState } from '../../src/game/types'

const STATS_KEY = 'show-your-hand:mobile-stats:v1'

export type MobileStats = {
  matchesPlayed: number
  wins: number
  roundsWon: number
  attacksPlayed: number
  defensesPlayed: number
  blankDefenses: number
  bestHandPoints: number
}

export const EMPTY_MOBILE_STATS: MobileStats = {
  matchesPlayed: 0,
  wins: 0,
  roundsWon: 0,
  attacksPlayed: 0,
  defensesPlayed: 0,
  blankDefenses: 0,
  bestHandPoints: 0,
}

export async function loadMobileStats(): Promise<MobileStats> {
  try {
    const raw = await SecureStore.getItemAsync(STATS_KEY)
    if (!raw) return EMPTY_MOBILE_STATS
    return { ...EMPTY_MOBILE_STATS, ...(JSON.parse(raw) as Partial<MobileStats>) }
  } catch {
    return EMPTY_MOBILE_STATS
  }
}

export async function saveMobileStats(stats: MobileStats): Promise<void> {
  await SecureStore.setItemAsync(STATS_KEY, JSON.stringify(stats))
}

export async function clearMobileStats(): Promise<void> {
  await SecureStore.deleteItemAsync(STATS_KEY)
}

export function statsAfterAction(
  current: MobileStats,
  before: GameState,
  action: Action,
  after: GameState,
  localId = 'human',
): MobileStats {
  const next = { ...current }
  const attack =
    action.type === 'CONFIRM_ATTACK' ||
    (action.type === 'SELECT_CARD' && before.catalog[action.cardId]?.kind === 'skip')

  if (attack) next.attacksPlayed += 1

  if (action.type === 'RESPOND_DEFENSE' && action.response !== 'accept') {
    next.defensesPlayed += 1
    if (action.response === 'blank') next.blankDefenses += 1
  }

  if (
    action.type === 'RESPOND_REVERSE_BLANK' &&
    action.response === 'blank'
  ) {
    next.defensesPlayed += 1
    next.blankDefenses += 1
  }

  if (
    before.phase.type !== 'round_over' &&
    after.phase.type === 'round_over'
  ) {
    next.bestHandPoints = Math.max(next.bestHandPoints, after.phase.points)
    if (after.phase.winnerId === localId) next.roundsWon += 1
  }

  if (
    before.phase.type !== 'match_over' &&
    after.phase.type === 'match_over'
  ) {
    next.matchesPlayed += 1
    if (after.phase.winnerId === localId) {
      next.wins += 1
      next.roundsWon += 1
    }

    const finalHand = scoreHand(handCards(after, after.phase.winnerId))
    if (finalHand) {
      next.bestHandPoints = Math.max(
        next.bestHandPoints,
        finalHand.points,
      )
    }
  }

  return next
}
