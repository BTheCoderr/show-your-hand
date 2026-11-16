import { describe, expect, it } from 'vitest'
import { createSafeRoomParams } from '../../mobile/src/roomContract'

describe('iOS production multiplayer contract', () => {
  it('sends exactly the two deployed safe-room RPC arguments', () => {
    const request = createSafeRoomParams(
      'bddb2521-92f5-49ed-9089-01e52d7f2d23',
      'Player 1',
    )

    expect(request).toEqual({
      p_safety_install_id: 'bddb2521-92f5-49ed-9089-01e52d7f2d23',
      p_display_name: 'Player 1',
    })
    expect(Object.keys(request).sort()).toEqual([
      'p_display_name',
      'p_safety_install_id',
    ])
    expect(request).not.toHaveProperty('p_max_players')
  })
})
