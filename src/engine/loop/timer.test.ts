import { describe, expect, it } from 'vitest'
import { countdown, displaySeconds } from './timer'

describe('countdown', () => {
  it('avisa quando cruza um segundo inteiro', () => {
    expect(countdown(10.05, 0.1)).toEqual({ remaining: expect.closeTo(9.95), crossedSecond: 10 })
    expect(countdown(9.95, 0.1).crossedSecond).toBeNull()
  })

  it('nunca fica negativo', () => {
    expect(countdown(0.05, 1).remaining).toBe(0)
    expect(displaySeconds(-3)).toBe(0)
    expect(displaySeconds(4.2)).toBe(5)
  })
})
