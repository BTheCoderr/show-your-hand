import { describe, expect, it } from 'vitest'
import { createSerialQueue } from './serialQueue'

describe('serial save queue', () => {
  it('does not start a later write while an earlier write is pending', async () => {
    const enqueue = createSerialQueue()
    const calls: string[] = []
    let release!: () => void
    const hold = new Promise<void>((resolve) => { release = resolve })

    const first = enqueue(async () => {
      calls.push('first-start')
      await hold
      calls.push('first-end')
    })
    const second = enqueue(async () => {
      calls.push('second-start')
      return 42
    })
    await Promise.resolve()
    expect(calls).toEqual(['first-start'])
    release()
    expect(await second).toBe(42)
    await first
    expect(calls).toEqual(['first-start', 'first-end', 'second-start'])
  })

  it('continues after a rejected save', async () => {
    const enqueue = createSerialQueue()
    await expect(enqueue(async () => { throw new Error('storage unavailable') }))
      .rejects.toThrow('storage unavailable')
    await expect(enqueue(async () => 'recovered')).resolves.toBe('recovered')
  })

  it('loads the newest written snapshot after concurrent save requests', async () => {
    const enqueue = createSerialQueue()
    let saved = 'old'
    const first = enqueue(async () => { saved = 'turn 1' })
    const second = enqueue(async () => { saved = 'turn 2' })
    const read = enqueue(async () => saved)
    await Promise.all([first, second])
    expect(await read).toBe('turn 2')
  })
})
