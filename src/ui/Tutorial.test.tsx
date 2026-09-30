import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { tutorialCanContinue, Tutorial } from './Tutorial'

describe('Tutorial', () => {
  it('keeps the intro Next button enabled', () => {
    const html = renderToStaticMarkup(<Tutorial open onClose={() => undefined} />)
    expect(html).toContain('syh-tutorial-next')
    expect(html).toMatch(/syh-tutorial-next[^>]*>Next</)
    expect(html).not.toMatch(/syh-tutorial-next[^>]*disabled/)
  })

  it('never requires practice to leave a tutorial step', () => {
    expect(tutorialCanContinue(0, false)).toBe(true)
    expect(tutorialCanContinue(1, false)).toBe(false)
    expect(tutorialCanContinue(1, true)).toBe(true)
    expect(tutorialCanContinue(7, false)).toBe(true)
  })
})
