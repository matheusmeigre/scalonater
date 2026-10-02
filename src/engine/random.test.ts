import { describe, expect, it } from 'vitest'
import { createRng, nextRandom, roller } from './random'

describe('random', () => {
  it('é determinístico para a mesma semente', () => {
    const a = nextRandom(createRng(42))
    const b = nextRandom(createRng(42))
    expect(a).toEqual(b)
    expect(a[0]).toBeGreaterThanOrEqual(0)
    expect(a[0]).toBeLessThan(1)
  })

  it('roller avança o estado do holder', () => {
    const holder = { rng: createRng(7) }
    const roll = roller(holder)
    const first = roll()
    const second = roll()
    expect(first).not.toBe(second)
    expect(holder.rng.state).not.toBe(7)
  })
})
