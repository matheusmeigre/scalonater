import type { DifficultyId, PhaseBase } from '@/engine/types'

/** O que faz uma etapa do tutorial avançar. */
export type TutorialTrigger = 'select' | 'place' | 'allBusy' | 'done' | 'goal'

export interface TutorialStep {
  id: string
  advanceOn: TutorialTrigger
  /** Elemento que pisca para guiar o jogador. */
  highlight?: 'queue' | 'slots' | 'cpu' | 'hud'
}

/** Como as estrelas são calculadas quando a fase é vencida. */
export type StarMetric = 'timeLeft' | 'hearts' | 'cpuUsage'

export interface CoresPhase extends PhaseBase {
  cores: number
  slotsPerCore: 1 | 2
  features: {
    /** Threads podem travar esperando dados (E/S). */
    io: boolean
    /** Threads na fila perdem paciência; se zerar, perde uma vida. */
    patience: boolean
    /** Voltar ao núcleo anterior roda mais rápido (cache quente). */
    affinity: boolean
  }
  /** Duração em segundos (ignorada no modo sem tempo e no tutorial). */
  duration: number
  goal: number
  /** Segundos médios entre chegadas de threads. */
  spawnEvery: number
  maxQueue: number
  initialThreads: number
  /** Chance de chegar uma thread longa de Render (só com paciência). */
  renderChance: number
  /** Chance de uma thread travar esperando dados (só com E/S). */
  blockChance: number
  stars: { metric: StarMetric; thresholds: readonly [number, number] }
  tutorial?: TutorialStep[]
}

export const PHASES: readonly CoresPhase[] = [
  {
    id: 'tutorial',
    kind: 'tutorial',
    canLose: false,
    unlocksCard: 'scheduler',
    cores: 4,
    slotsPerCore: 1,
    features: { io: false, patience: false, affinity: false },
    duration: 0,
    goal: 6,
    spawnEvery: 1.6,
    maxQueue: 8,
    initialThreads: 3,
    renderChance: 0,
    blockChance: 0,
    stars: { metric: 'cpuUsage', thresholds: [0.5, 0.7] },
    tutorial: [
      { id: 'meet', advanceOn: 'select', highlight: 'queue' },
      { id: 'place', advanceOn: 'place', highlight: 'slots' },
      { id: 'drag', advanceOn: 'place', highlight: 'queue' },
      { id: 'fill', advanceOn: 'allBusy', highlight: 'slots' },
      { id: 'finish', advanceOn: 'done', highlight: 'cpu' },
      { id: 'goal', advanceOn: 'goal', highlight: 'hud' },
    ],
  },
  {
    id: 'io-wait',
    kind: 'level',
    canLose: true,
    unlocksCard: 'io-wait',
    cores: 4,
    slotsPerCore: 1,
    features: { io: true, patience: false, affinity: false },
    duration: 50,
    goal: 12,
    spawnEvery: 1.4,
    maxQueue: 10,
    initialThreads: 3,
    renderChance: 0,
    blockChance: 0.6,
    stars: { metric: 'timeLeft', thresholds: [0.12, 0.3] },
  },
  {
    id: 'time-slice',
    kind: 'level',
    canLose: true,
    unlocksCard: 'time-slice',
    cores: 4,
    slotsPerCore: 1,
    features: { io: true, patience: true, affinity: false },
    duration: 60,
    goal: 14,
    spawnEvery: 1.3,
    maxQueue: 10,
    initialThreads: 3,
    renderChance: 1,
    blockChance: 0.6,
    stars: { metric: 'hearts', thresholds: [0.5, 1] },
  },
  {
    id: 'smt-cache',
    kind: 'level',
    canLose: true,
    unlocksCard: 'smt-cache',
    cores: 4,
    slotsPerCore: 2,
    features: { io: true, patience: true, affinity: true },
    duration: 60,
    goal: 20,
    spawnEvery: 1.0,
    maxQueue: 10,
    initialThreads: 3,
    renderChance: 1,
    blockChance: 0.6,
    stars: { metric: 'hearts', thresholds: [0.5, 1] },
  },
]

/** Ajustes por dificuldade (multiplicadores sobre os dados da fase). */
export interface CoresDifficulty {
  duration: number
  goal: number
  spawnEvery: number
  /** Velocidade com que a paciência esvazia. */
  patienceDrain: number
  /** Fração das threads que são Render (multiplica renderChance). */
  renderShare: number
  hearts: number
}

export const DIFFICULTIES: Record<DifficultyId, CoresDifficulty> = {
  easy: {
    duration: 1.4,
    goal: 0.75,
    spawnEvery: 1.3,
    patienceDrain: 0.45,
    renderShare: 0.18,
    hearts: 5,
  },
  normal: {
    duration: 1.15,
    goal: 0.9,
    spawnEvery: 1.1,
    patienceDrain: 0.75,
    renderShare: 0.25,
    hearts: 3,
  },
  hard: {
    duration: 0.95,
    goal: 1.1,
    spawnEvery: 0.9,
    patienceDrain: 1.2,
    renderShare: 0.35,
    hearts: 3,
  },
}

/** No modo sem tempo não há relógio e a partida inteira corre a esta velocidade. */
export const UNTIMED_SPEED = 0.75
