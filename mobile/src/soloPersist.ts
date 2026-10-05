import * as SecureStore from 'expo-secure-store'
import type { GameState } from '../../src/game/types'

const SOLO_SAVE_META_KEY = 'show-your-hand:mobile-solo-save:v1:meta'
const SOLO_SAVE_CHUNK_PREFIX = 'show-your-hand:mobile-solo-save:v1:chunk:'
const CHUNK_SIZE = 1500

export type SoloSave = {
  game: GameState
  opponentCount: 1 | 2 | 3 | 4 | 5
  beginnerMode: boolean
  updatedAt: string
}

type SoloSaveMeta = {
  chunks: number
}

async function readSerialized(): Promise<string | null> {
  const metaRaw = await SecureStore.getItemAsync(SOLO_SAVE_META_KEY)
  if (!metaRaw) return null

  const meta = JSON.parse(metaRaw) as SoloSaveMeta
  if (!Number.isInteger(meta.chunks) || meta.chunks < 1 || meta.chunks > 200) {
    return null
  }

  const parts = await Promise.all(
    Array.from({ length: meta.chunks }, (_, index) =>
      SecureStore.getItemAsync(`${SOLO_SAVE_CHUNK_PREFIX}${index}`),
    ),
  )

  if (parts.some((part) => part === null)) return null
  return parts.join('')
}

export async function loadSoloSave(): Promise<SoloSave | null> {
  try {
    const raw = await readSerialized()
    if (!raw) return null

    const parsed = JSON.parse(raw) as SoloSave
    if (
      !parsed.game ||
      parsed.game.version !== 1 ||
      !parsed.opponentCount ||
      parsed.opponentCount < 1 ||
      parsed.opponentCount > 5
    ) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

export async function saveSoloSave(save: SoloSave): Promise<void> {
  const serialized = JSON.stringify(save)
  const chunks = Array.from(
    { length: Math.ceil(serialized.length / CHUNK_SIZE) },
    (_, index) =>
      serialized.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE),
  )

  const previousMetaRaw = await SecureStore.getItemAsync(SOLO_SAVE_META_KEY)
  const previousChunks = previousMetaRaw
    ? (JSON.parse(previousMetaRaw) as SoloSaveMeta).chunks
    : 0

  await Promise.all(
    chunks.map((chunk, index) =>
      SecureStore.setItemAsync(
        `${SOLO_SAVE_CHUNK_PREFIX}${index}`,
        chunk,
      ),
    ),
  )

  if (previousChunks > chunks.length) {
    await Promise.all(
      Array.from(
        { length: previousChunks - chunks.length },
        (_, offset) =>
          SecureStore.deleteItemAsync(
            `${SOLO_SAVE_CHUNK_PREFIX}${chunks.length + offset}`,
          ),
      ),
    )
  }

  await SecureStore.setItemAsync(
    SOLO_SAVE_META_KEY,
    JSON.stringify({ chunks: chunks.length } satisfies SoloSaveMeta),
  )
}

export async function clearSoloSave(): Promise<void> {
  try {
    const metaRaw = await SecureStore.getItemAsync(SOLO_SAVE_META_KEY)
    const chunks = metaRaw
      ? (JSON.parse(metaRaw) as SoloSaveMeta).chunks
      : 0

    await Promise.all(
      Array.from({ length: Math.max(0, chunks) }, (_, index) =>
        SecureStore.deleteItemAsync(`${SOLO_SAVE_CHUNK_PREFIX}${index}`),
      ),
    )
  } finally {
    await SecureStore.deleteItemAsync(SOLO_SAVE_META_KEY)
  }
}
