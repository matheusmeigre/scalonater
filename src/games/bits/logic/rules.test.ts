import { describe, expect, it } from 'vitest'
import { popCount } from '@/games/shared/binary'
import { IMAGES, PHASES, WORDS } from '../phases'
import {
  advance,
  clearBits,
  computeOutcome,
  createGame,
  failPacket,
  hintFor,
  letterCode,
  letterOf,
  partsOf,
  peek,
  targetBits,
  tick,
  toggleBit,
  type BitsState,
} from './rules'

const tutorial = PHASES[0]!
const nivel1 = PHASES[1]! // 4 bits, valores à mostra
const nivel3 = PHASES[3]! // 8 bits, sem cola (plano igual ao protótipo)
const nivel4 = PHASES[4]! // letras
const nivel5 = PHASES[5]! // desenho 8x8

/** Acende exatamente as lâmpadas do alvo atual. */
function solve(state: BitsState): BitsState {
  const want = targetBits(state.phase, state.target)
  let s = state
  for (let i = 0; i < want.length; i++) {
    if (s.bits[i] !== want[i]) s = toggleBit(s, i).state
  }
  return s
}

/** Resolve o pacote atual e avança para o próximo. */
function solveAndAdvance(state: BitsState): BitsState {
  return advance(solve(state))
}

describe('createGame', () => {
  it('é determinístico com a mesma semente', () => {
    expect(createGame(nivel3, 42).targets).toEqual(createGame(nivel3, 42).targets)
  })

  it('um alvo por pacote do plano, cada número com o `pop` pedido e sem repetir', () => {
    const g = createGame(nivel3, 7)
    expect(g.targets).toHaveLength(nivel3.plan.length)
    g.targets.forEach((t, i) => {
      expect(popCount(targetBits(nivel3, t))).toBe(nivel3.plan[i]!.pop)
    })
    expect(new Set(g.targets).size).toBe(g.targets.length)
  })

  it('começa no pacote 1, fileira apagada, combo x1, vidas e espiadas da fase', () => {
    const g = createGame(nivel3, 1)
    expect(g.idx).toBe(0)
    expect(g.bits.every((b) => b === 0)).toBe(true)
    expect(g.combo).toBe(1)
    expect(g.lives).toBe(3)
    expect(g.peeks).toBe(2)
    expect(g.remaining).toBe(nivel3.plan[0]!.dur)
  })

  it('a dificuldade multiplica o tempo de chegada', () => {
    expect(createGame(nivel3, 1, 1.3).remaining).toBeCloseTo(nivel3.plan[0]!.dur * 1.3)
  })

  it('nenhum alvo é "tudo apagado" (o pacote nunca decodifica sozinho)', () => {
    for (const phase of PHASES) {
      for (let seed = 1; seed < 30; seed++) {
        const g = createGame(phase, seed)
        g.targets.forEach((t) => expect(targetBits(phase, t).some((b) => b === 1)).toBe(true))
      }
    }
  })
})

describe('toggleBit', () => {
  it('alterna a lâmpada e emite "toggled"', () => {
    const g = createGame(nivel1, 1)
    const { state, events } = toggleBit(g, 0)
    expect(state.bits[0]).toBe(1)
    expect(events[0]).toEqual({ type: 'toggled', index: 0, value: 1 })
  })

  it('bater o alvo decodifica o pacote: pontos = (100 + restante×15) × combo', () => {
    let g = createGame(nivel3, 3)
    g = tick(g, 4).state
    const remaining = g.remaining
    const solved = solve(g)
    expect(solved.stage).toBe('locked')
    expect(solved.results[0]).toBe('ok')
    expect(solved.solved).toBe(1)
    expect(solved.score).toBe(Math.round((100 + remaining * 15) * 1))
    expect(solved.combo).toBe(2)
  })

  it('o combo multiplica o próximo acerto e o maior combo fica guardado', () => {
    let g = createGame(nivel3, 3)
    g = solveAndAdvance(g)
    const before = g.score
    const s = solve(g)
    expect(s.score - before).toBe(Math.round((100 + s.remaining * 15) * 2))
    expect(s.best).toBe(2)
    expect(s.combo).toBe(3)
  })

  it('travado na pausa de comemoração, toques não fazem nada', () => {
    const solved = solve(createGame(nivel1, 2))
    expect(toggleBit(solved, 0).state).toBe(solved)
  })
})

