/**
 * Casino furniture dimensions shared with React Native, not screen-filling felt.
 *
 * The drawn table MUST be wider than it is tall in portrait and landscape.
 * The player's cards and action controls sit outside the actual felt.
 */
export function casinoTableDimensions(screenWidth: number) {
  if (!Number.isFinite(screenWidth) || screenWidth < 240) {
    throw new RangeError('Expected a supported mobile viewport width')
  }
  const tablet = screenWidth >= 768
  const width = Math.min(screenWidth - (tablet ? 32 : 12), tablet ? 900 : 520)
  const height = Math.round(width * (tablet ? 0.66 : 0.78))
  return {
    width,
    height,
    tablet,
    railRadius: Math.round(height / 2),
  } as const
}
