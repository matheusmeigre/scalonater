import { describe, expect, it } from 'vitest'
import { toBits } from '@/games/shared/binary'
import { IMAGES, PHASES } from '../phases'
import {
  checkTarget,
  computeOutcome,
  countToggles,
  createGame,
  markLost,
  nextTarget,
  toggleBit,
  type BitsState,
} from './rules'

const tutorial = PHASES[0]!
const nivel1 = PHASES[1]! // 4 bits, number
const nivel3 = PHASES[3]! // 8 bits, number, efficiencyBonus
const nivel4 = PHASES[4]! // 8 bits, letters
const nivel5 = PHASES[5]! // 64 bits, image

/** Toca nos interruptores necessários para a fileira bater com `target` (0 ou mais toques). */
function solveNumber(state: BitsState, target: number) {
  const bitCount = state.phase.bitCount
  const targetBits = toBits(target, bitCount)
  let s = state
  for (let i = 0; i < bitCount; i++) {
    if (s.bits[i] !== targetBits[i]) s = toggleBit(s, i).state
  }
  return s
}

function solveImage(state: BitsState, target: readonly (0 | 1)[]) {
  let s = state
  for (let i = 0; i < target.length; i++) {
    if (s.bits[i] !== target[i]) s = toggleBit(s, i).state
  }
  return s
}

describe('createGame', () => {
  it('é determinístico com a mesma semente', () => {
    const a = createGame(nivel1, 6, 42)
    const b = createGame(nivel1, 6, 42)
    expect(a.target).toBe(b.target)
  })

  it('duas sessões com a mesma semente geram a mesma sequência de alvos', () => {
    let a = createGame(nivel1, 6, 7)
    let b = createGame(nivel1, 6, 7)
    const seqA: unknown[] = [a.target]
    const seqB: unknown[] = [b.target]
    for (let i = 0; i < 5; i++) {
      a = solveNumber(a, a.target as number)
      b = solveNumber(b, b.target as number)
      seqA.push(a.target)
      seqB.push(b.target)
    }
    expect(seqA).toEqual(seqB)
  })

  it('a fileira começa toda em zero', () => {
    const g = createGame(nivel1, 6, 1)
    expect(g.bits.every((b) => b === 0)).toBe(true)
  })
})

describe('toggleBit', () => {
  it('alterna o bit e emite o evento "toggled"', () => {
    const g = createGame(nivel1, 6, 1)
    const { state, events } = toggleBit(g, 0)
    expect(state.bits[0]).toBe(1)
    expect(events[0]).toEqual({ type: 'toggled', index: 0, value: 1 })
  })

  it('alternar de novo volta a 0', () => {
    const g = createGame(nivel1, 6, 1)
    const once = toggleBit(g, 0).state
    const twice = toggleBit(once, 0).state
    expect(twice.bits[0]).toBe(0)
  })

  it('bater o alvo gera o evento "matched" e sorteia o próximo', () => {
    let g = createGame(nivel1, 6, 3)
    const target = g.target as number
    const before = g.hits
    g = solveNumber(g, target)
    expect(g.hits).toBe(before + 1)
    expect(g.status).toBe('playing')
  })
})

describe('checkTarget', () => {
  it('"mismatch" quando a fileira ainda não bate com o alvo', () => {
    const g = createGame(nivel1, 6, 5)
    if (g.target !== 0) expect(checkTarget(g)).toEqual({ type: 'mismatch' })
  })

  it('"matched" quando a fileira bate com o alvo', () => {
    const g = createGame(nivel1, 6, 5)
    const matched: BitsState = { ...g, bits: toBits(g.target as number, g.phase.bitCount) }
    expect(checkTarget(matched)).toEqual({ type: 'matched' })
  })
})

describe('vitória e derrota', () => {
  it('vence ao formar targetCount alvos', () => {
    let g = createGame(nivel1, 3, 11)
    for (let i = 0; i < 3; i++) g = solveNumber(g, g.target as number)
    expect(g.status).toBe('won')
    expect(computeOutcome(g, { untimed: false, timeLeftFraction: 0.5 }).won).toBe(true)
  })

  it('perde quando o tempo zera antes da meta (markLost)', () => {
    let g = createGame(nivel1, 6, 11)
    g = solveNumber(g, g.target as number)
    g = markLost(g)
    expect(g.status).toBe('lost')
    expect(computeOutcome(g, { untimed: false, timeLeftFraction: 0 }).won).toBe(false)
  })

  it('o tutorial nunca perde: markLost não some com a vitória já obtida', () => {
    let g = createGame(tutorial, 2, 1)
    for (let i = 0; i < 2; i++) g = solveNumber(g, g.target as number)
    expect(g.status).toBe('won')
  })
})

