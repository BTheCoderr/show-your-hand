/** Mulberry32 — deterministic, serializable as a single uint32. */
export function nextRandom(state: { rngState: number }): number {
  let t = (state.rngState += 0x6d2b79f5)
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export function shuffleInPlace<T>(items: T[], state: { rngState: number }): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(nextRandom(state) * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
  }
  return items
}

export function seedFrom(value?: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value >>> 0 || 1
  }
  return (Date.now() ^ (Math.floor(Math.random() * 0xffffffff) >>> 0)) >>> 0 || 1
}
