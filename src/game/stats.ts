import type { Action, GameState } from './types'

export type LocalStats = {
  matchesPlayed: number
  wins: number
  roundsWon: number
  attacksPlayed: number
  defensesPlayed: number
  blankDefenses: number
  bestHandPoints: number
}

const KEY = 'show-your-hand:local-stats:v1'

const DEFAULTS: LocalStats = {
  matchesPlayed: 0,
  wins: 0,
  roundsWon: 0,
  attacksPlayed: 0,
  defensesPlayed: 0,
  blankDefenses: 0,
  bestHandPoints: 0,
}

export function loadLocalStats(): LocalStats {
  if (typeof window === 'undefined') return DEFAULTS
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return DEFAULTS
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<LocalStats>) }
  } catch {
    return DEFAULTS
  }
}

function save(stats: LocalStats): LocalStats {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(stats))
  } catch {
    // Stats are an optional enhancement.
  }
  return stats
}

export function recordLocalAction(
  current: LocalStats,
  stateBefore: GameState,
  action: Action,
): LocalStats {
  const next = { ...current }

  const attack =
    action.type === 'CONFIRM_ATTACK' ||
    (action.type === 'SELECT_CARD' && stateBefore.catalog[action.cardId]?.kind === 'skip')
  if (attack) next.attacksPlayed += 1

  if (action.type === 'RESPOND_DEFENSE' && action.response !== 'accept') {
    next.defensesPlayed += 1
    if (action.response === 'blank') next.blankDefenses += 1
  }
  if (action.type === 'RESPOND_REVERSE_BLANK' && action.response === 'blank') {
    next.defensesPlayed += 1
    next.blankDefenses += 1
  }

  return save(next)
}

export function recordLocalOutcome(
  current: LocalStats,
  options: {
    points: number
    wonRound: boolean
    matchOver: boolean
    wonMatch: boolean
  },
): LocalStats {
  const next = { ...current }
  if (options.wonRound) next.roundsWon += 1
  if (options.matchOver) {
    next.matchesPlayed += 1
    if (options.wonMatch) next.wins += 1
  }
  next.bestHandPoints = Math.max(next.bestHandPoints, options.points)
  return save(next)
}
