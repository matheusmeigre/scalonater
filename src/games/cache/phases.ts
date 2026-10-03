import type { PhaseBase } from '@/engine/types'

/**
 * Fases como dados (README, passo 3). Contrato igual ao combinado em
 * `docs/design/cache.md`, seção "Contrato de dados das fases" — não
 * alterado na implementação.
 */
export interface CacheRequestPattern {
  /** Quantidade de endereços possíveis no "universo" da RAM simulada. */
  addressSpace: number
  /** Fases 2+: chance de repetir um dos últimos `recentWindow` endereços. */
  temporalRepeatChance: number
  recentWindow: number
  /** Fase 3+: chance de o próximo endereço ser vizinho do anterior (±1 a ±3). */
  spatialStreakChance: number
}

/** O que faz uma etapa do tutorial guiado avançar (ver `logic/rules.ts#CacheEvent`). */
export type CacheTutorialTrigger = 'select' | 'done'

export interface CacheTutorialStep {
  id: string
  advanceOn: CacheTutorialTrigger
}

export interface CachePhase extends PhaseBase {
  l1Slots: number
  /** 0 = sem L2 (fases 1–3). */
  l2Slots: number
  /** 1 = sem localidade espacial (fases 1–2); 4 a partir da fase 3. */
  blockSize: 1 | 4
  requestsGoal: number
  pattern: CacheRequestPattern
  /** Custo de latência "simulado" em unidades de pontuação, não em ms reais de UI. */
  latency: { hit: number; l2Hit: number; miss: number }
  /** Tempo médio de acesso (unidades de `latency`) acima do qual a fase é perdida. */
  maxAvgLatency: number
  stars: { metric: 'avgLatency'; thresholds: readonly [number, number] }
  /**
   * Tutorial guiado como dado (extensão própria desta estação — o contrato
   * do design doc não lista um campo de tutorial, igual ao padrão já usado
   * em `storage`/`io`). Só a fase `tutorial` usa.
   */
  tutorial?: readonly CacheTutorialStep[]
}

/** Segundos simulados entre um pedido da CPU e o próximo (ritmo constante). */
export const REQUEST_EVERY_SECONDS = 1.5

/** Segundos simulados da "viagem lenta até a RAM" numa falha. */
export const TRAVEL_SECONDS = 0.9

/** No modo sem tempo, a partida inteira corre a esta velocidade (mais devagar). */
export const UNTIMED_SPEED = 0.75

export const PHASES: readonly CachePhase[] = [
  {
    id: 'tutorial',
    kind: 'tutorial',
    canLose: false,
    l1Slots: 2,
    l2Slots: 0,
    blockSize: 1,
    requestsGoal: 2,
    pattern: { addressSpace: 6, temporalRepeatChance: 1, recentWindow: 1, spatialStreakChance: 0 },
    latency: { hit: 1, l2Hit: 2, miss: 4 },
    maxAvgLatency: 10,
    stars: { metric: 'avgLatency', thresholds: [0.5, 0.8] },
    tutorial: [
      { id: 'miss', advanceOn: 'select' },
      { id: 'hit', advanceOn: 'done' },
    ],
  },
  {
    id: 'bancada-cheia',
    kind: 'level',
    canLose: true,
    unlocksCard: 'cache',
    l1Slots: 3,
    l2Slots: 0,
    blockSize: 1,
    requestsGoal: 14,
    pattern: { addressSpace: 10, temporalRepeatChance: 0, recentWindow: 4, spatialStreakChance: 0 },
    latency: { hit: 1, l2Hit: 2, miss: 3 },
    // Generoso de propósito: com acesso totalmente aleatório (sem
    // localidade ainda), a escolha de quem sai não tem "resposta certa"
    // matemática — o limite só pune uma sequência de falhas muito acima do
    // esperado, não a variância normal de 14 pedidos. Ver DECISIONS.md.
    maxAvgLatency: 3.4,
    stars: { metric: 'avgLatency', thresholds: [0.3, 0.55] },
  },
  {
    id: 'volta-a-pedir',
    kind: 'level',
    canLose: true,
    l1Slots: 3,
    l2Slots: 0,
    blockSize: 1,
    requestsGoal: 16,
    pattern: {
      addressSpace: 12,
      temporalRepeatChance: 0.6,
      recentWindow: 4,
      spatialStreakChance: 0,
    },
    latency: { hit: 1, l2Hit: 2, miss: 3 },
    maxAvgLatency: 2.3,
    stars: { metric: 'avgLatency', thresholds: [0.35, 0.6] },
  },
  {
    id: 'vizinhos-de-linha',
    kind: 'level',
    canLose: true,
    l1Slots: 3,
    l2Slots: 0,
    blockSize: 4,
    requestsGoal: 16,
    pattern: {
      addressSpace: 16,
      temporalRepeatChance: 0.2,
      recentWindow: 4,
      spatialStreakChance: 0.5,
    },
    latency: { hit: 1, l2Hit: 2, miss: 3 },
    maxAvgLatency: 2.0,
    stars: { metric: 'avgLatency', thresholds: [0.4, 0.65] },
  },
  {
    id: 'dois-niveis',
    kind: 'level',
    canLose: true,
    unlocksCard: 'memory-hierarchy',
    l1Slots: 2,
    l2Slots: 4,
    blockSize: 4,
    requestsGoal: 20,
    pattern: {
      addressSpace: 16,
      temporalRepeatChance: 0.3,
      recentWindow: 4,
      spatialStreakChance: 0.4,
    },
    latency: { hit: 1, l2Hit: 2, miss: 4 },
    maxAvgLatency: 1.8,
    stars: { metric: 'avgLatency', thresholds: [0.45, 0.7] },
  },
] as const
