import {
  RegExpMatcher,
  TextCensor,
  asteriskCensorStrategy,
  englishDataset,
  englishRecommendedTransformers,
} from 'obscenity'

export const CHAT_MAX_LENGTH = 140
export const CHAT_HISTORY_LIMIT = 80
const RATE_WINDOW_MS = 10_000
const RATE_WINDOW_MAX = 6
const MIN_GAP_MS = 700

export const QUICK_PHRASES = [
  'Nice move!',
  'Good game',
  'Your turn',
  'Hold on…',
  'Rematch?',
  'Ouch!',
  '😂',
  '🔥',
  '👏',
  '😤',
] as const

export const REPORT_REASONS = [
  'Harassment or bullying',
  'Hate speech',
  'Sexual content',
  'Spam or scams',
  'Something else',
] as const
export type ReportReason = (typeof REPORT_REASONS)[number]

export type ChatMessage = {
  id: string
  from: string
  name: string
  body: string
  at: number
  delivered?: boolean
}

const matcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
})
const censor = new TextCensor().setStrategy(asteriskCensorStrategy())
const LINK_PATTERN = /(https?:\/\/|www\.|[a-z0-9-]+\.(com|net|org|io|gg|app|co|me|ly|xyz|link)\b)/i

export type CleanResult = { ok: true; body: string } | { ok: false; error: string }

export function cleanChatText(raw: string): CleanResult {
  const collapsed = raw
    .replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!collapsed) return { ok: false, error: 'Type a message first.' }
  if ([...collapsed].length > CHAT_MAX_LENGTH) {
    return { ok: false, error: `Keep messages under ${CHAT_MAX_LENGTH} characters.` }
  }
  if (LINK_PATTERN.test(collapsed)) return { ok: false, error: 'Links can’t be sent in table chat.' }
  const matches = matcher.getAllMatches(collapsed)
  return { ok: true, body: matches.length ? censor.applyTo(collapsed, matches) : collapsed }
}

/** Applied to incoming text too, so a modified client cannot bypass the filter. */
export function cleanIncomingChat(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const trimmed = [...raw].slice(0, CHAT_MAX_LENGTH).join('')
  const result = cleanChatText(trimmed)
  return result.ok ? result.body : null
}

export function createRateLimiter(now: () => number = Date.now) {
  const sent: number[] = []
  return {
    tryConsume(): { ok: true } | { ok: false; error: string } {
      const time = now()
      while (sent.length && time - sent[0] > RATE_WINDOW_MS) sent.shift()
      const last = sent.at(-1)
      if (last !== undefined && time - last < MIN_GAP_MS) {
        return { ok: false, error: 'Slow down a little.' }
      }
      if (sent.length >= RATE_WINDOW_MAX) {
        return { ok: false, error: 'Too many messages. Wait a few seconds.' }
      }
      sent.push(time)
      return { ok: true }
    },
  }
}

export function appendMessage(list: ChatMessage[], message: ChatMessage): ChatMessage[] {
  if (list.some((item) => item.id === message.id)) return list
  return [...list, message].slice(-CHAT_HISTORY_LIMIT)
}

export function chatMessageId(): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return random
}

export function buildReport(options: {
  roomCode: string
  reporterName: string
  reportedName: string
  reason: ReportReason
  details: string
  messages: ChatMessage[]
  reportedId: string
}): { name: string; 'room-code': string; message: string } {
  const recent = options.messages
    .filter((message) => message.from === options.reportedId)
    .slice(-15)
    .map((message) => `[${new Date(message.at).toISOString()}] ${message.name}: ${message.body}`)
  const lines = [
    `CHAT REPORT — ${options.reason}`,
    `Reported player: ${options.reportedName}`,
    `Reported by: ${options.reporterName}`,
    options.details.trim() ? `Details: ${options.details.trim().slice(0, 800)}` : 'Details: (none)',
    '',
    recent.length ? 'Recent messages from the reported player:' : 'No chat messages from the reported player on this device.',
    ...recent,
  ]
  return {
    name: 'Chat report',
    'room-code': options.roomCode,
    message: lines.join('\n'),
  }
}

export async function submitReport(
  fields: Record<string, string>,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  const body = new URLSearchParams({ 'form-name': 'feedback', ...fields }).toString()
  const response = await fetcher('/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!response.ok) throw new Error(`Report could not be sent (HTTP ${response.status}).`)
}
