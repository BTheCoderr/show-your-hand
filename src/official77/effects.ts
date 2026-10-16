import type { Card77, RegularColor } from './types'

/**
 * The 77-card Skip can ONLY be stopped by Blank. A second Skip is not valid
 * defense. Pure predicates, ready for client + authoritative Edge integration.
 */
export function canStopSkip77(defenderCard: Card77 | null): boolean {
  return defenderCard?.kind === 'blank'
}

/**
 * Purple and Wild are explicitly immune to Drop Color. Only the selected
 * ordinary numbered color is forced out of the target's hand.
 */
export function forcedDropColor77(
  cards: readonly Card77[],
  color: RegularColor,
): { dropped: Card77[]; retained: Card77[] } {
  const dropped: Card77[] = []
  const retained: Card77[] = []
  for (const card of cards) {
    if (card.kind === 'number' && card.color === color) dropped.push(card)
    else retained.push(card)
  }
  return { dropped, retained }
}

export type ShuffleDefense77 = 'accept' | 'blank' | 'shuffle'
export type ShuffleResolution77 = {
  cancelledOriginalAttack: boolean
  redirectedToAttacker: boolean
  affectedPlayerIds: string[]
}

/**
 * Approved two-target Shuffle defense and reversal resolution.
 * - Blank protects ONLY the responding player.
 * - A responding Shuffle cancels the original attack for EVERY target and
 *   redirects it ONLY to the original attacker (who may defend with Blank).
 * - The target list is in the clockwise order chosen by the caller.
 *
 * This decides targets only; it does not itself redeal or introduce new
 * response windows. Those remain the authoritative engine's responsibility.
 */
export function resolveShuffleTargets77({
  attackerId,
  targetIds,
  responses,
  attackerBlocksReversal = false,
}: {
  attackerId: string
  targetIds: readonly string[]
  responses: Readonly<Record<string, ShuffleDefense77>>
  attackerBlocksReversal?: boolean
}): ShuffleResolution77 {
  if (targetIds.length < 1 || targetIds.length > 2) {
    throw new Error('Shuffle must target one or two players')
  }
  if (new Set(targetIds).size !== targetIds.length || targetIds.includes(attackerId)) {
    throw new Error('Shuffle has an invalid or duplicate target')
  }
  for (const target of targetIds) {
    if (!responses[target]) throw new Error(`Missing Shuffle defense response: ${target}`)
  }

  const reversed = targetIds.some((target) => responses[target] === 'shuffle')
  if (reversed) {
    return {
      cancelledOriginalAttack: true,
      redirectedToAttacker: true,
      affectedPlayerIds: attackerBlocksReversal ? [] : [attackerId],
    }
  }

  return {
    cancelledOriginalAttack: false,
    redirectedToAttacker: false,
    affectedPlayerIds: targetIds.filter((target) => responses[target] !== 'blank'),
  }
}
