import { describe, expect, it } from 'vitest'
import { addPoints, breakCombo, emptyCombo, formatScore, registerHit, starsFor } from './scoring'

describe('scoring', () => {
  it('combo cresce a cada acerto e dá bônus a partir do segundo', () => {
    let s = emptyCombo()
    s = registerHit(s, 100, 25)
    expect(s).toEqual({ score: 100, combo: 1, maxCombo: 1 })
    s = registerHit(s, 100, 25)
    expect(s.score).toBe(100 + 100 + 50)
    expect(s.combo).toBe(2)
  })

  it('quebrar o combo mantém o recorde', () => {
    let s = registerHit(registerHit(emptyCombo(), 10, 1), 10, 1)
    s = breakCombo(s)
    expect(s.combo).toBe(0)
    expect(s.maxCombo).toBe(2)
  })

  it('addPoints não aceita pontos negativos', () => {
    expect(addPoints(emptyCombo(), -50).score).toBe(0)
    expect(addPoints(emptyCombo(), 24.6).score).toBe(25)
  })

  it('estrelas pelos limites', () => {
    expect(starsFor(0, [0.5, 0.8])).toBe(1)
    expect(starsFor(0.5, [0.5, 0.8])).toBe(2)
    expect(starsFor(0.95, [0.5, 0.8])).toBe(3)
  })

  it('formata pontos com zeros à esquerda', () => {
    expect(formatScore(42)).toBe('00042')
    expect(formatScore(123456)).toBe('123456')
  })
})
