import * as Haptics from 'expo-haptics'
import {
  DEFAULT_MOBILE_PREFERENCES,
  loadMobilePreferences,
  saveMobilePreferences,
  type MobilePreferences,
} from './mobilePrefs'

let enabled = DEFAULT_MOBILE_PREFERENCES.feedbackEnabled
let loaded = false

export async function initializeMobileFeedback(): Promise<boolean> {
  if (loaded) return enabled
  const preferences = await loadMobilePreferences()
  enabled = preferences.feedbackEnabled
  loaded = true
  return enabled
}

export function mobileFeedbackEnabled(): boolean {
  return enabled
}

export async function setMobileFeedbackEnabled(
  value: boolean,
): Promise<MobilePreferences> {
  const preferences = await loadMobilePreferences()
  const next = { ...preferences, feedbackEnabled: value }
  enabled = value
  loaded = true
  await saveMobilePreferences(next)
  return next
}

export type MobileFeedbackKind =
  | 'tap'
  | 'card'
  | 'attack'
  | 'defense'
  | 'score'
  | 'win'

export async function playMobileFeedback(
  kind: MobileFeedbackKind = 'tap',
): Promise<void> {
  if (!loaded) await initializeMobileFeedback()
  if (!enabled) return

  if (kind === 'win') {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    return
  }

  if (kind === 'defense' || kind === 'score') {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    return
  }

  if (kind === 'attack') {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    return
  }

  await Haptics.selectionAsync()
}
