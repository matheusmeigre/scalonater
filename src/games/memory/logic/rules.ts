/**
 * Regras da Memória como funções puras: (estado, entrada) → novo estado.
 * Cada função devolve um "rascunho" com os eventos que gerou, para a cena
 * tocar sons, mudar a fala do Kernel e avançar o tutorial (mesmo padrão do
 * Núcleos, `games/cores/logic/rules.ts`).
 */
import { createRng, roller } from '@/engine/random'
import { breakCombo, emptyCombo, registerHit } from '@/engine/scoring/scoring'
import { createMemory, eraseAll, readMemory, writeMemory } from '@/games/shared/memory'
import type { MemoryPhase } from '../phases'
import type { MemoryConfig, MemoryGameState, MemoryRequest, RequestKind } from './model'

export const RULES = {
  hitBase: 20,
  comboStep: 5,
} as const

type MistakeReason = 'wrong' | 'expired' | 'not-selected'

/** Pedidos fixos do tutorial: guardar 7 na gaveta 2, depois ler a gaveta 2. */
const TUTORIAL_SCRIPT: readonly { kind: RequestKind; address: number; value: number }[] = [
  { kind: 'write', address: 2, value: 7 },
  { kind: 'read', address: 2, value: 7 },
]

function draft(s: MemoryGameState): MemoryGameState {
  return { ...s, events: [] }
}

export function createGame(
  phase: MemoryPhase,
  config: MemoryConfig,
  seed: number,
): MemoryGameState {
  const base: MemoryGameState = {
    phase,
    config,
    memory: createMemory(config.shelfSize),
    rng: createRng(seed),
    request: null,
    selected: false,
    requestsDone: 0,
    mistakes: 0,
    nextRequestId: 1,
    scoring: emptyCombo(),
    elapsed: 0,
    timeBonusAcc: 0,
    powerLossesDone: 0,
    status: 'playing',
    events: [],
  }
  return enqueueRequest(base)
}

/**
 * Gera o próximo pedido deterministicamente a partir da semente guardada no
 * estado (mesmo seed → mesma sequência). No tutorial, segue `TUTORIAL_SCRIPT`
 * em vez de sortear.
 */
export function enqueueRequest(s: MemoryGameState): MemoryGameState {
  if (s.status !== 'playing') return s
  if (s.requestsDone >= s.config.requestsGoal) return s
  const d = draft(s)

  if (d.phase.kind === 'tutorial') {
    const next = TUTORIAL_SCRIPT[d.requestsDone]
    if (!next) return d
    const request: MemoryRequest = {
      id: d.nextRequestId,
      ...next,
      overwrite: false,
      secondsLeft: 0,
      totalSeconds: 0,
    }
    d.request = request
    d.selected = false
    d.nextRequestId += 1
    d.events.push({ type: 'request', request })
    return d
  }

  const holder = { rng: d.rng }
  const roll = roller(holder)
  const size = d.config.shelfSize
  const occupied = d.memory.cells.filter((c) => c.value !== null).map((c) => c.address)

  const kind: RequestKind = occupied.length === 0 ? 'write' : roll() < 0.5 ? 'write' : 'read'

  let address: number
  let value: number
  let overwrite = false

  if (kind === 'read') {
    address = occupied[Math.floor(roll() * occupied.length)]!
    value = d.memory.cells[address]!.value!
  } else {
    const wantsOverwrite = occupied.length > 0 && roll() < d.config.overwriteShare
    address = wantsOverwrite
      ? occupied[Math.floor(roll() * occupied.length)]!
      : Math.floor(roll() * size)
    value = Math.floor(roll() * 100)
    overwrite = d.memory.cells[address]!.value !== null
  }

  const totalSeconds = d.config.secondsPerRequest
  const request: MemoryRequest = {
    id: d.nextRequestId,
    kind,
    address,
    value,
    overwrite,
    secondsLeft: totalSeconds,
    totalSeconds,
  }
  d.rng = holder.rng
  d.request = request
  d.selected = false
  d.nextRequestId += 1
  d.events.push({ type: 'request', request })
  return d
}

