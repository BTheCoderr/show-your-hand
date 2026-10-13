import * as SecureStore from 'expo-secure-store'
import {
  deleteSecureItem as deleteItem,
  getSecureItem as readItem,
  setSecureItem as writeItem,
} from '../../src/deviceStore'

export { secureStoreKey } from '../../src/deviceStore'

export function getSecureItem(key: string): Promise<string | null> {
  return readItem(key, SecureStore)
}

export function setSecureItem(key: string, value: string): Promise<void> {
  return writeItem(key, value, SecureStore)
}

export function deleteSecureItem(key: string): Promise<void> {
  return deleteItem(key, SecureStore)
}
