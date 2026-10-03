import type { Rng } from '@/engine/random'
import type { ComboState } from '@/engine/scoring/scoring'
import type { MemoryState } from '@/games/shared/memory'
import type { MemoryPhase } from '../phases'

export type RequestKind = 'write' | 'read'

export interface MemoryRequest {
  id: number
  kind: RequestKind
  address: number
  /** Valor a escrever (`write`) ou valor esperado na leitura (`read`). */
  value: number
  /** A escrita vai sobrescrever um valor que já estava na gaveta (Fase 3). */
  overwrite: boolean
  secondsLeft: number
  totalSeconds: number
}

export type MemoryGameEvent =
  | { type: 'request'; request: MemoryRequest }
  | { type: 'select' }
  | { type: 'hit'; kind: RequestKind; address: number; value: number }
  | { type: 'mistake'; reason: 'wrong' | 'expired' | 'not-selected' }
  | { type: 'power-loss' }
  | { type: 'won' }
  | { type: 'lost' }

export interface MemoryConfig {
  shelfSize: number
  columns: number
  addressFormat: 'decimal' | 'binary'
  requestsGoal: number
  secondsPerRequest: number
  maxMistakes: number
  overwriteShare: number
  powerLossAfter: readonly number[]
  /** Falso no tutorial e no modo sem tempo: fichas nunca expiram. */
  timed: boolean
  canLose: boolean
  starMetric: 'timeLeft' | 'mistakesLeft'
  starThresholds: readonly [number, number]
}

export interface MemoryGameState {
  phase: MemoryPhase
  config: MemoryConfig
  memory: MemoryState
  rng: Rng
  request: MemoryRequest | null
  /** A ficha do pedido atual foi "pega" (tocada) pelo jogador. */
  selected: boolean
  requestsDone: number
  mistakes: number
  nextRequestId: number
  scoring: ComboState
  elapsed: number
  /** Soma de (tempo restante / tempo total) a cada acerto, para a métrica `timeLeft`. */
  timeBonusAcc: number
  powerLossesDone: number
  status: 'playing' | 'won' | 'lost'
  /** Eventos gerados pela última ação ou passo. A cena consome e descarta. */
  events: MemoryGameEvent[]
}

export interface ResolveOptions {
  untimed: boolean
}

export const UNTIMED_SPEED = 0.75

export function resolveConfig(phase: MemoryPhase, o: ResolveOptions): MemoryConfig {
  const tutorial = phase.kind === 'tutorial'
  return {
    shelfSize: phase.shelfSize,
    columns: phase.columns,
    addressFormat: phase.addressFormat,
    requestsGoal: phase.requestsGoal,
    secondsPerRequest: phase.secondsPerRequest,
    maxMistakes: phase.maxMistakes,
    overwriteShare: phase.overwriteShare,
    powerLossAfter: phase.powerLossAfter,
    timed: !tutorial && !o.untimed,
    canLose: phase.canLose,
    starMetric: phase.stars.metric,
    starThresholds: phase.stars.thresholds,
  }
}
