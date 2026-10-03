import { createRng, type Rng } from '@/engine/random'
import {
  emptyCombo,
  registerHit,
  starsFor,
  type ComboState,
  type StarCount,
} from '@/engine/scoring/scoring'
import { computeAluOp } from '@/games/alu/logic/rules'
import type { AluOp } from '@/games/alu/phases'
import { fromBits } from '@/games/shared/binary'
import type { PixelPhase, PixelStep } from '../phases'

/**
 * Regras puras da jornada "Do clique ao pixel" (estado → estado, sem React —
 * mesmo padrão de todas as outras estações). Cada microtarefa delega, quando
 * possível, para a função pura já testada da estação de origem (`alu`), sem
 * copiar lógica (design doc, "Regras puras a testar").
 */

/** Operandos fixos da mini-ULA (microtarefa "escolher Soma"). */
const ALU_A = 5
const ALU_B = 3
const ALU_BITS = 8

/** Endereço fixo do pedido repetido na mini-cache (1ª vez falha, 2ª acerta). */
export const CACHE_ADDRESS = 42

export interface PixelState {
  phase: PixelPhase
  rng: Rng
  status: 'playing' | 'won' | 'lost'
  scoring: ComboState
  /** Quantos passos de `phase.steps` já foram confirmados. */
  stepIndex: number
  /** Fase 1 (Decisão). */
  threadScheduled: boolean
  cyclePulse: 'fetch' | 'decode' | 'execute' | null
  aluOp: AluOp | null
  aluResult: number | null
  /** Fase 2 (Dados): endereços já pedidos na mini-cache, na ordem. */
  cacheRequests: readonly number[]
  lastCacheOutcome: 'hit' | 'miss' | null
  diskReadCount: number
  /** Fase 3 (Saída). */
  bits: readonly (0 | 1)[]
  togglesCount: number
}

function currentStep(state: PixelState): PixelStep | undefined {
  return state.phase.steps[state.stepIndex]
}

export function createGame(phase: PixelPhase, seed: number): PixelState {
  const prefilled = phase.prefilledCount ?? 0
  const bits = (phase.targetImage ?? []).map((v, i) => (i < prefilled ? v : (0 as 0 | 1)))
  return {
    phase,
    rng: createRng(seed),
    status: 'playing',
    scoring: emptyCombo(),
    stepIndex: 0,
    threadScheduled: false,
    cyclePulse: null,
    aluOp: null,
    aluResult: null,
    cacheRequests: [],
    lastCacheOutcome: null,
    diskReadCount: 0,
    bits,
    togglesCount: 0,
  }
}

/**
 * Confirma um passo de uma fase de vários passos (Fases 1 e 2) na ordem
 * declarada em `phase.steps`. Fora de ordem é ignorado: não há "erro fatal",
 * só o Kernel repetindo a dica (padrão de tutorial "pular adiante" do
 * projeto, aqui aplicado aos passos de nível em vez de ao tutorial).
 */
export function advanceStep(state: PixelState, stepId: string): PixelState {
  if (state.status !== 'playing') return state
  const step = currentStep(state)
  if (!step || step.id !== stepId) return state
  const stepIndex = state.stepIndex + 1
  const scoring = registerHit(state.scoring, 20, 5)
  const won = stepIndex >= state.phase.steps.length
  return { ...state, stepIndex, scoring, status: won ? 'won' : 'playing' }
}

/** Mini-`cores`: marca a thread única como rodando no único núcleo livre. */
export function scheduleThread(state: PixelState): PixelState {
  if (state.status !== 'playing' || state.threadScheduled) return state
  return advanceStep({ ...state, threadScheduled: true }, 'schedule')
}

/** Avança Buscar → Decodificar → Executar uma vez (uma única instrução fixa). */
export function runCycleStep(state: PixelState): PixelState {
  if (state.status !== 'playing') return state
  const order = ['fetch', 'decode', 'execute'] as const
  const idx = state.cyclePulse ? order.indexOf(state.cyclePulse) + 1 : 0
  if (idx >= order.length) return state
  const cyclePulse = order[idx]!
  const next = { ...state, cyclePulse }
  return cyclePulse === 'execute' ? advanceStep(next, 'cycle') : next
}

/**
 * Delega para `computeAluOp` (import direto, sem copiar a lógica) e confere
 * `op === 'add'`: escolher outra operação não avança (o jogador tenta de
 * novo, sem perder vida).
 */
export function selectAluOp(state: PixelState, op: AluOp): PixelState {
  if (state.status !== 'playing') return state
  const aluResult = fromBits(computeAluOp(ALU_A, ALU_B, op, ALU_BITS).result)
  const next = { ...state, aluOp: op, aluResult }
  return op === 'add' ? advanceStep(next, 'alu') : next
}