describe('chegada do pacote (tick / failPacket)', () => {
  it('o relógio do pacote desce com o tempo', () => {
    const g = tick(createGame(nivel3, 1), 2).state
    expect(g.remaining).toBeCloseTo(nivel3.plan[0]!.dur - 2)
  })

  it('ao zerar, perde uma vida, combo volta a x1 e a fileira mostra a resposta', () => {
    let g = solveAndAdvance(createGame(nivel3, 5)) // combo x2
    const { state, events } = tick(g, 999)
    expect(events).toEqual([{ type: 'fail' }])
    expect(state.lives).toBe(2)
    expect(state.combo).toBe(1)
    expect(state.results[1]).toBe('bad')
    expect(state.bits).toEqual(targetBits(nivel3, state.target))
    expect(state.stage).toBe('locked')
    g = state
  })

  it('sem vidas, `advance` perde a fase', () => {
    let g = createGame(nivel3, 5)
    for (let i = 0; i < 3; i++) g = advance(failPacket(g).state)
    expect(g.status).toBe('lost')
  })

  it('errar alguns pacotes e chegar ao fim com vida vence (como no protótipo)', () => {
    let g = createGame(nivel1, 9)
    g = advance(failPacket(g).state)
    while (g.status === 'playing') g = solveAndAdvance(g)
    expect(g.status).toBe('won')
    expect(g.solved).toBe(nivel1.plan.length - 1)
  })
})

describe('clearBits e peek', () => {
  it('"Apagar tudo" zera a fileira', () => {
    let g = createGame(nivel3, 1)
    g = toggleBit(toggleBit(g, 0).state, 3).state
    expect(clearBits(g).state.bits.every((b) => b === 0)).toBe(true)
  })

  it('espiar gasta uma espiada e zera o combo; sem espiadas, não faz nada', () => {
    let g = solveAndAdvance(createGame(nivel3, 4))
    expect(g.combo).toBe(2)
    g = peek(g)!
    expect(g.peeks).toBe(1)
    expect(g.combo).toBe(1)
    g = peek(g)!
    expect(peek(g)).toBeNull()
  })
})

describe('hintFor', () => {
  it('aponta a maior casa apagada que ainda cabe no que falta', () => {
    const g = createGame(nivel3, 1)
    const target = g.target as number
    const hint = hintFor(g)
    expect(hint?.kind).toBe('bit')
    if (hint?.kind === 'bit') {
      expect(hint.rest).toBe(target)
      expect(2 ** (7 - hint.index)).toBe(partsOf(nivel3, target)[0])
    }
  })

  it('passou do alvo: dica de apagar', () => {
    let g = createGame(nivel3, 1)
    for (let i = 0; i < 8; i++) g = toggleBit(g, i).state
    if (g.stage === 'running') expect(hintFor(g)).toEqual({ kind: 'over' })
  })
})

describe('fim de fase', () => {
  it('vence ao passar pelo último pacote; estrelas pelas vidas', () => {
    let g = createGame(nivel3, 11)
    while (g.status === 'playing') g = solveAndAdvance(g)
    expect(g.status).toBe('won')
    expect(computeOutcome(g)).toMatchObject({ won: true, stars: 3 })
  })

  it('duas vidas → 2 estrelas', () => {
    let g = advance(failPacket(createGame(nivel1, 2)).state)
    while (g.status === 'playing') g = solveAndAdvance(g)
    expect(computeOutcome(g).stars).toBe(2)
  })

  it('tutorial sempre fecha com 3 estrelas', () => {
    let g = createGame(tutorial, 4)
    while (g.status === 'playing') g = solveAndAdvance(g)
    expect(computeOutcome(g).stars).toBe(3)
  })
})

describe('letras e desenhos', () => {
  it('letras usam o código ASCII de verdade e formam uma palavra do banco', () => {
    expect(letterCode('A')).toBe(65)
    expect(letterOf(65)).toBe('A')
    const g = createGame(nivel4, 3)
    const word = g.targets.map((t) => letterOf(t as number)).join('')
    expect(WORDS).toContain(word)
  })

  it('o desenho-alvo é um dos cadastrados e reproduzi-lo decodifica', () => {
    const g = createGame(nivel5, 1)
    expect(IMAGES.some((img) => img === g.target)).toBe(true)
    expect(solve(g).stage).toBe('locked')
  })

  it('partsOf decompõe o número nas casas acesas', () => {
    expect(partsOf(nivel3, 187)).toEqual([128, 32, 16, 8, 2, 1])
  })
})
