import { describe, expect, it } from 'vitest'
import {
  CHAT_HISTORY_LIMIT,
  appendMessage,
  buildReport,
  cleanChatText,
  cleanIncomingChat,
  createRateLimiter,
  submitReport,
  type ChatMessage,
} from './chat'

describe('table chat text', () => {
  it('keeps ordinary messages and collapses whitespace', () => {
    expect(cleanChatText('  nice   move!  ')).toEqual({ ok: true, body: 'nice move!' })
    expect(cleanChatText('🔥')).toEqual({ ok: true, body: '🔥' })
  })

  it('masks profanity, including simple disguises', () => {
    const plain = cleanChatText('what the fuck')
    const disguised = cleanChatText('you are a b1tch')
    expect(plain.ok && plain.body).not.toMatch(/fuck/i)
    expect(plain.ok && plain.body).toContain('*')
    expect(disguised.ok && disguised.body).not.toMatch(/b1tch/i)
  })

  it('does not mask innocent words that contain filtered letters', () => {
    expect(cleanChatText('Scunthorpe classic assassin')).toEqual({
      ok: true,
      body: 'Scunthorpe classic assassin',
    })
  })

  it('rejects empty, oversized, and link messages', () => {
    expect(cleanChatText('   ').ok).toBe(false)
    expect(cleanChatText('x'.repeat(141)).ok).toBe(false)
    expect(cleanChatText('join me at https://example.com').ok).toBe(false)
    expect(cleanChatText('visit scam.xyz now').ok).toBe(false)
  })

  it('re-filters incoming text from the other player', () => {
    expect(cleanIncomingChat('fuck off')).not.toMatch(/fuck/i)
    expect(cleanIncomingChat(42)).toBeNull()
    expect(cleanIncomingChat('a'.repeat(500))?.length).toBe(140)
  })
})

describe('chat rate limit', () => {
  it('enforces a short gap and a burst limit', () => {
    let now = 0
    const limiter = createRateLimiter(() => now)
    expect(limiter.tryConsume().ok).toBe(true)
    now = 100
    expect(limiter.tryConsume().ok).toBe(false)
    for (let i = 0; i < 5; i++) {
      now += 800
      expect(limiter.tryConsume().ok).toBe(true)
    }
    now += 800
    expect(limiter.tryConsume().ok).toBe(false)
    now += 10_000
    expect(limiter.tryConsume().ok).toBe(true)
  })
})

describe('chat history and reports', () => {
  const message = (id: string, from = 'p2'): ChatMessage => ({
    id,
    from,
    name: from === 'p2' ? 'Rival' : 'Me',
    body: `msg ${id}`,
    at: Date.UTC(2026, 9, 13, 12, 0, Number(id) % 60),
  })

  it('dedupes by id and caps history', () => {
    let list: ChatMessage[] = []
    list = appendMessage(list, message('1'))
    list = appendMessage(list, message('1'))
    expect(list).toHaveLength(1)
    for (let i = 2; i < 200; i++) list = appendMessage(list, message(String(i)))
    expect(list).toHaveLength(CHAT_HISTORY_LIMIT)
  })

  it('includes only the reported player’s recent messages', () => {
    const report = buildReport({
      roomCode: 'ABC123',
      reporterName: 'Me',
      reportedName: 'Rival',
      reportedId: 'p2',
      reason: 'Harassment or bullying',
      details: 'kept insulting me',
      messages: [message('1'), message('2', 'p1'), message('3')],
    })
    expect(report['room-code']).toBe('ABC123')
    expect(report.message).toContain('CHAT REPORT — Harassment or bullying')
    expect(report.message).toContain('Rival: msg 1')
    expect(report.message).toContain('Rival: msg 3')
    expect(report.message).not.toContain('msg 2')
  })

  it('only resolves a report when the form endpoint accepts it', async () => {
    const calls: RequestInit[] = []
    const ok = (async (_url: string, init: RequestInit) => {
      calls.push(init)
      return new Response('ok', { status: 200 })
    }) as unknown as typeof fetch
    await submitReport({ name: 'Chat report', message: 'x', 'room-code': 'ABC123' }, ok)
    expect(String(calls[0].body)).toContain('form-name=feedback')

    const failing = (async () => new Response('no', { status: 404 })) as unknown as typeof fetch
    await expect(submitReport({ message: 'x' }, failing)).rejects.toThrow(/HTTP 404/)
  })
})
