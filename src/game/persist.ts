import type { GameState } from './types'

export const STORAGE_KEY = 'syh-match-v1'

export function saveMatch(state: GameState): void {
  if (typeof localStorage === 'undefined') return
  if (state.phase.type === 'menu') {
    localStorage.removeItem(STORAGE_KEY)
    return
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function loadMatch(): GameState | null {
  if (typeof localStorage === 'undefined') return null
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as GameState
    if (parsed.version !== 1 || !parsed.catalog || !Array.isArray(parsed.players)) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function clearMatch(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}
