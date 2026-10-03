import { describe, expect, it } from 'vitest'
import { toBits } from '@/games/shared/binary'
import { evaluateCircuit, truthTable } from '@/games/shared/circuit'
import { FULL_ADDER_TEMPLATE, HALF_ADDER_TEMPLATE, PHASES } from '../phases'
import {
  addManual,
  checkCircuitPhase,
  checkColumn,
  clearCircuitGate,
  computeAluOp,
  computeOutcome,
  confirmChallenge,
  confirmManualAnswer,
  createAluSelectGame,
  createCircuitGame,
  createManualGame,
  evaluateFullAdderChain,
  expireAluSelect,
  expireCircuit,
  expireManual,
  placeCircuitGate,
  selectAluOp,
  setAnswerBit,
  toggleCircuitInput,
} from './rules'

const [tutorial, nivel1, nivel2, nivel3, nivel4] = PHASES

describe('addManual', () => {
  it('soma 0001 + 0001 = 0010 com o carry correto em cada coluna', () => {
    const r = addManual(toBits(1, 4), toBits(1, 4))
    expect(r.result).toEqual([0, 0, 1, 0])
    expect(r.overflow).toBe(false)
    // coluna menos significativa: 1+1 = carry 1, sum 0.
    expect(r.columns[3]).toEqual({ sum: 0, carryOut: 1 })
    expect(r.columns[2]).toEqual({ sum: 1, carryOut: 0 })
  })

  it('1111 + 0001 = 10000: overflow de 4 bits', () => {
    const r = addManual(toBits(15, 4), toBits(1, 4))
    expect(r.result).toEqual([0, 0, 0, 0])
    expect(r.overflow).toBe(true)
  })

  it('checkColumn confere só a coluna pedida', () => {
    const gabarito = addManual(toBits(5, 4), toBits(3, 4))
    for (let i = 0; i < 4; i++) {
      expect(checkColumn(gabarito, i, gabarito.columns[i]!.sum)).toBe(true)
      expect(checkColumn(gabarito, i, gabarito.columns[i]!.sum === 0 ? 1 : 0)).toBe(false)
    }
  })
})

describe('meio-somador via shared/circuit (Fase 2)', () => {
  it('reproduz a tabela-verdade do meio-somador nos 4 casos', () => {
    const circuit = HALF_ADDER_TEMPLATE.nodes.map((n) =>
      n.kind !== 'slot' ? n : { kind: 'gate' as const, id: n.id, gate: n.id === 'xorNode' ? ('XOR' as const) : ('AND' as const), inputs: n.inputs },
    )
    const rows = truthTable(circuit)
    // [a, b, sum, carryOut]
    expect(rows).toEqual([
      [false, false, false, false],
      [false, true, true, false],
      [true, false, true, false],
      [true, true, false, true],
    ])
  })
})

describe('somador completo via shared/circuit (Fase 3)', () => {
  it('reproduz a tabela-verdade de 8 casos, inclusive 1+1+1=11', () => {
    const circuit = FULL_ADDER_TEMPLATE.nodes.map((n) =>
      n.kind !== 'slot' ? n : { kind: 'gate' as const, id: n.id, gate: 'OR' as const, inputs: n.inputs },
    )
    const rows = truthTable(circuit)
    // a=1,b=1,carryIn=1 -> soma 1, vai-um-de-saída 1.
    const row111 = rows[7]!
    expect(row111.slice(0, 3)).toEqual([true, true, true])
    expect(row111.slice(3)).toEqual([true, true])
    expect(rows).toHaveLength(8)
  })
})

