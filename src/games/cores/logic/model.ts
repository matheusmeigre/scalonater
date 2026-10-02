import type { Rng } from '@/engine/random'
import type { ComboState } from '@/engine/scoring/scoring'
import type { DifficultyId } from '@/engine/types'
import { DIFFICULTIES, type CoresPhase, type StarMetric } from '../phases'

export const APPS = ['game', 'browser', 'music', 'render'] as const
export type AppId = (typeof APPS)[number]

/** Quantos nomes de tarefa cada programa tem (o texto fica no conteúdo). */
export const APP_TASKS: Record<AppId, number> = { game: 3, browser: 3, music: 1, render: 1 }

export interface Thread {
  id: number
  app: AppId
  /** Índice do nome da tarefa em content.apps[app].tasks. */
  task: number
  /** Segundos de trabalho a 100% de velocidade. */
  work: number
  /** 0..1 */
  progress: number
  /** 0..1. Só esvazia em fases com paciência. */
  patience: number
  /** Último núcleo em que rodou (-1 = nunca rodou). */
  lastCore: number
  /** Segundos esperando na fila desde a última vez que entrou nela. */
  wait: number
  /** Progresso em que a thread vai travar esperando dados, se for travar. */
  blockAt: number | null
  /** Segundos até o dado chegar. */
  ioTimer: number
  blocked: boolean
  where: 'queue' | 'run' | 'io'
}

export interface Slot {
  core: number
  index: number
  threadId: number | null
  /** Segundos rodando a thread atual. */
  since: number
}

/** Fase + dificuldade + modo de jogo resolvidos em números. */
export interface CoresConfig {
  cores: number
  slotsPerCore: number
  io: boolean
  patience: boolean
  affinity: boolean
  timed: boolean
  canLose: boolean
  autoplay: boolean
  duration: number
  goal: number
  spawnEvery: number
  maxQueue: number
  initialThreads: number
  renderChance: number
  blockChance: number
  patienceDrain: number
  hearts: number
  starMetric: StarMetric
  starThresholds: readonly [number, number]
}

export type PlaceHow = 'tap' | 'drag' | 'auto'
export type InvalidReason = 'emptyQueue' | 'slotBusy' | 'notBlocked' | 'notRunning'

export type CoresEvent =
  | { type: 'spawn' }
  | { type: 'select'; id: number }
  | { type: 'deselect' }
  | {
      type: 'place'
      how: PlaceHow
      hot: boolean
      wasteful: boolean
      quick: boolean
      moved: boolean
    }
  | { type: 'allBusy' }
  | { type: 'unplace'; to: 'queue' | 'io' }
  | { type: 'ioReturn' }
  | { type: 'blocked' }
  | { type: 'done'; combo: number }
  | { type: 'lowPatience' }
  | { type: 'appFroze'; app: AppId }
  | { type: 'idleWarning' }
  | { type: 'tick'; second: number }
  | { type: 'invalid'; reason: InvalidReason }
  | { type: 'won' }
  | { type: 'lost'; reason: 'time' | 'hearts' }

export interface CoresState {
  config: CoresConfig
  threads: Record<number, Thread>
  /** Fila de prontos, na ordem. */
  queue: number[]
  /** Threads esperando dados fora do núcleo. */
  io: number[]
  slots: Slot[]
  selected: number | null
  timeLeft: number
  elapsed: number
  done: number
  hearts: number
  scoring: ComboState
  idleTimer: number
  /** Soma de (núcleos trabalhando / núcleos) × dt, para o "uso da CPU". */
  busyAcc: number
  timeAcc: number
  spawnTimer: number
  nextId: number
  rng: Rng
  status: 'playing' | 'won' | 'lost'
  lostReason: 'time' | 'hearts' | null
  /** Eventos gerados pela última ação ou passo. A cena consome e descarta. */
  events: CoresEvent[]
}

export interface ResolveOptions {
  difficulty: DifficultyId
  untimed: boolean
  autoplay?: boolean
}

/** Estrelas no modo sem tempo, quando a fase mediria o tempo que sobrou. */
export const UNTIMED_CPU_THRESHOLDS = [0.6, 0.8] as const

export function resolveConfig(phase: CoresPhase, o: ResolveOptions): CoresConfig {
  const d = DIFFICULTIES[o.difficulty]
  const tutorial = phase.kind === 'tutorial'
  const timed = !tutorial && !o.untimed && !o.autoplay
  const usesTime = phase.stars.metric === 'timeLeft'
  return {
    cores: phase.cores,
    slotsPerCore: phase.slotsPerCore,
    io: phase.features.io,
    patience: phase.features.patience,
    affinity: phase.features.affinity,
    timed,
    canLose: phase.canLose && !o.autoplay,
    autoplay: !!o.autoplay,
    duration: tutorial ? 0 : Math.round(phase.duration * d.duration),
    goal: tutorial ? phase.goal : Math.max(5, Math.round(phase.goal * d.goal)),
    spawnEvery: phase.spawnEvery * (tutorial ? 1 : d.spawnEvery),
    maxQueue: phase.maxQueue,
    initialThreads: phase.initialThreads,
    renderChance: phase.features.patience ? phase.renderChance * d.renderShare : 0,
    blockChance: phase.features.io ? phase.blockChance : 0,
    patienceDrain: d.patienceDrain,
    hearts: phase.features.patience ? d.hearts : 0,
    starMetric: !timed && usesTime ? 'cpuUsage' : phase.stars.metric,
    starThresholds: !timed && usesTime ? UNTIMED_CPU_THRESHOLDS : phase.stars.thresholds,
  }
}
