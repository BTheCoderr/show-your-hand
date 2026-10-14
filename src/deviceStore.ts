const VALID_KEY = /^[A-Za-z0-9._-]+$/

/** Logical storage keys. iOS Keychain rejects the ":" separators, so they are sanitized before use. */
export const MOBILE_STORAGE_KEYS = {
  session: 'show-your-hand:mobile-online-session:v1',
  safetyIdentity: 'show-your-hand:mobile-safety-installation:v1',
  prefs: 'show-your-hand:mobile-preferences:v1',
  stats: 'show-your-hand:mobile-stats:v1',
  soloMeta: 'show-your-hand:mobile-solo-save:v1:meta',
  soloChunk: 'show-your-hand:mobile-solo-save:v1:chunk:',
} as const

/**
 * iOS Keychain keys may only contain letters, numbers, ".", "-", and "_".
 */
export function secureStoreKey(key: string): string {
  const safe = key.replace(/[^A-Za-z0-9._-]/g, '_')
  if (!VALID_KEY.test(safe)) {
    throw new Error('SecureStore key is empty.')
  }
  return safe
}

export type SecureStoreBackend = {
  getItemAsync: (key: string) => Promise<string | null>
  setItemAsync: (key: string, value: string) => Promise<void>
  deleteItemAsync: (key: string) => Promise<void>
}

/**
 * Reads an item. When a value still exists under an older, unsanitized key
 * (possible on Android), it is copied to the valid key and the old entry is
 * removed. A platform that rejects the old key, such as iOS, is treated as
 * "nothing stored" rather than an error.
 */
export async function getSecureItem(
  key: string,
  store: SecureStoreBackend,
): Promise<string | null> {
  const safe = secureStoreKey(key)
  const current = await store.getItemAsync(safe)
  if (current !== null || safe === key) return current

  let legacy: string | null
  try {
    legacy = await store.getItemAsync(key)
  } catch {
    return null
  }
  if (legacy === null) return null

  await store.setItemAsync(safe, legacy)
  try {
    await store.deleteItemAsync(key)
  } catch {
    // The copy under the valid key is what future reads use.
  }
  return legacy
}

export async function setSecureItem(
  key: string,
  value: string,
  store: SecureStoreBackend,
): Promise<void> {
  await store.setItemAsync(secureStoreKey(key), value)
}

export async function deleteSecureItem(key: string, store: SecureStoreBackend): Promise<void> {
  await store.deleteItemAsync(secureStoreKey(key))
}
