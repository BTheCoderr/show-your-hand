export type FeedbackKind = 'card' | 'attack' | 'defense' | 'score' | 'win' | 'shuffle'

const KEY = 'show-your-hand:feedback-enabled:v1'

export function loadFeedbackEnabled(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const raw = window.localStorage.getItem(KEY)
    return raw === null ? true : raw === 'true'
  } catch {
    return true
  }
}

export function saveFeedbackEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(KEY, String(enabled))
  } catch {
    // Feedback settings are optional.
  }
}

export function feedbackKindForAction(type: string): FeedbackKind {
  if (type === 'CONFIRM_ATTACK') return 'attack'
  if (type === 'RESPOND_DEFENSE' || type === 'RESPOND_REVERSE_BLANK') return 'defense'
  if (type === 'NEXT_ROUND') return 'shuffle'
  return 'card'
}

export function playFeedback(kind: FeedbackKind, enabled: boolean): void {
  if (!enabled || typeof window === 'undefined') return

  const vibration: Record<FeedbackKind, number | number[]> = {
    card: 12,
    attack: [22, 24, 30],
    defense: [16, 20, 16],
    score: [18, 35, 30],
    win: [25, 30, 25, 30, 45],
    shuffle: [10, 14, 10, 14, 10],
  }

  try {
    navigator.vibrate?.(vibration[kind])
  } catch {
    // Haptics are not available on every browser.
  }

  try {
    const AudioContextCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextCtor) return

    const ctx = new AudioContextCtor()
    const gain = ctx.createGain()
    const oscillator = ctx.createOscillator()
    const settings: Record<FeedbackKind, [number, number, OscillatorType]> = {
      card: [220, 0.045, 'triangle'],
      attack: [150, 0.11, 'sawtooth'],
      defense: [330, 0.09, 'square'],
      score: [520, 0.16, 'triangle'],
      win: [660, 0.24, 'sine'],
      shuffle: [185, 0.09, 'triangle'],
    }
    const [frequency, duration, wave] = settings[kind]

    oscillator.type = wave
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.055, ctx.currentTime + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration)

    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start()
    oscillator.stop(ctx.currentTime + duration + 0.01)
    oscillator.addEventListener('ended', () => void ctx.close(), { once: true })
  } catch {
    // Audio feedback must never block gameplay.
  }
}
