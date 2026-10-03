import type { PhaseBase } from '@/engine/types'
import type { TutorialStepDef } from '@/engine/tutorial/useTutorialSteps'

/** Um roteador do grafo fixo da fase. Posição relativa (0–1) dentro do campo. */
export interface RouterNode {
  id: string
  x: number
  y: number
}

/** Uma aresta do grafo (tratada como bidirecional). */
export interface RouterLink {
  from: string
  to: string
  /** Enlaces mais lentos atrasam mais o pacote (usado na F2). */
  latency: number
  /** Quantos pacotes podem estar em trânsito ao mesmo tempo antes de descartar (F2 em diante). */
  capacity: number
}

/** Gatilhos do tutorial guiado desta estação (ver `engine/tutorial`). */
export type NetworkTutorialTrigger = 'select' | 'send' | 'arrived' | 'delivered'

export interface NetworkPhase extends PhaseBase {
  nodes: readonly RouterNode[]
  links: readonly RouterLink[]
  origin: string
  destination: string
  /** Quantos pacotes a mensagem é dividida. */
  packetCount: number
  /** Duração em segundos (ignorada no tutorial e no modo sem tempo). */
  duration: number
  /** Quantas mensagens completas vencem a fase. */
  goal: number
  /** Chance (0–1) de um pacote se perder em cada salto (liga confirmação/reenvio, F3). */
  lossChance: number
  /** Liga a etapa de resolução de nome antes do envio (F4). */
  dns: boolean
  /** Nome a resolver (só com `dns: true`). */
  dnsName?: string
  /** Endereços possíveis mostrados ao jogador (um deles é o certo). */
  dnsOptions?: readonly string[]
  /** Índice do endereço certo em `dnsOptions`. */
  dnsCorrectIndex?: number
  stars: { metric: 'timeLeft' | 'hearts' | 'resends'; thresholds: readonly [number, number] }
  tutorial?: readonly TutorialStepDef<NetworkTutorialTrigger>[]
}

export const PHASES: readonly NetworkPhase[] = [
  {
    id: 'tutorial',
    kind: 'tutorial',
    canLose: false,
    unlocksCard: 'router',
    nodes: [
      { id: 'A', x: 0.18, y: 0.5 },
      { id: 'B', x: 0.82, y: 0.5 },
    ],
    links: [{ from: 'A', to: 'B', latency: 1.4, capacity: 9 }],
    origin: 'A',
    destination: 'B',
    packetCount: 1,
    duration: 0,
    goal: 1,
    lossChance: 0,
    dns: false,
    stars: { metric: 'timeLeft', thresholds: [0.3, 0.6] },
    tutorial: [{ advanceOn: 'select' }, { advanceOn: 'send' }, { advanceOn: 'delivered' }],
  },
  {
    id: 'nivel-1',
    kind: 'level',
    canLose: true,
    unlocksCard: 'packet',
    nodes: [
      { id: 'A', x: 0.1, y: 0.5 },
      { id: 'B', x: 0.5, y: 0.22 },
      { id: 'C', x: 0.9, y: 0.5 },
    ],
    links: [
      { from: 'A', to: 'B', latency: 1, capacity: 9 },
      { from: 'B', to: 'C', latency: 1, capacity: 9 },
    ],
    origin: 'A',
    destination: 'C',
    packetCount: 4,
    duration: 70,
    goal: 2,
    lossChance: 0,
    dns: false,
    stars: { metric: 'timeLeft', thresholds: [0.15, 0.35] },
  },
  {
    id: 'nivel-2',
    kind: 'level',
    canLose: true,
    nodes: [
      { id: 'A', x: 0.08, y: 0.5 },
      { id: 'B', x: 0.42, y: 0.16 },
      { id: 'C', x: 0.42, y: 0.84 },
      { id: 'D', x: 0.78, y: 0.5 },
    ],
    links: [
      { from: 'A', to: 'B', latency: 2.6, capacity: 1 },
      { from: 'A', to: 'C', latency: 1, capacity: 3 },
      { from: 'B', to: 'D', latency: 1, capacity: 3 },
      { from: 'C', to: 'D', latency: 1, capacity: 3 },
    ],
    origin: 'A',
    destination: 'D',
    packetCount: 3,
    duration: 80,
    goal: 2,
    lossChance: 0,
    dns: false,
    stars: { metric: 'hearts', thresholds: [2, 3] },
  },
  {
    id: 'nivel-3',
    kind: 'level',
    canLose: true,
    nodes: [
      { id: 'A', x: 0.1, y: 0.5 },
      { id: 'R', x: 0.5, y: 0.5 },
      { id: 'B', x: 0.9, y: 0.5 },
    ],
    links: [
      { from: 'A', to: 'R', latency: 1, capacity: 9 },
      { from: 'R', to: 'B', latency: 1, capacity: 9 },
    ],
    origin: 'A',
    destination: 'B',
    packetCount: 3,
    duration: 100,
    goal: 2,
    lossChance: 0.35,
    dns: false,
    stars: { metric: 'resends', thresholds: [0.4, 0.7] },
  },
  {
    id: 'nivel-4',
    kind: 'level',
    canLose: true,
    unlocksCard: 'dns',
    nodes: [
      { id: 'A', x: 0.1, y: 0.5 },
      { id: 'R', x: 0.5, y: 0.5 },
      { id: 'B', x: 0.9, y: 0.5 },
    ],
    links: [
      { from: 'A', to: 'R', latency: 1, capacity: 9 },
      { from: 'R', to: 'B', latency: 1, capacity: 9 },
    ],
    origin: 'A',
    destination: 'B',
    packetCount: 3,
    duration: 90,
    goal: 2,
    lossChance: 0,
    dns: true,
    dnsName: 'escola.com',
    dnsOptions: ['200.12.5.9', '10.0.0.1', '200.12.5.90'],
    dnsCorrectIndex: 0,
    stars: { metric: 'timeLeft', thresholds: [0.15, 0.35] },
  },
] as const
