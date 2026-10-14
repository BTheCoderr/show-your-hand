/**
 * Canonical poker-table seating geometry shared by web and native.
 * The local human stays at bottom-center; opponents go clockwise around an
 * oval arc from lower-left, over the top, to lower-right.
 *
 * x and y are normalized positions of the CENTER of a seat, relative to the
 * green felt. The visual layer, not the engine, scales to a phone/tablet.
 * This does not turn on team gameplay.
 */
export type TableSeatPosition = Readonly<{ x: number; y: number }>

const ANGLE_BOUNDS: Record<number, readonly [number, number]> = {
  1: [270, 270],
  2: [225, 315],
  3: [190, 350],
  4: [185, 355],
  5: [180, 360],
}

/**
 * Seats are symmetric around the table's vertical centerline. Limiting the
 * horizontal radius keeps complete opponent card fans inside narrow phones.
 */
export function opponentSeatPosition(
  index: number,
  opponentCount: number,
): TableSeatPosition {
  const bounds = ANGLE_BOUNDS[opponentCount]
  if (!bounds || !Number.isInteger(index) || index < 0 || index >= opponentCount) {
    throw new RangeError('Expected an opponent seat in a 2–6-player table')
  }

  const [start, end] = bounds
  const angle = opponentCount === 1
    ? start
    : start + (end - start) * index / (opponentCount - 1)
  const radians = angle * Math.PI / 180
  const horizontalRadius = opponentCount <= 3 ? 0.27 : 0.32
  const x = 0.5 + horizontalRadius * Math.cos(radians)
  const y = 0.43 + 0.29 * Math.sin(radians)
  return { x, y }
}

/** In future four-player team mode, a teammate is seated directly opposite. */
export function teammateSeatIndex(opponentCount: number): number | null {
  return opponentCount === 3 ? 1 : null
}
