import { describe, expect, it } from 'vitest'
import { readMemory } from '@/games/shared/memory'
import { decodeInstruction } from './encode'
import { computeOutcome } from './outcome'
import { resolveConfig } from './model'
import {
  createGame,
  decodeStation,
  executeStation,
  fetchInstruction,
  loadProgram,
  tick,
  type CycleGameState,
} from './rules'
import { PHASES, type CyclePhase } from '../phases'

const [TUTORIAL, NIVEL1, NIVEL2, NIVEL3, NIVEL4] = PHASES as readonly [
  CyclePhase,
  CyclePhase,
  CyclePhase,
  CyclePhase,
  CyclePhase,
]

function newGame(phase: CyclePhase, untimed = false, seed = 1) {
  const config = resolveConfig(phase, { untimed })
  return createGame(phase, config, seed)
}

/** Resolve a instrução atual (buscar → decodificar → executar) sem erros. */
function runOneInstruction(state: CycleGameState): CycleGameState {
  let s = fetchInstruction(state)
  const chosen = s.fetched!.op
  s = decodeStation(s, chosen)
  s = executeStation(s)
  return s
}

/** Roda o programa inteiro sem nenhum erro de decodificação. */
function runToEnd(state: CycleGameState): CycleGameState {
  let s = state
  let guard = 0
  while (s.status === 'playing' && guard < 1000) {
    s = runOneInstruction(s)
    guard += 1
  }
  return s
}

describe('loadProgram', () => {
  it('grava o programa codificado e os dados a partir do endereço 0', () => {
    const memory = loadProgram(NIVEL1, NIVEL1.shelfSize)
    const first = readMemory(memory, 0).event
    expect(first).toEqual({ type: 'read', address: 0, value: 100 + 4 })
    expect(first.type).toBe('read')
    expect(decodeInstruction((first as { value: number }).value)).toEqual({
      op: 'CARREGA',
      address: 4,
    })
    const dataCell = readMemory(memory, 4).event
    expect((dataCell as { value: number }).value).toBe(3) // dado, não instrução
  })
})

describe('createGame', () => {
  it('é determinístico com a mesma semente (não há sorteio no programa)', () => {
    const a = newGame(NIVEL1, false, 7)
    const b = newGame(NIVEL1, false, 7)
    expect(a.memory).toEqual(b.memory)
    expect(a.pc).toBe(b.pc)
    expect(a.acc).toBe(b.acc)
  })
})

describe('fetchInstruction / decodeStation / executeStation', () => {
  it('busca a instrução apontada pelo PC e avança para "decode"', () => {
    const s = fetchInstruction(newGame(NIVEL1))
    expect(s.stage).toBe('decode')
    expect(s.fetched).toEqual({ op: 'CARREGA', address: 4 })
    expect(s.events).toEqual([{ type: 'fetched', address: 0, instruction: s.fetched }])
  })

  it('decodificar certo avança para "execute"; errado soma um erro e mantém "decode"', () => {
    const fetched = fetchInstruction(newGame(NIVEL1))
    const wrong = decodeStation(fetched, 'SOMA')
    expect(wrong.stage).toBe('decode')
    expect(wrong.mistakes).toBe(1)

    const right = decodeStation(wrong, 'CARREGA')
    expect(right.stage).toBe('execute')
    expect(right.mistakes).toBe(1)
  })

  it('CARREGA põe o valor da gaveta no acumulador e avança o PC em 1', () => {
    let s = fetchInstruction(newGame(NIVEL1))
    s = decodeStation(s, 'CARREGA')
    s = executeStation(s)
    expect(s.acc).toBe(3) // valor da gaveta 4
    expect(s.pc).toBe(1)
    expect(s.stage).toBe('fetch')
    expect(s.executedCount).toBe(1)
  })

  it('SOMA acumula e GUARDA escreve o acumulador na gaveta', () => {
    let s = runOneInstruction(newGame(NIVEL1)) // CARREGA 4 → ACC=3
    s = runOneInstruction(s) // SOMA 5 → ACC=3+4=7
    expect(s.acc).toBe(7)
    s = runOneInstruction(s) // GUARDA 4 → mem[4]=7
    const written = readMemory(s.memory, 4).event
    expect((written as { value: number }).value).toBe(7)
  })

  it('PULA muda o PC sem somar 1', () => {
    let s = newGame(NIVEL1)
    for (let i = 0; i < 3; i++) s = runOneInstruction(s) // CARREGA, SOMA, GUARDA
    expect(s.pc).toBe(3)
    s = runOneInstruction(s) // PULA 00
    expect(s.pc).toBe(0)
  })
})

