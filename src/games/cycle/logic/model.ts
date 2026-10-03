import type { Rng } from '@/engine/random'
import type { ComboState } from '@/engine/scoring/scoring'
import type { MemoryState } from '@/games/shared/memory'
import type { CyclePhase } from '../phases'

/** Design doc, "Conjunto de instruções" (fixo para toda a estação). */
export interface CycleInstruction {
  op: 'CARREGA' | 'SOMA' | 'GUARDA' | 'PULA' | 'PULASZ'
  address: number
}

/** Qual das três estações o jogador precisa completar a seguir. */
export type CycleStage = 'fetch' | 'decode' | 'execute'

export type CycleExecuteTarget =
  | { kind: 'acc' }
  | { kind: 'memory'; address: number }
  | { kind: 'pc' }

export type CycleEvent =
  | { type: 'fetched'; address: number; instruction: CycleInstruction }
  | { type: 'decoded'; correct: boolean; chosen: CycleInstruction['op'] }
  | {
      type: 'executed'
      instruction: CycleInstruction
      pcBefore: number
      pcAfter: number
      accBefore: number
      accAfter: number
      target: CycleExecuteTarget
    }
  | { type: 'mistake'; reason: 'decode' | 'expired' }
  | { type: 'looped-too-much' }
  | { type: 'won' }
  | { type: 'lost' }

export interface CycleConfig {
  shelfSize: number
  columns: number
  secondsPerStation: number
  maxMistakes: number
  maxLoopIterations: number | null
  goalAcc: number | null
  totalExecutions: number
  /** Falso no tutorial e no modo sem tempo: as estações nunca expiram. */
  timed: boolean
  starMetric: 'timeLeft' | 'mistakesLeft'
  starThresholds: readonly [number, number]
}

export interface CycleGameState {
  phase: CyclePhase
  config: CycleConfig
  memory: MemoryState
  rng: Rng
  /** Contador de programa: endereço da próxima instrução a buscar. */
  pc: number
  /** Acumulador. */
  acc: number
  stage: CycleStage
  /** Instrução já buscada, aguardando decodificação/execução. */
  fetched: CycleInstruction | null
  mistakes: number
  /** Quantas vezes um `PULA`/`PULASZ` tomado voltou para um endereço anterior. */
  loopIterations: number
  executedCount: number
  scoring: ComboState
  elapsed: number
  stationSecondsLeft: number
  /** Soma de (tempo restante / tempo total) a cada execução, para a métrica `timeLeft`. */
  timeBonusAcc: number
  timeBonusCount: number
  status: 'playing' | 'won' | 'lost'
  /** Eventos gerados pela última ação ou passo. A cena consome e descarta. */
  events: CycleEvent[]
}

export interface ResolveOptions {
  untimed: boolean
}

export const UNTIMED_SPEED = 0.75

export function resolveConfig(phase: CyclePhase, o: ResolveOptions): CycleConfig {
  const tutorial = phase.kind === 'tutorial'
  return {
    shelfSize: phase.shelfSize,
    columns: phase.columns,
    secondsPerStation: phase.secondsPerStation,
    maxMistakes: phase.maxMistakes,
    maxLoopIterations: phase.maxLoopIterations ?? null,
    goalAcc: phase.goalAcc ?? null,
    totalExecutions: phase.totalExecutions,
    timed: !tutorial && !o.untimed && phase.secondsPerStation > 0,
    starMetric: phase.stars.metric,
    starThresholds: phase.stars.thresholds,
  }
}
