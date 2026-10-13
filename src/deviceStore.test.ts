import { describe, expect, it } from 'vitest'
import {
  MOBILE_STORAGE_KEYS,
  deleteSecureItem,
  getSecureItem,
  secureStoreKey,
  setSecureItem,
  type SecureStoreBackend,
} from './deviceStore'

const VALID_KEY = /^[A-Za-z0-9._-]+$/

const APP_KEYS = [
  MOBILE_STORAGE_KEYS.session,
  MOBILE_STORAGE_KEYS.prefs,
  MOBILE_STORAGE_KEYS.stats,
  MOBILE_STORAGE_KEYS.soloMeta,
  `${MOBILE_STORAGE_KEYS.soloChunk}0`,
  `${MOBILE_STORAGE_KEYS.soloChunk}12`,
]

function memoryStore(seed: Record<string, string> = {}, permissive = false) {
  const items = new Map(Object.entries(seed))
  const seen: string[] = []
  const reject = (key: string) => {
    if (!permissive && !VALID_KEY.test(key)) {
      throw new Error(
        'Invalid key provided to SecureStore. Keys must not be empty and contain only alphanumeric characters, ".", "-", and "_".',
      )
    }
  }
  const store: SecureStoreBackend = {
    async getItemAsync(key) {
      seen.push(key)
      reject(key)
      return items.get(key) ?? null
    },
    async setItemAsync(key, value) {
      seen.push(key)
      reject(key)
      items.set(key, value)
    },
    async deleteItemAsync(key) {
      seen.push(key)
      reject(key)
      items.delete(key)
    },
  }
  return { store, items, seen }
}

describe('SecureStore keys', () => {
  it('turns every app key into a non-empty key iOS accepts', () => {
    const sanitized = APP_KEYS.map(secureStoreKey)
    for (const key of sanitized) expect(key).toMatch(VALID_KEY)
    expect(new Set(sanitized).size).toBe(sanitized.length)
  })

  it('identifies the Online 1v1 key and its stored form', () => {
    expect(MOBILE_STORAGE_KEYS.session).toBe('show-your-hand:mobile-online-session:v1')
    expect(secureStoreKey(MOBILE_STORAGE_KEYS.session)).toBe(
      'show-your-hand_mobile-online-session_v1',
    )
  })

  it('rejects an empty key before touching storage', async () => {
    const { store, seen } = memoryStore()
    await expect(setSecureItem('', 'x', store)).rejects.toThrow(/empty/)
    await expect(getSecureItem('', store)).rejects.toThrow(/empty/)
    expect(seen).toEqual([])
  })

  it('replaces unsupported characters instead of storing them', async () => {
    const { store, items, seen } = memoryStore()
    await setSecureItem('***', 'x', store)
    expect(items.get('___')).toBe('x')
    expect(seen).toEqual(['___'])
  })
})

describe('SecureStore save, load, and delete', () => {
  it('round-trips a value and only uses valid keys', async () => {
    const { store, items, seen } = memoryStore()
    await setSecureItem(MOBILE_STORAGE_KEYS.session, 'seat-secret', store)
    expect(await getSecureItem(MOBILE_STORAGE_KEYS.session, store)).toBe('seat-secret')
    expect(items.has('show-your-hand_mobile-online-session_v1')).toBe(true)
    expect(items.has(MOBILE_STORAGE_KEYS.session)).toBe(false)

    await deleteSecureItem(MOBILE_STORAGE_KEYS.session, store)
    expect(await getSecureItem(MOBILE_STORAGE_KEYS.session, store)).toBeNull()
    expect(seen.filter((key) => !VALID_KEY.test(key))).toEqual([MOBILE_STORAGE_KEYS.session])
    expect(items.has(MOBILE_STORAGE_KEYS.session)).toBe(false)
  })

  it('keeps a saved online seat so the player can reconnect', async () => {
    const { store } = memoryStore()
    const seat = {
      roomId: 'room-1',
      roomCode: 'AE1234',
      playerToken: 'token-secret',
      gamePlayerId: 'human',
    }
    await setSecureItem(MOBILE_STORAGE_KEYS.session, JSON.stringify(seat), store)

    const restored = JSON.parse((await getSecureItem(MOBILE_STORAGE_KEYS.session, store)) ?? '{}')
    expect(restored).toEqual(seat)

    await deleteSecureItem(MOBILE_STORAGE_KEYS.session, store)
    expect(await getSecureItem(MOBILE_STORAGE_KEYS.session, store)).toBeNull()
  })

  it('migrates a value saved under the old key without dropping it', async () => {
    const { store, items, seen } = memoryStore(
      { [MOBILE_STORAGE_KEYS.session]: 'token-secret' },
      true,
    )
    const value = await getSecureItem(MOBILE_STORAGE_KEYS.session, store)
    expect(value).toBe('token-secret')
    expect(items.get('show-your-hand_mobile-online-session_v1')).toBe('token-secret')
    expect(items.has(MOBILE_STORAGE_KEYS.session)).toBe(false)
    expect(seen.filter((key) => !VALID_KEY.test(key))).toEqual([
      MOBILE_STORAGE_KEYS.session,
      MOBILE_STORAGE_KEYS.session,
    ])
  })

  it('stays quiet when iOS rejects the old key during migration', async () => {
    const { store, items } = memoryStore()
    expect(await getSecureItem(MOBILE_STORAGE_KEYS.session, store)).toBeNull()
    expect(items.size).toBe(0)
  })
})
