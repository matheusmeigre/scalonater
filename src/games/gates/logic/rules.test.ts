import { describe, expect, it } from 'vitest'
import { PHASES } from '../phases'
import {
  checkCircuit,
  clearGate,
  computeOutcome,
  createGame,
  expireTime,
  finishTutorial,
  placeGate,
  resolveTime,
  toggleInput,
} from './rules'

const tutorial = PHASES[0]!
const fase1 = PHASES[1]! // AND/OR, slot único de 2 entradas
const fase2 = PHASES[2]! // NAND em dois encaixes
const fase3 = PHASES[3]! // XOR em quatro encaixes
const fase4 = PHASES[4]! // estoque exato de 3 entradas

describe('createGame', () => {
  it('é determinístico: o mesmo phase sempre gera o mesmo estado inicial', () => {
    const a = createGame(fase1)
    const b = createGame(fase1)
    expect(a).toEqual(b)
  })

  it('estoque ilimitado não cria limite (stock undefined)', () => {
    expect(createGame(fase1).stock).toBeUndefined()
  })

  it('estoque limitado conta as peças exatas da fase', () => {
    const g = createGame(fase4)
    expect(g.stock).toEqual({ AND: 1, OR: 1, NOT: 1 })
  })
})

describe('toggleInput', () => {
  it('alterna o valor de um interruptor de entrada', () => {
    const g = createGame(tutorial)
    const next = toggleInput(g, 'A')
    expect(next.inputs.A).toBe(true)
    expect(toggleInput(next, 'A').inputs.A).toBe(false)
  })
})

describe('placeGate', () => {
  it('preenche um slot vazio e devolve o evento "placed"', () => {
    const g = createGame(fase1)
    const { state, event } = placeGate(g, 's1', 'AND')
    expect(event).toEqual({ type: 'placed', slotId: 's1', gate: 'AND' })
    expect(state.placed.s1).toBe('AND')
  })

  it('bloqueia quando o estoque da porta está zerado', () => {
    let g = createGame(fase4)
    g = placeGate(g, 'sG1', 'AND').state
    g = placeGate(g, 'sFinal', 'OR').state
    // só resta NOT no estoque; tentar AND de novo (sG2) deve bloquear
    const { event } = placeGate(g, 'sG2', 'AND')
    expect(event).toEqual({ type: 'blocked', reason: 'sem-estoque' })
  })

  it('troca a porta de um slot já preenchido e devolve a anterior ao estoque', () => {
    let g = createGame(fase4)
    g = placeGate(g, 'sG1', 'AND').state
    expect(g.stock).toEqual({ AND: 0, OR: 1, NOT: 1 })
    g = placeGate(g, 'sG1', 'OR').state
    expect(g.stock).toEqual({ AND: 1, OR: 0, NOT: 1 })
    expect(g.placed.sG1).toBe('OR')
  })

  it('vence na hora ao encaixar a peça que completa e acerta o circuito', () => {
    let g = createGame(fase1)
    g = placeGate(g, 's1', 'AND').state
    expect(g.status).toBe('won')
  })
})

describe('clearGate', () => {
  it('remove a porta do slot e devolve ao estoque sem custo', () => {
    let g = createGame(fase4)
    g = placeGate(g, 'sG1', 'AND').state
    g = clearGate(g, 'sG1')
    expect(g.placed.sG1).toBeUndefined()
    expect(g.stock).toEqual({ AND: 1, OR: 1, NOT: 1 })
    expect(g.swaps).toBe(1)
  })

  it('não faz nada se o slot já está vazio', () => {
    const g = createGame(fase1)
    expect(clearGate(g, 's1')).toEqual(g)
  })
})

