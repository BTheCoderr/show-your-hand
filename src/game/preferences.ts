export type PlayPreferences = {
  tutorialPromptSeen: boolean
  beginnerMode: boolean
}

const KEY = 'show-your-hand:preferences:v1'

const DEFAULTS: PlayPreferences = {
  tutorialPromptSeen: false,
  beginnerMode: true,
}

export function loadPreferences(): PlayPreferences {
  if (typeof window === 'undefined') return DEFAULTS
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw) as Partial<PlayPreferences>
    return {
      tutorialPromptSeen: parsed.tutorialPromptSeen === true,
      beginnerMode: parsed.beginnerMode !== false,
    }
  } catch {
    return DEFAULTS
  }
}

export function savePreferences(preferences: PlayPreferences): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(preferences))
  } catch {
    // Preferences are optional. The game still works if storage is unavailable.
  }
}