/** Toque na ficha do pedido atual: "pega" o valor para depositar numa gaveta. */
export function selectRequest(s: MemoryGameState): MemoryGameState {
  if (s.status !== 'playing' || !s.request || s.selected) return s
  const d = draft(s)
  d.selected = true
  d.events.push({ type: 'select' })
  return d
}

function finishIfWon(d: MemoryGameState) {
  if (d.requestsDone >= d.config.requestsGoal) {
    d.status = 'won'
    d.request = null
    d.events.push({ type: 'won' })
  }
}

function registerMistake(d: MemoryGameState, reason: MistakeReason) {
  d.mistakes += 1
  d.scoring = breakCombo(d.scoring)
  d.events.push({ type: 'mistake', reason })
  if (d.config.maxMistakes > 0 && d.mistakes >= d.config.maxMistakes) {
    d.status = 'lost'
    d.request = null
    d.events.push({ type: 'lost' })
  }
}

/**
 * Fase 4 (queda de energia): zera a estante inteira com `eraseAll` (módulo
 * compartilhado). Pura e idempotente por chamada — quem chama decide quando
 * (ver `maybeApplyPowerLoss`, usado por `tapDrawer` após cada acerto).
 */
export function applyPowerLoss(s: MemoryGameState): MemoryGameState {
  const d = draft(s)
  const { state: memory } = eraseAll(d.memory)
  d.memory = memory
  d.powerLossesDone += 1
  d.events.push({ type: 'power-loss' })
  return d
}

/** Dispara `applyPowerLoss` quando `requestsDone` cruza um índice de `config.powerLossAfter`. */
function maybeApplyPowerLoss(d: MemoryGameState): MemoryGameState {
  const triggersSoFar = d.config.powerLossAfter.filter((n) => d.requestsDone >= n).length
  if (triggersSoFar <= d.powerLossesDone) return d
  const next = applyPowerLoss(d)
  return { ...next, events: [...d.events, ...next.events] }
}

/** Toque numa gaveta: resolve o pedido atual se o endereço bater. */
export function tapDrawer(s: MemoryGameState, address: number): MemoryGameState {
  if (s.status !== 'playing' || !s.request) return s
  const d = draft(s)
  const req = d.request!

  if (req.kind === 'write' && !d.selected) {
    registerMistake(d, 'not-selected')
    return d
  }

  if (address !== req.address) {
    registerMistake(d, 'wrong')
    return d
  }

  if (req.kind === 'write') {
    d.memory = writeMemory(d.memory, address, req.value).state
  } else {
    readMemory(d.memory, address) // só confirma: a leitura não muda o estado
  }

  const bonus = d.config.timed && req.totalSeconds > 0 ? req.secondsLeft / req.totalSeconds : 1
  d.timeBonusAcc += bonus
  d.requestsDone += 1
  d.scoring = registerHit(d.scoring, RULES.hitBase, RULES.comboStep)
  d.events.push({ type: 'hit', kind: req.kind, address, value: req.value })
  d.request = null

  finishIfWon(d)
  if (d.status !== 'playing') return d
  const withPowerLoss = maybeApplyPowerLoss(d)
  return enqueueRequest(withPowerLoss)
}

export type SubmitAction = { type: 'select' } | { type: 'tap'; address: number }

/** Reúne `selectRequest`/`tapDrawer` numa função só, como o design doc descreve. */
export function submitRequest(s: MemoryGameState, action: SubmitAction): MemoryGameState {
  return action.type === 'select' ? selectRequest(s) : tapDrawer(s, action.address)
}

/** Passo de simulação: conta o tempo e expira a ficha atual, se for o caso. */
export function tick(s: MemoryGameState, dt: number): MemoryGameState {
  if (s.status !== 'playing' || dt <= 0) return s
  const d = draft(s)
  d.elapsed += dt
  if (d.config.timed && d.request && d.request.totalSeconds > 0) {
    const secondsLeft = Math.max(0, d.request.secondsLeft - dt)
    d.request = { ...d.request, secondsLeft }
    if (secondsLeft <= 0) {
      d.request = null
      registerMistake(d, 'expired')
      if (d.status === 'playing') return enqueueRequest(d)
    }
  }
  return d
}

export type { MemoryGameEvent, MemoryGameState, MemoryRequest } from './model'
