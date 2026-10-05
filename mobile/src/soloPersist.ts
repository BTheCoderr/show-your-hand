import AsyncStorage from '@react-native-async-storage/async-storage'
import type { GameState } from '../../src/game/types'

const SOLO_SAVE_KEY = 'show-your-hand:mobile-solo-save:v1'

export type SoloSave = {
  game: GameState
  opponentCount: 1 | 2 | 3 | 4 | 5
  beginnerMode: boolean
  updatedAt: string
}

export async function loadSoloSave(): Promise<SoloSave | null> {
  try {
    const raw = await AsyncStorage.getItem(SOLO_SAVE_KEY)
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
  await AsyncStorage.setItem(SOLO_SAVE_KEY, JSON.stringify(save))
}

export async function clearSoloSave(): Promise<void> {
  await AsyncStorage.removeItem(SOLO_SAVE_KEY)
}