describe('vitória e derrota', () => {
  it('fase 1: completa as 4 execuções e vence (sem meta de ACC)', () => {
    const s = runToEnd(newGame(NIVEL1))
    expect(s.status).toBe('won')
    expect(s.executedCount).toBe(4)
    expect(computeOutcome(s).won).toBe(true)
    expect(computeOutcome(s).stars).toBeGreaterThanOrEqual(1)
  })

  it('fase 2: vence só quando o ACC final bate a meta (15)', () => {
    const s = runToEnd(newGame(NIVEL2))
    expect(s.status).toBe('won')
    expect(s.acc).toBe(15)
  })

  it('fase 3: o laço repete e termina sem passar do limite de segurança', () => {
    const s = runToEnd(newGame(NIVEL3))
    expect(s.status).toBe('won')
    expect(s.loopIterations).toBe(2) // 3 repetições do laço = 2 saltos de volta
    expect(s.executedCount).toBe(16)
  })

  it('derrota ao atingir maxMistakes (decodificações erradas)', () => {
    let s = newGame(NIVEL1)
    for (let i = 0; i < NIVEL1.maxMistakes; i++) {
      s = fetchInstruction(s)
      s = decodeStation(s, s.fetched!.op === 'SOMA' ? 'CARREGA' : 'SOMA') // sempre errado
    }
    expect(s.status).toBe('lost')
    expect(s.mistakes).toBe(NIVEL1.maxMistakes)
  })

  it('derrota por estação expirada (modo com relógio)', () => {
    let s = newGame(NIVEL1, false)
    for (let i = 0; i < NIVEL1.maxMistakes; i++) {
      s = tick(s, NIVEL1.secondsPerStation + 1)
    }
    expect(s.status).toBe('lost')
  })

  it('modo sem tempo nunca expira', () => {
    const s = tick(newGame(NIVEL1, true), 1000)
    expect(s.status).toBe('playing')
    expect(s.mistakes).toBe(0)
  })

  it('a fase 3 conta uma repetição de laço por volta tomada', () => {
    let s = newGame(NIVEL3)
    for (let i = 0; i < 4; i++) s = runOneInstruction(s) // 1ª passada do laço completa
    expect(s.loopIterations).toBe(1)
    for (let i = 0; i < 4; i++) s = runOneInstruction(s) // 2ª passada
    expect(s.loopIterations).toBe(2)
  })

  it('maxLoopIterations protege contra um laço que nunca para', () => {
    // Programa artificial: PULA incondicional de volta ao início — nunca sai
    // do laço por conta própria. Testa a regra de proteção isoladamente.
    const loopForever: CyclePhase = {
      ...NIVEL3,
      program: [{ op: 'PULA', address: 0 }],
      maxLoopIterations: 3,
      totalExecutions: 1000,
      maxMistakes: 0,
    }
    let s = newGame(loopForever)
    for (let i = 0; i < 10 && s.status === 'playing'; i++) s = runOneInstruction(s)
    expect(s.status).toBe('lost')
    expect(s.loopIterations).toBe(4) // excedeu o limite de 3
  })
})

describe('tutorial', () => {
  it('nunca perde mesmo com o tempo passando', () => {
    const s = tick(newGame(TUTORIAL), 1000)
    expect(s.status).toBe('playing')
  })

  it('vence com uma única instrução', () => {
    const s = runToEnd(newGame(TUTORIAL))
    expect(s.status).toBe('won')
  })
})

describe('fase 4', () => {
  it('usa metade do tempo por estação da fase 2 e a mesma meta de ACC', () => {
    expect(NIVEL4.secondsPerStation).toBe(NIVEL2.secondsPerStation / 2)
    const s = runToEnd(newGame(NIVEL4))
    expect(s.status).toBe('won')
    expect(s.acc).toBe(NIVEL2.goalAcc)
  })
})
