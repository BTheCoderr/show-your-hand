import { describe, expect, it } from 'vitest'
import { emptyMenuState } from '../game/engine'
import { maskNamesForNative, seatLabel } from './mobileDisplay'

describe('native multiplayer display safety', () => {
  it('uses fixed names for anonymous player seats', () => {
    expect(seatLabel(0)).toBe('PLAYER 1')
    expect(seatLabel(1)).toBe('PLAYER 2')
  })

  it('removes unmoderated names from names and history without mutating game rules', () => {
    const original = emptyMenuState(false)
    original.players = [
      { id: 'host', name: 'CreativeName', isHuman: true, hand: ['card-1'], score: 2 },
      { id: 'guest', name: 'OtherName', isHuman: true, hand: ['card-2'], score: 3 },
    ]
    original.history = ['CreativeName attacks OtherName', 'OtherName defends']

    const view = maskNamesForNative(original)

    expect(view.players.map((player) => player.name)).toEqual(['PLAYER 1', 'PLAYER 2'])
    expect(view.history).toEqual(['PLAYER 1 attacks PLAYER 2', 'PLAYER 2 defends'])
    expect(view.players.map((player) => player.id)).toEqual(['host', 'guest'])
    expect(view.players.map((player) => player.hand)).toEqual([['card-1'], ['card-2']])
    expect(view.players.map((player) => player.score)).toEqual([2, 3])
    expect(view.phase).toEqual(original.phase)
    expect(original.players[0].name).toBe('CreativeName')
    expect(original.history[0]).toContain('CreativeName')
  })
})