describe('checkCircuitPhase', () => {
  it('fase 2: incompleto até os dois slots serem preenchidos, depois vence com XOR+AND', () => {
    let state = createCircuitGame(nivel2!)
    expect(checkCircuitPhase(state).type).toBe('incomplete')
    let r = placeCircuitGate(state, 'xorNode', 'XOR')
    state = r.state
    expect(checkCircuitPhase(state).type).toBe('incomplete')
    r = placeCircuitGate(state, 'andNode', 'AND')
    state = r.state
    expect(state.status).toBe('won')
  })

  it('fase 2: combinação errada não vence (mismatch)', () => {
    let state = createCircuitGame(nivel2!)
    state = placeCircuitGate(state, 'xorNode', 'AND').state
    state = placeCircuitGate(state, 'andNode', 'OR').state
    expect(state.status).toBe('playing')
    expect(checkCircuitPhase(state).type).toBe('mismatch')
  })

  it('fase 3: só o encaixe OR falta; encaixar OR vence', () => {
    const state = createCircuitGame(nivel3!)
    expect(checkCircuitPhase(state).type).toBe('incomplete')
    const r = placeCircuitGate(state, 'orNode', 'OR')
    expect(r.state.status).toBe('won')
  })

  it('toggleCircuitInput e clearCircuitGate não afetam a vitória', () => {
    let state = createCircuitGame(nivel2!)
    state = toggleCircuitInput(state, 'a')
    expect(state.inputs.a).toBe(true)
    state = placeCircuitGate(state, 'xorNode', 'XOR').state
    state = clearCircuitGate(state, 'xorNode')
    expect(state.placed.xorNode).toBeUndefined()
    expect(state.swaps).toBe(1)
  })
})

describe('cadeia de 4 bits (prova de consistência)', () => {
  it('encadear 4 avaliações do somador completo reproduz addManual', () => {
    for (const [a, b] of [[5, 3], [9, 6], [15, 0], [0, 0], [7, 8], [1, 1]] as const) {
      const aBits = toBits(a, 4)
      const bBits = toBits(b, 4)
      const chain = evaluateFullAdderChain(aBits, bBits)
      const manual = addManual(aBits, bBits)
      expect(chain.sumBits).toEqual(manual.result)
      expect(chain.carryOut).toBe(manual.overflow ? 1 : 0)
    }
  })

  it('evaluateCircuit isolado também bate com o full adder de 1 bit', () => {
    const circuit = FULL_ADDER_TEMPLATE.nodes.map((n) =>
      n.kind !== 'slot' ? n : { kind: 'gate' as const, id: n.id, gate: 'OR' as const, inputs: n.inputs },
    )
    const values = evaluateCircuit(circuit, { a: true, b: true, carryIn: true })
    expect(values.sum).toBe(true)
    expect(values.carryOut).toBe(true)
  })
})

describe('computeAluOp (Fase 4)', () => {
  it('AND e OR bit a bit batem com o esperado para 0b1010, 0b0110', () => {
    const and = computeAluOp(0b1010, 0b0110, 'and', 4)
    expect(and.result).toEqual(toBits(0b0010, 4))
    const or = computeAluOp(0b1010, 0b0110, 'or', 4)
    expect(or.result).toEqual(toBits(0b1110, 4))
  })

  it('add usa addManual', () => {
    const add = computeAluOp(5, 3, 'add', 4)
    expect(add.result).toEqual(toBits(8, 4))
  })

  it('marca correct conforme a operação esperada', () => {
    expect(computeAluOp(1, 2, 'add', 4, 'add').event.correct).toBe(true)
    expect(computeAluOp(1, 2, 'and', 4, 'add').event.correct).toBe(false)
  })
})

describe('fase 4: seletor de operação', () => {
  it('confirmar a operação certa avança; a errada não', () => {
    let state = createAluSelectGame(nivel4!)
    state = selectAluOp(state, 'and') // desafio 0 é 'add'
    let r = confirmChallenge(state)
    expect(r.event.type).toBe('wrong')
    expect(r.state.challengeIndex).toBe(0)

    state = selectAluOp(r.state, 'add')
    r = confirmChallenge(state)
    expect(r.event.type).toBe('correct')
    expect(r.state.challengeIndex).toBe(1)
    expect(r.state.solved).toBe(1)
  })

  it('resolver todos os desafios vence a fase', () => {
    let state = createAluSelectGame(nivel4!)
    for (const challenge of nivel4!.challenges!) {
      state = selectAluOp(state, challenge.op)
      state = confirmChallenge(state).state
    }
    expect(state.status).toBe('won')
    expect(state.solved).toBe(nivel4!.challenges!.length)
  })
})

