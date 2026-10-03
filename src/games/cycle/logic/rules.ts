/**
 * Regras do Ciclo da CPU como funções puras: (estado, entrada) → novo estado.
 * Cada função devolve um "rascunho" com os eventos que gerou, para a cena
 * tocar sons, mudar a fala do Kernel e avançar o tutorial (mesmo padrão da
 * Memória, `games/memory/logic/rules.ts`).
 */
import { createRng } from '@/engine/random'
import { breakCombo, emptyCombo, registerHit } from '@/engine/scoring/scoring'
import { createMemory, readMemory, writeMemory } from '@/games/shared/memory'
import { decodeCellValue, encodeInstruction } from './encode'
import type {
  CycleConfig,
  CycleExecuteTarget,
  CycleGameState,
  CycleInstruction,
} from './model'
import type { CyclePhase } from '../phases'

export const RULES = {
  hitBase: 20,
  comboStep: 5,
} as const

type MistakeReason = 'decode' | 'expired'

function draft(s: CycleGameState): CycleGameState {
  return { ...s, events: [] }
}

/** Grava o programa (codificado) e os dados da fase na memória, a partir do endereço 0. */
export function loadProgram(phase: CyclePhase, shelfSize: number) {
  let memory = createMemory(shelfSize)
  phase.program.forEach((instr, address) => {
    memory = writeMemory(memory, address, encodeInstruction(instr)).state
  })
  for (const d of phase.data ?? []) {
    memory = writeMemory(memory, d.address, d.value).state
  }
  return memory
}

export function createGame(phase: CyclePhase, config: CycleConfig, seed: number): CycleGameState {
  return {
    phase,
    config,
    memory: loadProgram(phase, config.shelfSize),
    rng: createRng(seed),
    pc: 0,
    acc: 0,
    stage: 'fetch',
    fetched: null,
    mistakes: 0,
    loopIterations: 0,
    executedCount: 0,
    scoring: emptyCombo(),
    elapsed: 0,
    stationSecondsLeft: config.secondsPerStation,
    timeBonusAcc: 0,
    timeBonusCount: 0,
    status: 'playing',
    events: [],
  }
}

function registerMistake(d: CycleGameState, reason: MistakeReason) {
  d.mistakes += 1
  d.scoring = breakCombo(d.scoring)
  d.events.push({ type: 'mistake', reason })
  if (d.config.maxMistakes > 0 && d.mistakes >= d.config.maxMistakes) {
    d.status = 'lost'
    d.events.push({ type: 'lost' })
  }
}

/**
 * Buscar: lê a gaveta apontada pelo PC e decodifica a instrução. Só age
 * quando a estação atual é "fetch"; endereços sem instrução válida (programa
 * malformado) não avançam — não deveria acontecer com as fases desta estação.
 */
export function fetchInstruction(s: CycleGameState): CycleGameState {
  if (s.status !== 'playing' || s.stage !== 'fetch') return s
  const d = draft(s)
  const { event } = readMemory(d.memory, d.pc)
  const value = event.type === 'read' ? event.value : null
  const instruction = decodeCellValue(value)
  if (!instruction) return d
  d.fetched = instruction
  d.stage = 'decode'
  d.events.push({ type: 'fetched', address: d.pc, instruction })
  return d
}

/**
 * Decodificar: compara `chosenOp` com a operação buscada. Acerto avança para
 * "pronto para executar"; erro soma 1 a `mistakes` e quebra o combo, mas
 * deixa o jogador tentar de novo (a estação "decode" continua ativa).
 */
export function decodeStation(
  s: CycleGameState,
  chosenOp: CycleInstruction['op'],
): CycleGameState {
  if (s.status !== 'playing' || s.stage !== 'decode' || !s.fetched) return s
  const fetched = s.fetched
  const d = draft(s)
  const correct = chosenOp === fetched.op
  d.events.push({ type: 'decoded', correct, chosen: chosenOp })
  if (!correct) {
    registerMistake(d, 'decode')
    return d
  }
  d.stage = 'execute'
  return d
}

