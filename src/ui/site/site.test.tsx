import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { isProductPath, ProductPage } from '../ProductPage'
import { encodeFeedback, FEEDBACK_FIELDS, validateFeedback } from './FeedbackForm'
import { localDataKeys } from './LocalDataControls'
import { normalizeSitePath, SITE_META, SITE_PATHS } from './siteConfig'
import indexHtml from '../../../index.html?raw'

const valid = {
  topic: 'bug' as const,
  platform: 'browser',
  message: 'Drop Color did not reverse after my counter.',
  name: '',
  email: '',
  roomCode: '',
}

describe('site routing', () => {
  it('recognises every public page with or without a trailing slash', () => {
    for (const path of SITE_PATHS) {
      expect(normalizeSitePath(path)).toBe(path)
      expect(normalizeSitePath(`${path}/`)).toBe(path)
      expect(isProductPath(path)).toBe(true)
    }
    expect(normalizeSitePath('/')).toBeNull()
    expect(normalizeSitePath('/join/ABC123')).toBeNull()
    expect(normalizeSitePath('/supportx')).toBeNull()
  })

  it('renders each page with one h1, shared navigation, and policy links', () => {
    for (const path of SITE_PATHS) {
      const html = renderToStaticMarkup(<ProductPage path={path} />)
      expect(html.match(/<h1[\s>]/g)?.length, path).toBe(1)
      expect(html).toMatch(/aria-current="(page|true)"/)
      for (const href of ['/support', '/privacy', '/terms', '/about']) {
        expect(html, `${path} links to ${href}`).toContain(`href="${href}"`)
      }
      expect(SITE_META[path].title).toMatch(/SHOW YOUR HAND/)
    }
  })

  it('does not advertise an App Store download link before release', () => {
    const html = renderToStaticMarkup(<ProductPage path="/about" />)
    expect(html).not.toMatch(/apps\.apple\.com/)
    expect(html).toContain('Coming soon')
  })

  it('shows effective and last-updated dates on the policies', () => {
    for (const path of ['/privacy', '/terms'] as const) {
      const html = renderToStaticMarkup(<ProductPage path={path} />)
      expect(html).toMatch(/Effective <!-- -->October 12, 2026|Effective October 12, 2026/)
      expect(html).toMatch(/Last updated/)
    }
  })
})

describe('feedback form', () => {
  it('accepts a complete message', () => {
    expect(validateFeedback(valid)).toEqual({})
  })

  it('requires a meaningful message', () => {
    expect(validateFeedback({ ...valid, message: '  ' }).message).toBeTruthy()
    expect(validateFeedback({ ...valid, message: 'short' }).message).toBeTruthy()
  })

  it('validates optional email and room code only when provided', () => {
    expect(validateFeedback({ ...valid, email: 'nope' }).email).toBeTruthy()
    expect(validateFeedback({ ...valid, email: 'player@example.com' }).email).toBeUndefined()
    expect(validateFeedback({ ...valid, roomCode: 'ZZZZZZ' }).roomCode).toBeTruthy()
    expect(validateFeedback({ ...valid, roomCode: '3fa9c2' }).roomCode).toBeUndefined()
  })

  it('encodes the Netlify form name and every registered field', () => {
    const body = new URLSearchParams(encodeFeedback({ ...valid, roomCode: '3fa9c2' }, 'support'))
    expect(body.get('form-name')).toBe('feedback')
    expect(body.get('room-code')).toBe('3FA9C2')
    for (const field of FEEDBACK_FIELDS) expect(body.has(field), field).toBe(true)
  })

  it('keeps the hidden Netlify detection form in index.html in sync', () => {
    const html = indexHtml.slice(indexHtml.indexOf('<form name="feedback"'), indexHtml.indexOf('</form>'))
    for (const field of [...FEEDBACK_FIELDS, 'bot-field']) {
      expect(html, field).toMatch(new RegExp(`name="${field}"`))
    }
  })
})

describe('local data deletion', () => {
  it('only targets SHOW YOUR HAND storage keys', () => {
    const keys = ['show-your-hand:local-stats:v1', 'syh-match-v1', 'other-app', 'show-your-hand:online-session:v2']
    const storage = { length: keys.length, key: (index: number) => keys[index] ?? null }
    expect(localDataKeys(storage)).toEqual([
      'show-your-hand:local-stats:v1',
      'syh-match-v1',
      'show-your-hand:online-session:v2',
    ])
  })
})
