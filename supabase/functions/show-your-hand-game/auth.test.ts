import { describe, expect, it } from 'vitest'
import { acceptedPublicApiKeys, validPublicApiKey } from './auth.ts'

describe('Edge Function public API key validation', () => {
  it('accepts configured publishable keys and the legacy anon key', () => {
    const configured = JSON.stringify({
      default: 'sb_publishable_default',
      mobile: 'sb_publishable_mobile',
    })

    expect(validPublicApiKey('sb_publishable_default', configured, 'legacy-anon')).toBe(true)
    expect(validPublicApiKey('sb_publishable_mobile', configured, 'legacy-anon')).toBe(true)
    expect(validPublicApiKey('legacy-anon', configured, 'legacy-anon')).toBe(true)
  })

  it('rejects missing, forged, and malformed key configuration', () => {
    expect(validPublicApiKey(null, '{"default":"real"}', 'legacy')).toBe(false)
    expect(validPublicApiKey('fake', '{"default":"real"}', 'legacy')).toBe(false)
    expect(validPublicApiKey('fake', '{not-json', null)).toBe(false)
  })

  it('collects only string keys', () => {
    const keys = acceptedPublicApiKeys(
      JSON.stringify({ default: 'one', bad: 42, off: false }),
      null,
    )
    expect([...keys]).toEqual(['one'])
  })
})
