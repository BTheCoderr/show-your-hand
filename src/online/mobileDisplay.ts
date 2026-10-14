import type { GameState } from '../game/types'

/**
 * The App Store's native 1v1 experience deliberately uses fixed seat labels.
 * The web game can still have user-entered names, but the native app must not
 * render those unmoderated strings until reporting/blocking is implemented.
 * This is a display-only projection. Player IDs, cards, turn state and the
 * server-authoritative online protocol stay unchanged.
 */
export function seatLabel(seat: number): string {
  return `PLAYER ${seat + 1}`
}

export function maskNamesForNative(state: GameState): GameState {
  const substitutions = state.players
    .map((player, index) => [player.name, seatLabel(index)] as const)
    .filter(([name]) => name.length > 0)
    .sort((a, b) => b[0].length - a[0].length)

  return {
    ...state,
    players: state.players.map((player, index) => ({
      ...player,
      name: seatLabel(index),
    })),
    history: state.history.map((entry) =>
      substitutions.reduce(
        (result, [name, replacement]) => result.split(name).join(replacement),
        entry,
      ),
    ),
  }
}