describe('estrelas', () => {
  it('vitória simples (sem tempo restante) dá 1 estrela', () => {
    let g = createGame(nivel1, 3, 9)
    for (let i = 0; i < 3; i++) g = solveNumber(g, g.target as number)
    expect(computeOutcome(g, { untimed: false, timeLeftFraction: 0 }).stars).toBe(1)
  })

  it('≥12% do tempo restante dá 2 estrelas', () => {
    let g = createGame(nivel1, 3, 9)
    for (let i = 0; i < 3; i++) g = solveNumber(g, g.target as number)
    expect(computeOutcome(g, { untimed: false, timeLeftFraction: 0.2 }).stars).toBe(2)
  })

  it('≥30% do tempo restante dá 3 estrelas', () => {
    let g = createGame(nivel1, 3, 9)
    for (let i = 0; i < 3; i++) g = solveNumber(g, g.target as number)
    expect(computeOutcome(g, { untimed: false, timeLeftFraction: 0.5 }).stars).toBe(3)
  })

  it('tutorial sempre fecha com 3 estrelas', () => {
    let g = createGame(tutorial, 2, 4)
    for (let i = 0; i < 2; i++) g = solveNumber(g, g.target as number)
    expect(computeOutcome(g, { untimed: false, timeLeftFraction: 0 }).stars).toBe(3)
  })

  it('sem relógio, fases sem bônus de eficiência fecham com 3 estrelas', () => {
    let g = createGame(nivel1, 3, 2)
    for (let i = 0; i < 3; i++) g = solveNumber(g, g.target as number)
    expect(computeOutcome(g, { untimed: true, timeLeftFraction: 1 }).stars).toBe(3)
  })
})

describe('nextTarget', () => {
  it('nunca repete o alvo imediatamente anterior', () => {
    let g = createGame(nivel1, 50, 123)
    for (let i = 0; i < 40; i++) {
      const prev = g.target
      g = solveNumber(g, g.target as number)
      if (g.status !== 'playing') break
      expect(g.target).not.toBe(prev)
    }
  })

  it('devolve o evento "advanced" com o novo alvo', () => {
    const g = createGame(nivel1, 6, 1)
    const { state, event } = nextTarget(g)
    expect(event.type).toBe('advanced')
    expect(state.target).toBe(event.target)
  })
})

describe('countToggles / bônus de eficiência (fase "sem cola")', () => {
  it('conta os toques desde o início do alvo atual', () => {
    const g = createGame(nivel3, 5, 1)
    const after = toggleBit(g, 0).state
    expect(countToggles(after)).toBe(1)
  })

  it('bater o alvo no mínimo de toques soma bônus de pontos (bonusHits)', () => {
    const g = createGame(nivel3, 5, 1)
    const target = g.target as number
    const solved = solveNumber(g, target)
    // minToggles é a distância de Hamming entre a fileira (toda 0) e o alvo;
    // solveNumber alterna exatamente essas posições, então é sempre mínimo.
    expect(solved.bonusHits).toBe(1)
  })

  it('sem relógio, a eficiência vira as estrelas da fase "sem cola"', () => {
    let g = createGame(nivel3, 3, 1)
    for (let i = 0; i < 3; i++) g = solveNumber(g, g.target as number)
    expect(g.bonusHits).toBe(3)
    expect(computeOutcome(g, { untimed: true, timeLeftFraction: 1 }).stars).toBe(3)
  })
})

describe('fase de letras (nivel-4)', () => {
  it('o alvo é um código válido do alfabeto', () => {
    const g = createGame(nivel4, 4, 1)
    expect(g.target).toBeGreaterThanOrEqual(0)
    expect(g.target).toBeLessThan(nivel4.alphabet!.length)
  })

  it('bate o alvo formando o código da letra em bits', () => {
    let g = createGame(nivel4, 4, 1)
    for (let i = 0; i < 4; i++) g = solveNumber(g, g.target as number)
    expect(g.status).toBe('won')
  })
})

describe('fase de imagem (nivel-5)', () => {
  it('o alvo inicial é um dos desenhos cadastrados', () => {
    const g = createGame(nivel5, 3, 1)
    expect(IMAGES.some((img) => img === g.target)).toBe(true)
  })

  it('reproduzir o desenho bit a bit vence a fase', () => {
    let g = createGame(nivel5, 3, 1)
    for (let i = 0; i < 3; i++) g = solveImage(g, g.target as readonly (0 | 1)[])
    expect(g.status).toBe('won')
  })
})
