import { describe, expect, it } from 'vitest'
import { newHistoryEvents, startsAnotherTurn } from './turnClock'

describe('turn clock transition detection', () => {
  it('ignores unchanged server polling snapshots', () => {
    const state = ['Player starts the round.', 'You selected Green 3.']
    expect(newHistoryEvents(state, [...state])).toEqual([])
  })

  it('detects a new turn when CPU play completes back to the same human', () => {
    const old = ['You\'s turn.', 'You played Orange 3.']
    const next = [...old, 'CPU 1\'s turn.', 'CPU 1 played.', 'You\'s turn.']
    expect(newHistoryEvents(old, next).some(startsAnotherTurn)).toBe(true)
  })

  it('handles rolling 80-message histories without losing a turn transition', () => {
    const before = Array.from({ length: 80 }, (_, index) => `event-${index}`)
    const after = [...before.slice(2), 'CPU 1\'s turn.', 'You\'s turn.']
    expect(newHistoryEvents(before, after)).toEqual(['CPU 1\'s turn.', 'You\'s turn.'])
  })

  it('does not reset on card selections, defenses, and polling updates', () => {
    const old = ['You\'s turn.', 'You selected Green 3.']
    const current = [...old, 'Choose a target.']
    expect(newHistoryEvents(old, current).some(startsAnotherTurn)).toBe(false)
  })

  it('recognizes new rounds and starts of matches', () => {
    expect(startsAnotherTurn('CPU 1 starts.')).toBe(true)
    expect(startsAnotherTurn('You starts the round.')).toBe(true)
    expect(startsAnotherTurn('You selected a card.')).toBe(false)
  })
})
