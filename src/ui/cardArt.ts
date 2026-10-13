/** Display-only art upgrade. Keep engine card IDs and legacy server art paths unchanged. */
const numberedArt = /^\/cards\/(orange|green|purple)-([1-5])\.png$/
const specialArt = /^\/cards\/(blank|show-your-hand|drop-color|skip)\.png$/

/**
 * Return the new artwork for compatible cards. Old solo saves and live online
 * rooms still contain legacy .png art paths, so resolve only at render time.
 *
 * Blue number cards and Shuffle deliberately retain their original artwork.
 * The new red/yellow/Wild pictures are not in the current 70-card deck.
 */
export function resolveCardArt(art: string): string {
  if (art === '/cards/back.png') return '/cards/v2/back.jpeg'

  const numbered = numberedArt.exec(art)
  if (numbered) return `/cards/v2/${numbered[1]}-${numbered[2]}.jpeg`

  const special = specialArt.exec(art)
  if (special) return `/cards/v2/${special[1]}.jpeg`

  return art
}
