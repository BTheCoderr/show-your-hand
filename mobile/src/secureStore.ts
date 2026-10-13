import * as SecureStore from 'expo-secure-store'

/**
 * iOS Keychain keys may only contain letters, numbers, ".", "-", and "_".
 * The app's logical keys use ":" separators, so every stored item is addressed
 * by a sanitized key.
 */
export function secureStoreKey(key: string): string {
  return key.replace(/[^A-Za-z0-9._-]/g, '_')
}

export function getSecureItem(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(secureStoreKey(key))
}

export function setSecureItem(key: string, value: string): Promise<void> {
  return SecureStore.setItemAsync(secureStoreKey(key), value)
}

export function deleteSecureItem(key: string): Promise<void> {
  return SecureStore.deleteItemAsync(secureStoreKey(key))
}
