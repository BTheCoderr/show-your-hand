import { describe, expect, it } from 'vitest'
import { joinCodeFromPath, joinUrl } from './rooms'

describe('online room URL helpers', () => {
  it('accepts only exact six-character hex invite paths', () => {
    expect(joinCodeFromPath('/join/a1b2c3')).toBe('A1B2C3')
    expect(joinCodeFromPath('/join/A1B2C3/')).toBe('A1B2C3')
    expect(joinCodeFromPath('/join/ABC')).toBeNull()
    expect(joinCodeFromPath('/other/A1B2C3')).toBeNull()
  })

  it('builds a relative invite URL outside the browser', () => {
    expect(joinUrl('ABC123')).toBe('/join/ABC123')
  })
})