/**
 * Mini-`cache`, 1 espaço só: a sequência fixa (mesmo endereço duas vezes)
 * sempre gera 1 falha seguida de 1 acerto, nessa ordem (localidade
 * temporal) — determinístico, sem sorteio.
 */
export function resolveCacheStep(state: PixelState, address: number): PixelState {
  if (state.status !== 'playing' || currentStep(state)?.id !== 'cache') return state
  const hit = state.cacheRequests.includes(address)
  const cacheRequests = [...state.cacheRequests, address]
  const scoring = registerHit(state.scoring, hit ? 25 : 10, 5)
  const next = {
    ...state,
    cacheRequests,
    lastCacheOutcome: hit ? ('hit' as const) : ('miss' as const),
    scoring,
  }
  return cacheRequests.length >= 2 ? advanceStep(next, 'cache') : next
}

/** "Lê" os blocos de `phase.diskSequence` na ordem certa; fora de ordem não avança. */
export function readDiskBlocks(state: PixelState, blockIndex: number): PixelState {
  if (state.status !== 'playing' || currentStep(state)?.id !== 'disk') return state
  const seq = state.phase.diskSequence ?? []
  const expected = seq[state.diskReadCount]
  if (expected === undefined || blockIndex !== expected) return state
  const diskReadCount = state.diskReadCount + 1
  const scoring = registerHit(state.scoring, 15, 5)
  const next = { ...state, diskReadCount, scoring }
  return diskReadCount >= seq.length ? advanceStep(next, 'disk') : next
}

function bitsMatch(a: readonly (0 | 1)[], b: readonly (0 | 1)[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

/**
 * Alterna um bit não pré-marcado da grade 8×8 (Fase 3). Bits em
 * `prefilledCount` já vêm fixos e não podem ser alternados.
 */
export function togglePixelBit(state: PixelState, index: number): PixelState {
  if (state.status === 'lost') return state
  const prefilled = state.phase.prefilledCount ?? 0
  if (index < prefilled) return state
  const bits = state.bits.slice() as (0 | 1)[]
  bits[index] = bits[index] === 1 ? 0 : 1
  const togglesCount = state.togglesCount + 1
  const target = state.phase.targetImage ?? []
  const won = target.length > 0 && bitsMatch(bits, target)
  const scoring = won ? registerHit(state.scoring, 50, 10) : state.scoring
  return { ...state, bits, togglesCount, scoring, status: won ? 'won' : state.status }
}

/** Fecha o tutorial guiado (capítulo "Entrada"): nunca perde. */
export function completeTutorial(state: PixelState): PixelState {
  if (state.status !== 'playing') return state
  return { ...state, status: 'won', scoring: registerHit(state.scoring, 30, 0) }
}

/** Tempo esgotou (só Fases 1-2: derrota leve, nunca na Fase 3). */
export function loseGame(state: PixelState): PixelState {
  if (state.status !== 'playing') return state
  return { ...state, status: 'lost' }
}

export interface PixelOutcome {
  won: boolean
  stars: StarCount
  score: number
}

/**
 * Vitória ao concluir todos os `steps` (Fases 1-2) ou toda a grade (Fase 3).
 * Estrelas sempre ≥ 1 em vitória: tempo restante nas Fases 1-2 (réplica do
 * padrão ≥30%→3, ≥12%→2) e, na Fase 3 (sem relógio), eficiência de toques
 * (menos toques fora do alvo = mais estrelas, mesmo espírito do bônus de
 * eficiência de `bits`).
 */
export function computeOutcome(state: PixelState, elapsed: number): PixelOutcome {
  if (state.phase.chapter === 'saida') {
    const prefilled = state.phase.prefilledCount ?? 0
    const toComplete = Math.max(1, (state.phase.targetImage?.length ?? 0) - prefilled)
    const extra = Math.max(0, state.togglesCount - toComplete)
    const efficiency = Math.max(0, 1 - extra / toComplete)
    return {
      won: state.status === 'won',
      stars: state.status === 'won' ? starsFor(efficiency, [0.5, 0.85]) : 0,
      score: state.scoring.score,
    }
  }
  const remainingShare =
    state.phase.secondsLimit > 0
      ? Math.max(0, (state.phase.secondsLimit - elapsed) / state.phase.secondsLimit)
      : 1
  return {
    won: state.status === 'won',
    stars: state.status === 'won' ? starsFor(remainingShare, [0.12, 0.3]) : 0,
    score: state.scoring.score,
  }
}