describe('checkCircuit', () => {
  it('"incomplete" enquanto existe slot vazio', () => {
    const g = createGame(fase2)
    expect(checkCircuit(g)).toEqual({ type: 'incomplete' })
  })

  it('só devolve "won" quando TODOS os 2^inputCount casos passam (não só o caso visível)', () => {
    // AND no slot único: bate com o alvo (AND) em todos os 4 casos.
    let g = createGame(fase1)
    g = placeGate(g, 's1', 'AND').state
    expect(checkCircuit(g)).toEqual({ type: 'won' })

    // OR no mesmo slot: só bate com o alvo AND em 2 dos 4 casos — "mismatch".
    let wrong = createGame(fase1)
    wrong = placeGate(wrong, 's1', 'OR').state
    const result = checkCircuit(wrong)
    expect(result.type).toBe('mismatch')
    if (result.type === 'mismatch') expect(result.failingCases.length).toBeGreaterThan(0)
  })

  it('NAND (fase 2) só vence com AND seguido de NOT', () => {
    let g = createGame(fase2)
    g = placeGate(g, 's1', 'AND').state
    g = placeGate(g, 's2', 'NOT').state
    expect(checkCircuit(g)).toEqual({ type: 'won' })
  })

  it('XOR (fase 3) vence com "(A OR B) AND NOT(A AND B)"', () => {
    let g = createGame(fase3)
    g = placeGate(g, 'sOr', 'OR').state
    g = placeGate(g, 'sAnd', 'AND').state
    g = placeGate(g, 'sNot', 'NOT').state
    g = placeGate(g, 'sFinal', 'AND').state
    expect(checkCircuit(g)).toEqual({ type: 'won' })
  })

  it('fase 4 vence com a topologia certa (AND em sG1, NOT em sG2, OR em sFinal)', () => {
    let g = createGame(fase4)
    g = placeGate(g, 'sG1', 'AND').state
    g = placeGate(g, 'sG2', 'NOT').state
    g = placeGate(g, 'sFinal', 'OR').state
    expect(checkCircuit(g)).toEqual({ type: 'won' })
  })

  it('fase 4 com AND/OR trocados não vence (mesmo com o estoque certo)', () => {
    let g = createGame(fase4)
    g = placeGate(g, 'sG1', 'OR').state
    g = placeGate(g, 'sG2', 'NOT').state
    g = placeGate(g, 'sFinal', 'AND').state
    expect(checkCircuit(g).type).toBe('mismatch')
  })
})

describe('vitória e derrota', () => {
  it('tempo esgotado derrota fora do tutorial', () => {
    const g = createGame(fase1)
    expect(expireTime(g).status).toBe('lost')
  })

  it('tutorial nunca perde por tempo (canLose: false)', () => {
    const g = createGame(tutorial)
    expect(expireTime(g).status).toBe('playing')
  })

  it('finishTutorial vence sem precisar preencher slots', () => {
    const g = createGame(tutorial)
    expect(finishTutorial(g).status).toBe('won')
  })
})

describe('estrelas', () => {
  it('vitória com bastante tempo sobrando dá 3 estrelas', () => {
    let g = createGame(fase1)
    g = placeGate(g, 's1', 'AND').state
    const o = computeOutcome(g, { timeLeft: 35, timeLimit: 40, untimed: false })
    expect(o.won).toBe(true)
    expect(o.stars).toBe(3)
  })

  it('vitória raspando o tempo dá 1 estrela', () => {
    let g = createGame(fase1)
    g = placeGate(g, 's1', 'AND').state
    const o = computeOutcome(g, { timeLeft: 1, timeLimit: 40, untimed: false })
    expect(o.stars).toBe(1)
  })

  it('derrota nunca dá estrela', () => {
    const g = expireTime(createGame(fase1))
    const o = computeOutcome(g, { timeLeft: 0, timeLimit: 40, untimed: false })
    expect(o.won).toBe(false)
    expect(o.stars).toBe(0)
  })

  it('modo sem tempo: zero trocas dá 3 estrelas', () => {
    let g = createGame(fase1)
    g = placeGate(g, 's1', 'AND').state
    const o = computeOutcome(g, { timeLeft: 0, timeLimit: 0, untimed: true })
    expect(o.stars).toBe(3)
  })

  it('modo sem tempo: trocar peças reduz as estrelas', () => {
    let g = createGame(fase1)
    g = placeGate(g, 's1', 'OR').state
    g = clearGate(g, 's1')
    g = placeGate(g, 's1', 'AND').state
    const o = computeOutcome(g, { timeLeft: 0, timeLimit: 0, untimed: true })
    expect(o.stars).toBe(2)
  })
})

describe('resolveTime', () => {
  it('omite o tempo no modo sem relógio', () => {
    expect(resolveTime(fase1, { difficulty: 'normal', untimed: true })).toBeUndefined()
  })

  it('ajusta ±20% pela dificuldade', () => {
    expect(resolveTime(fase1, { difficulty: 'normal', untimed: false })).toBe(40)
    expect(resolveTime(fase1, { difficulty: 'easy', untimed: false })).toBe(48)
    expect(resolveTime(fase1, { difficulty: 'hard', untimed: false })).toBe(32)
  })
})

describe('todos os casos da tabela-verdade de cada fase', () => {
  it.each([
    { phase: fase1, placements: { s1: 'AND' } as const },
    { phase: fase2, placements: { s1: 'AND', s2: 'NOT' } as const },
    { phase: fase3, placements: { sOr: 'OR', sAnd: 'AND', sNot: 'NOT', sFinal: 'AND' } as const },
    { phase: fase4, placements: { sG1: 'AND', sG2: 'NOT', sFinal: 'OR' } as const },
  ])('fase $phase.id passa em todos os $phase.targetTruthTable.length casos', ({
    phase,
    placements,
  }) => {
    let g = createGame(phase)
    for (const [slotId, gate] of Object.entries(placements)) {
      g = placeGate(g, slotId, gate as 'AND' | 'OR' | 'NOT').state
    }
    expect(checkCircuit(g)).toEqual({ type: 'won' })
  })
})