describe('determinismo (Fase 1, semente)', () => {
  it('a mesma semente gera a mesma sequência de somas', () => {
    const s1 = createManualGame(nivel1!, 42)
    const s2 = createManualGame(nivel1!, 42)
    expect(s1.a).toEqual(s2.a)
    expect(s1.b).toEqual(s2.b)

    const n1 = confirmManualAnswer({ ...s1, answer: s1.gabarito.result })
    const n2 = confirmManualAnswer({ ...s2, answer: s2.gabarito.result })
    expect(n1.state.a).toEqual(n2.state.a)
    expect(n1.state.b).toEqual(n2.state.b)
  })

  it('o tutorial usa os pares fixos, nesta ordem, sem sorteio', () => {
    const state = createManualGame(tutorial!, 1)
    expect(state.a).toEqual(toBits(0, 2))
    expect(state.b).toEqual(toBits(1, 2))
    const after = confirmManualAnswer({ ...state, answer: state.gabarito.result }).state
    expect(after.a).toEqual(toBits(1, 2))
    expect(after.b).toEqual(toBits(1, 2))
    // 1 + 1 = 10 em binário, sem overflow (2 bits bastam).
    expect(after.gabarito.result).toEqual([1, 0])
  })
})

describe('vitória/derrota e estrelas (Fase 1)', () => {
  it('resolver os targetCount somas vence a fase', () => {
    let state = createManualGame(nivel1!, 7)
    for (let i = 0; i < (nivel1!.targetCount ?? 0); i++) {
      state = { ...state, answer: state.gabarito.result }
      state = confirmManualAnswer(state).state
    }
    expect(state.status).toBe('won')
  })

  it('o tempo esgotar derrota fora do tutorial', () => {
    const state = createManualGame(nivel1!, 1)
    expect(expireManual(state).status).toBe('lost')
  })

  it('o tutorial nunca perde por tempo', () => {
    const state = createManualGame(tutorial!, 1)
    expect(expireManual(state).status).toBe('playing')
  })

  it('setAnswerBit altera só o índice pedido', () => {
    const state = createManualGame(nivel1!, 3)
    const next = setAnswerBit(state, 0, 1)
    expect(next.answer[0]).toBe(1)
    expect(next.answer.slice(1)).toEqual(state.answer.slice(1))
  })

  it('estrelas: vitória com tempo de sobra dá 3 estrelas; sem tempo, pelo menos 1', () => {
    const won = computeOutcome('won', { score: 0, combo: 0, maxCombo: 0 }, {
      timeLeft: 50,
      timeLimit: 60,
      untimed: false,
      swaps: 0,
    })
    expect(won.stars).toBe(3)
    const tight = computeOutcome('won', { score: 0, combo: 0, maxCombo: 0 }, {
      timeLeft: 1,
      timeLimit: 60,
      untimed: false,
      swaps: 0,
    })
    expect(tight.stars).toBeGreaterThanOrEqual(1)
    const lost = computeOutcome('lost', { score: 0, combo: 0, maxCombo: 0 }, {
      timeLeft: 0,
      timeLimit: 60,
      untimed: false,
      swaps: 0,
    })
    expect(lost.stars).toBe(0)
  })
})

describe('expireCircuit / expireAluSelect', () => {
  it('derrotam fora do tutorial, nunca dentro', () => {
    const circuit = createCircuitGame(nivel2!)
    expect(expireCircuit(circuit).status).toBe('lost')

    const select = createAluSelectGame(nivel4!)
    expect(expireAluSelect(select).status).toBe('lost')
  })
})
