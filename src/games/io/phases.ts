import type { DifficultyId, PhaseBase } from '@/engine/types'

/** O que faz uma etapa do tutorial avançar (ver `logic/model.ts` para os eventos). */
export type IoTutorialTrigger = 'ring' | 'guard' | 'attend' | 'resume' | 'goal'

export interface TutorialStep {
  id: string
  advanceOn: IoTutorialTrigger
  highlight?: 'task' | 'stack' | 'devices' | 'queue' | 'hud'
}

export type IoDeviceId = 'teclado' | 'mouse' | 'disco' | 'rede'

export interface IoDevice {
  id: IoDeviceId
  /** Urgência: quanto menor, mais rápido expira na fila (usado na F2). */
  patience: number
}

/** Como as estrelas são calculadas quando a fase é vencida. */
export type StarMetric = 'timeLeft' | 'hearts' | 'energySaved'

export interface IoPhase extends PhaseBase {
  /** Dispositivos que podem tocar a campainha nesta fase. */
  devices: readonly IoDeviceId[]
  /** Duração em segundos (ignorada no tutorial e na F3, que não tem relógio). */
  duration: number
  /** Segundos médios entre uma campainha e outra. */
  ringEvery: number
  /** Tamanho máximo da fila de campainhas não atendidas antes de perder vida. */
  queueMax: number
  /** Prioridade liga a regra de expiração por paciência (F2). */
  priority: boolean
  /** Modo de comparação polling × interrupção (só a F3). */
  compareMode: boolean
  /** DMA liga o dispositivo de disco automático (só a F4). */
  dma: boolean
  /** % mínima de progresso da tarefa principal para disparar derrota (F1/F2/F4). */
  minProgress: number
  goal: number
  stars: { metric: StarMetric; thresholds: readonly [number, number] }
  tutorial?: TutorialStep[]
}

/** Paciência (em segundos de campainha tocando) de cada dispositivo, por papel. */
export const DEVICE_PATIENCE: Record<IoDeviceId, number> = {
  teclado: 4,
  mouse: 4.5,
  disco: 11,
  rede: 10,
}

export const PHASES: readonly IoPhase[] = [
  {
    id: 'tutorial',
    kind: 'tutorial',
    canLose: false,
    unlocksCard: 'io',
    devices: ['teclado'],
    duration: 0,
    ringEvery: 0,
    queueMax: 3,
    priority: false,
    compareMode: false,
    dma: false,
    minProgress: 0,
    goal: 3,
    stars: { metric: 'hearts', thresholds: [1, 1] },
    tutorial: [
      { id: 'ring', advanceOn: 'ring', highlight: 'devices' },
      { id: 'guard', advanceOn: 'guard', highlight: 'stack' },
      { id: 'attend', advanceOn: 'attend', highlight: 'devices' },
      { id: 'resume', advanceOn: 'resume', highlight: 'task' },
      { id: 'goal', advanceOn: 'goal', highlight: 'hud' },
    ],
  },
  {
    id: 'fila-na-porta',
    kind: 'level',
    canLose: true,
    unlocksCard: 'interrupt',
    devices: ['teclado', 'mouse', 'disco', 'rede'],
    duration: 45,
    ringEvery: 3.2,
    queueMax: 4,
    priority: false,
    compareMode: false,
    dma: false,
    minProgress: 0.6,
    goal: 60,
    stars: { metric: 'hearts', thresholds: [0.67, 1] },
  },
  {
    id: 'quem-nao-espera',
    kind: 'level',
    canLose: true,
    devices: ['teclado', 'mouse', 'disco', 'rede'],
    duration: 50,
    ringEvery: 2.6,
    queueMax: 5,
    priority: true,
    compareMode: false,
    dma: false,
    minProgress: 0.5,
    goal: 70,
    stars: { metric: 'hearts', thresholds: [0.67, 1] },
  },
  {
    id: 'perguntar-ou-campainha',
    kind: 'level',
    canLose: false,
    devices: ['disco'],
    duration: 0,
    ringEvery: 2,
    queueMax: 99,
    priority: false,
    compareMode: true,
    dma: false,
    minProgress: 0,
    goal: 8,
    stars: { metric: 'energySaved', thresholds: [0.5, 0.8] },
  },
  {
    id: 'dma',
    kind: 'level',
    canLose: true,
    unlocksCard: 'dma',
    devices: ['disco'],
    duration: 40,
    ringEvery: 99,
    queueMax: 3,
    priority: false,
    compareMode: false,
    dma: true,
    minProgress: 0,
    goal: 1,
    stars: { metric: 'timeLeft', thresholds: [0.3, 0.55] },
  },
] as const

/** Ajustes por dificuldade (multiplicadores sobre os dados da fase). */
export interface IoDifficulty {
  duration: number
  ringEvery: number
  hearts: number
}

export const DIFFICULTIES: Record<DifficultyId, IoDifficulty> = {
  easy: { duration: 1.35, ringEvery: 1.3, hearts: 5 },
  normal: { duration: 1.1, ringEvery: 1.05, hearts: 3 },
  hard: { duration: 0.9, ringEvery: 0.85, hearts: 3 },
}

/** No modo sem tempo não há relógio e a partida inteira corre a esta velocidade. */
export const UNTIMED_SPEED = 0.75
