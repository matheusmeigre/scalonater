import type { PhaseBase } from '@/engine/types'

/** Tipo de alvo desta fase (design doc `bits`). */
export type BitsTargetKind = 'number' | 'letters' | 'image'

export interface BitsPhase extends PhaseBase {
  /** Quantos interruptores a fileira tem (4, 8 ou 64 na Fase 5, em grade 8x8). */
  bitCount: 4 | 8 | 64
  /**
   * Vidas da fase: um alvo que "cai" até a fileira sem bater custa uma vida
   * (ver `missTarget`). `undefined` no tutorial: sem relógio, não há queda.
   */
  lives?: number
  /** Fase 5 usa grade 8x8 em vez de fileira única. */
  layout: 'row' | 'grid'
  /** Fases 1 e 2 mostram o valor de cada casa; Fases 3, 4 e 5 escondem. */
  showPlaceValues: boolean
  /** Tipo de alvo desta fase. */
  targetKind: BitsTargetKind
  /** Quantos alvos sorteados o jogador precisa acertar para vencer a fase. */
  targetCount: number
  /** Segundos por alvo, usado para o relógio e para a meta de tempo. Ignorado no tutorial. */
  secondsPerTarget: number
  /** Só para `targetKind: 'letters'`: o alfabeto reduzido disponível (índice = código). */
  alphabet?: readonly string[]
  /** Só para `targetKind: 'image'`: os desenhos possíveis, cada um como 64 bits (0|1). */
  images?: readonly (readonly (0 | 1)[])[]
  /**
   * Bônus de pontos por fechar o alvo no menor número de toques possível
   * (distância de Hamming entre a fileira atual e o alvo), sem "passar" por
   * um valor e voltar. Só a Fase 3 ("sem cola") tem esse bônus (design doc,
   * seção "O que cada fase ensina"); campo próprio do jogo, fora do
   * contrato compartilhado de `shared/binary`.
   */
  efficiencyBonus: boolean
}

/** Alfabeto reduzido de 8 letras (código = índice, 0 a 7) para a Fase 4. */
export const ALPHABET = ['A', 'E', 'I', 'L', 'M', 'O', 'S', 'T'] as const

/**
 * Desenhos de 8×8 para a Fase 5 (1 = preto, 0 = branco), lidos linha por
 * linha. Simples de propósito: carinha, seta e coração.
 */
const SMILEY: readonly (0 | 1)[] = [
  0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0,
  1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0,
]

const ARROW: readonly (0 | 1)[] = [
  0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0,
  0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0,
]

const HEART: readonly (0 | 1)[] = [
  0, 1, 1, 0, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0,
  1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
]

export const IMAGES = [SMILEY, ARROW, HEART] as const

export const PHASES: readonly BitsPhase[] = [
  {
    id: 'tutorial',
    kind: 'tutorial',
    canLose: false,
    bitCount: 4,
    layout: 'row',
    showPlaceValues: true,
    targetKind: 'number',
    targetCount: 2,
    secondsPerTarget: 0,
    efficiencyBonus: false,
  },
  {
    id: 'nivel-1',
    kind: 'level',
    canLose: true,
    lives: 3,
    bitCount: 4,
    layout: 'row',
    showPlaceValues: true,
    targetKind: 'number',
    targetCount: 6,
    secondsPerTarget: 12,
    efficiencyBonus: false,
  },
  {
    id: 'nivel-2',
    kind: 'level',
    canLose: true,
    lives: 3,
    unlocksCard: 'bit-byte',
    bitCount: 8,
    layout: 'row',
    showPlaceValues: true,
    targetKind: 'number',
    targetCount: 6,
    secondsPerTarget: 14,
    efficiencyBonus: false,
  },
  {
    id: 'nivel-3',
    kind: 'level',
    canLose: true,
    lives: 3,
    bitCount: 8,
    layout: 'row',
    showPlaceValues: false,
    targetKind: 'number',
    targetCount: 5,
    secondsPerTarget: 18,
    efficiencyBonus: true,
  },
  {
    id: 'nivel-4',
    kind: 'level',
    canLose: true,
    lives: 3,
    unlocksCard: 'codigo-caractere',
    bitCount: 8,
    layout: 'row',
    showPlaceValues: false,
    targetKind: 'letters',
    targetCount: 4,
    secondsPerTarget: 20,
    alphabet: ALPHABET,
    efficiencyBonus: false,
  },
  {
    id: 'nivel-5',
    kind: 'level',
    canLose: true,
    lives: 3,
    bitCount: 64,
    layout: 'grid',
    showPlaceValues: false,
    targetKind: 'image',
    targetCount: 3,
    secondsPerTarget: 40,
    images: IMAGES,
    efficiencyBonus: false,
  },
] as const