function finishIfDone(d: CycleGameState) {
  if (d.executedCount < d.config.totalExecutions) return
  const goalOk = d.config.goalAcc === null || d.acc === d.config.goalAcc
  if (goalOk) {
    d.status = 'won'
    d.events.push({ type: 'won' })
  } else {
    d.status = 'lost'
    d.events.push({ type: 'lost' })
  }
}

/**
 * Executar: aplica o efeito da instrução já decodificada (`CARREGA`/`SOMA`
 * leem a memória, `GUARDA` escreve, `PULA`/`PULASZ` mudam o PC) e avança o PC
 * em 1 quando a instrução não é um desvio tomado. Conta uma repetição de
 * laço sempre que um desvio tomado volta para um endereço igual ou anterior
 * ao da própria instrução.
 */
export function executeStation(s: CycleGameState): CycleGameState {
  if (s.status !== 'playing' || s.stage !== 'execute' || !s.fetched) return s
  const instr = s.fetched
  const d = draft(s)
  const pcBefore = d.pc
  const accBefore = d.acc
  let nextPc = d.pc + 1
  let target: CycleExecuteTarget

  switch (instr.op) {
    case 'CARREGA': {
      const { event } = readMemory(d.memory, instr.address)
      d.acc = event.type === 'read' ? (event.value ?? 0) : 0
      target = { kind: 'acc' }
      break
    }
    case 'SOMA': {
      const { event } = readMemory(d.memory, instr.address)
      d.acc = d.acc + (event.type === 'read' ? (event.value ?? 0) : 0)
      target = { kind: 'acc' }
      break
    }
    case 'GUARDA': {
      d.memory = writeMemory(d.memory, instr.address, d.acc).state
      target = { kind: 'memory', address: instr.address }
      break
    }
    case 'PULA': {
      nextPc = instr.address
      target = { kind: 'pc' }
      break
    }
    case 'PULASZ': {
      if (d.acc !== 0) nextPc = instr.address
      target = { kind: 'pc' }
      break
    }
  }

  const isBranch = instr.op === 'PULA' || instr.op === 'PULASZ'
  const branchTaken = isBranch && nextPc !== pcBefore + 1
  if (branchTaken && nextPc <= pcBefore) d.loopIterations += 1

  d.pc = nextPc
  d.executedCount += 1
  d.stage = 'fetch'
  d.fetched = null
  const bonus =
    d.config.timed && d.config.secondsPerStation > 0
      ? d.stationSecondsLeft / d.config.secondsPerStation
      : 1
  d.timeBonusAcc += bonus
  d.timeBonusCount += 1
  d.stationSecondsLeft = d.config.secondsPerStation
  d.scoring = registerHit(d.scoring, RULES.hitBase, RULES.comboStep)

  d.events.push({
    type: 'executed',
    instruction: instr,
    pcBefore,
    pcAfter: d.pc,
    accBefore,
    accAfter: d.acc,
    target,
  })

  if (d.config.maxLoopIterations !== null && d.loopIterations > d.config.maxLoopIterations) {
    d.status = 'lost'
    d.events.push({ type: 'looped-too-much' }, { type: 'lost' })
    return d
  }

  finishIfDone(d)
  return d
}

/** Passo de simulação: conta o tempo e expira a estação atual, se for o caso. */
export function tick(s: CycleGameState, dt: number): CycleGameState {
  if (s.status !== 'playing' || dt <= 0) return s
  const d = draft(s)
  d.elapsed += dt
  if (!d.config.timed) return d
  const secondsLeft = Math.max(0, d.stationSecondsLeft - dt)
  d.stationSecondsLeft = secondsLeft
  if (secondsLeft <= 0) {
    d.stationSecondsLeft = d.config.secondsPerStation
    registerMistake(d, 'expired')
  }
  return d
}

export type { CycleEvent, CycleGameState } from './model'
