import type { Rng } from '@/engine/random'
import type { ComboState } from '@/engine/scoring/scoring'
import type { DifficultyId } from '@/engine/types'
import {
  DEVICE_PATIENCE,
  DIFFICULTIES,
  type IoDeviceId,
  type IoPhase,
  type StarMetric,
} from '../phases'

/** Uma campainha tocando, esperando na fila de atendimento. */
export interface RingEntry {
  id: number
  device: IoDeviceId
  /** 1 = acabou de tocar, 0 = expirou (só cai com `config.priority`). */
  patience: number
}

/** Fase + dificuldade + modo de jogo resolvidos em números. */
export interface IoConfig {
  devices: readonly IoDeviceId[]
  timed: boolean
  canLose: boolean
  duration: number
  ringEvery: number
  queueMax: number
  priority: boolean
  compareMode: boolean
  dma: boolean
  minProgress: number
  /** F1/F2: meta de progresso (0..1). F3: toques perdidos máximos. F4: sempre 1. */
  goal: number
  hearts: number
  starMetric: StarMetric
  starThresholds: readonly [number, number]
}

export type IoEvent =
  | { type: 'ring'; device: IoDeviceId }
  | { type: 'contextSaved' }
  | { type: 'attended'; device: IoDeviceId }
  | { type: 'contextLost' }
  | { type: 'resumed' }
  | { type: 'queueOverflow' }
  | { type: 'missedDeadline'; device: IoDeviceId }
  | { type: 'checked'; hit: boolean }
  | { type: 'pollingDone' }
  | { type: 'interruptTick' }
  | { type: 'dmaStarted' }
  | { type: 'dmaDone' }
  | { type: 'dmaCollected' }
  | { type: 'dmaManualTouch' }
  | { type: 'tick'; second: number }
  | { type: 'won' }
  | { type: 'lost'; reason: 'queue' | 'deadline' | 'time' }

export interface IoState {
  config: IoConfig
  // --- laço principal (tutorial, F1, F2) ---
  mainProgress: number
  /** Progresso guardado ao empilhar (0 ou 1 posição, nunca mais). */
  contextStack: number[]
  ringQueue: RingEntry[]
  nextRingId: number
  ringTimer: number
  attendedCount: number
  hearts: number
  // --- comparação polling × interrupção (F3) ---
  pollingProgress: number
  interruptProgress: number
  pollingReady: boolean
  pollingReadyTimer: number
  energyWasted: number
  // --- DMA (F4) ---
  dmaStarted: boolean
  dmaProgress: number
  dmaDone: boolean
  dmaCollected: boolean
  dmaManualTouches: number
  // --- comum ---
  timeLeft: number
  elapsed: number
  scoring: ComboState
  rng: Rng
  status: 'playing' | 'won' | 'lost'
  lostReason: 'queue' | 'deadline' | 'time' | null
  /** Eventos gerados pela última ação ou passo. A cena consome e descarta. */
  events: IoEvent[]
}

export interface ResolveOptions {
  difficulty: DifficultyId
  untimed: boolean
}

export function resolveConfig(phase: IoPhase, o: ResolveOptions): IoConfig {
  const d = DIFFICULTIES[o.difficulty]
  const tutorial = phase.kind === 'tutorial'
  const timed = !tutorial && !o.untimed && phase.duration > 0
  return {
    devices: phase.devices,
    timed,
    canLose: phase.canLose,
    duration: tutorial ? 0 : Math.round(phase.duration * d.duration),
    ringEvery: phase.ringEvery * (tutorial ? 1 : d.ringEvery),
    queueMax: phase.queueMax,
    priority: phase.priority,
    compareMode: phase.compareMode,
    dma: phase.dma,
    minProgress: phase.minProgress,
    goal: phase.goal,
    hearts: phase.canLose ? d.hearts : 0,
    starMetric: phase.stars.metric,
    starThresholds: phase.stars.thresholds,
  }
}

export const urgentPatienceSeconds = (device: IoDeviceId) => DEVICE_PATIENCE[device]

export const isUrgent = (device: IoDeviceId) => device === 'teclado' || device === 'mouse'
