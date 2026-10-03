import type { PhaseBase } from '@/engine/types'

/** O que faz uma etapa do tutorial avançar. */
export type TutorialTrigger = 'select' | 'place'
export type TutorialHighlight = 'ticket' | 'shelf'

export interface TutorialStep {
  id: string
  advanceOn: TutorialTrigger
  highlight?: TutorialHighlight
}

export type StarMetric = 'timeLeft' | 'mistakesLeft'

/** Fases como dados (design doc, seção "Contrato de dados das fases"). */
export interface MemoryPhase extends PhaseBase {
  /** Tamanho da estante (quantidade de gavetas). */
  shelfSize: number
  /** Colunas da grade no layout "roomy" (desktop/tablet); o "compact" usa a metade, mínimo 2. */
  columns: number
  addressFormat: 'decimal' | 'binary'
  /** Quantos pedidos completados vencem a fase. */
  requestsGoal: number
  /** Segundos por ficha (ignorado no tutorial e reduzido a 75% no modo sem tempo). */
  secondsPerRequest: number
  /** Quantas fichas erradas/expiradas perdem a fase (0 = tutorial, nunca perde). */
  maxMistakes: number
  /** Fase 3: fração dos pedidos que reescrevem um endereço já ocupado. */
  overwriteShare: number
  /** Fase 4: índices do pedido (1-based) em que a energia cai e `eraseAll` roda. */
  powerLossAfter: readonly number[]
  stars: { metric: StarMetric; thresholds: readonly [number, number] }
  /** Etapas guiadas do tutorial (só a primeira fase tem). */
  tutorial?: readonly TutorialStep[]
}

/** No modo sem tempo não há relógio e a partida inteira corre a esta velocidade. */
export const UNTIMED_SPEED = 0.75

export const PHASES: readonly MemoryPhase[] = [
  {
    id: 'tutorial',
    kind: 'tutorial',
    canLose: false,
    shelfSize: 4,
    columns: 2,
    addressFormat: 'decimal',
    // 2 pedidos guiados (guardar, ler) — ver DECISIONS.md, Etapa 4.
    requestsGoal: 2,
    secondsPerRequest: 0,
    maxMistakes: 0,
    overwriteShare: 0,
    powerLossAfter: [],
    stars: { metric: 'mistakesLeft', thresholds: [1, 1] },
    tutorial: [
      { id: 'select-write', advanceOn: 'select', highlight: 'ticket' },
      { id: 'place-write', advanceOn: 'place', highlight: 'shelf' },
      { id: 'select-read', advanceOn: 'select', highlight: 'ticket' },
      { id: 'place-read', advanceOn: 'place', highlight: 'shelf' },
    ],
  },
  {
    id: 'nivel-1',
    kind: 'level',
    canLose: true,
    unlocksCard: 'ram',
    shelfSize: 8,
    columns: 4,
    addressFormat: 'decimal',
    requestsGoal: 8,
    secondsPerRequest: 6,
    maxMistakes: 3,
    overwriteShare: 0,
    powerLossAfter: [],
    stars: { metric: 'timeLeft', thresholds: [0.35, 0.6] },
  },
  {
    id: 'nivel-2',
    kind: 'level',
    canLose: true,
    unlocksCard: 'address',
    shelfSize: 8,
    columns: 4,
    addressFormat: 'binary',
    requestsGoal: 8,
    secondsPerRequest: 7,
    maxMistakes: 3,
    overwriteShare: 0,
    powerLossAfter: [],
    stars: { metric: 'timeLeft', thresholds: [0.35, 0.6] },
  },
  {
    id: 'nivel-3',
    kind: 'level',
    canLose: true,
    shelfSize: 10,
    columns: 5,
    addressFormat: 'decimal',
    requestsGoal: 10,
    secondsPerRequest: 6,
    maxMistakes: 3,
    overwriteShare: 0.5,
    powerLossAfter: [],
    stars: { metric: 'mistakesLeft', thresholds: [0.5, 1] },
  },
  {
    id: 'nivel-4',
    kind: 'level',
    canLose: true,
    shelfSize: 10,
    columns: 5,
    addressFormat: 'decimal',
    requestsGoal: 10,
    secondsPerRequest: 6,
    maxMistakes: 3,
    overwriteShare: 0.3,
    powerLossAfter: [4, 8],
    stars: { metric: 'mistakesLeft', thresholds: [0.5, 1] },
  },
] as const
