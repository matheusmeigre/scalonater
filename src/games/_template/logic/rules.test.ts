import { describe, expect, it } from 'vitest'
import { PHASES } from '../phases'
import { computeOutcome, createGame, tap } from './rules'

const phase = PHASES[0]!

describe('createGame', () => {
  it('é determinístico com a mesma semente', () => {
    const a = createGame(phase, 4, 1)
    const b = createGame(phase, 4, 1)
    expect(a.target).toBe(b.target)
  })
})

describe('tap', () => {
  it('toque errado não pontua nem avança', () => {
    const g = createGame(phase, 4, 1)
    const wrong = (g.target + 1) % g.targetCount
    const next = tap(g, wrong)
    expect(next.hits).toBe(0)
    expect(next.status).toBe('playing')
  })

  it('toque certo pontua e avança', () => {
    const g = createGame(phase, 4, 1)
    const next = tap(g, g.target)
    expect(next.hits).toBe(1)
    expect(next.scoring.score).toBeGreaterThan(0)
  })

  it('vence ao atingir a meta', () => {
    let g = createGame(phase, 4, 1)
    for (let i = 0; i < phase.goal; i++) g = tap(g, g.target)
    expect(g.status).toBe('won')
    expect(computeOutcome(g).won).toBe(true)
  })
})
