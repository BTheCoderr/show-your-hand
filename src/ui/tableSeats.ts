/**
 * Rotates the table from the viewer's perspective without changing turn order.
 * The next player clockwise is shown on the viewer's left; for four players,
 * the second clockwise seat is directly opposite the viewer.
 */
export function clockwiseOpponents<T extends { id: string }>(
  players: readonly T[],
  viewerId: string,
): T[] {
  const viewerIndex = players.findIndex((player) => player.id === viewerId)
  if (viewerIndex < 0) return players.filter((player) => player.id !== viewerId)
  return [
    ...players.slice(viewerIndex + 1),
    ...players.slice(0, viewerIndex),
  ]
}
