import * as SecureStore from 'expo-secure-store'

const PREFS_KEY = 'show-your-hand:mobile-preferences:v1'

export type MobilePreferences = {
  beginnerMode: boolean
  feedbackEnabled: boolean
  tutorialSeen: boolean
  defaultOpponents: 1 | 2 | 3 | 4 | 5
}

export const DEFAULT_MOBILE_PREFERENCES: MobilePreferences = {
  beginnerMode: true,
  feedbackEnabled: true,
  tutorialSeen: false,
  defaultOpponents: 1,
}

export async function loadMobilePreferences(): Promise<MobilePreferences> {
  try {
    const raw = await SecureStore.getItemAsync(PREFS_KEY)
    if (!raw) return DEFAULT_MOBILE_PREFERENCES
    const parsed = JSON.parse(raw) as Partial<MobilePreferences>
    const count = Number(parsed.defaultOpponents)
    return {
      beginnerMode: parsed.beginnerMode !== false,
      feedbackEnabled: parsed.feedbackEnabled !== false,
      tutorialSeen: parsed.tutorialSeen === true,
      defaultOpponents:
        count >= 1 && count <= 5
          ? (count as MobilePreferences['defaultOpponents'])
          : 1,
    }
  } catch {
    return DEFAULT_MOBILE_PREFERENCES
  }
}

export async function saveMobilePreferences(
  preferences: MobilePreferences,
): Promise<void> {
  await SecureStore.setItemAsync(PREFS_KEY, JSON.stringify(preferences))
}
