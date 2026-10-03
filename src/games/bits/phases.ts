import type { PhaseBase } from '@/engine/types'

/** Tipo de alvo desta fase (design doc `bits`). */
export type BitsTargetKind = 'number' | 'letters' | 'image'

/**
 * Um pacote do plano da fase: `pop` é quantas lâmpadas o número-alvo acende
 * (só para `number`; define a dificuldade de cada pacote) e `dur` é quantos
 * segundos ele leva para chegar à CPU (na dificuldade normal).
 */
export interface BitsPacket {
  pop?: number
  dur: number
}

export interface BitsPhase extends PhaseBase {
  /** Quantos interruptores a fileira tem (4, 8 ou 64 na Fase 5, em grade 8x8). */
  bitCount: 4 | 8 | 64
  /** Fase 5 usa grade 8x8 em vez de fileira única. */
  layout: 'row' | 'grid'
  /** `false` = "sem cola": cada lâmpada mostra "?" até acender (ou espiar). */
  showPlaceValues: boolean
  /** Tipo de alvo desta fase. */
  targetKind: BitsTargetKind
  /** Os pacotes da fase, em ordem: a fase termina depois do último. */
  plan: readonly BitsPacket[]
  /** Vidas: cada pacote que chega à CPU sem ser decodificado custa uma. */
  lives: number
  /** Quantas vezes dá para "Espiar valores" (só nas fases sem cola). */
  peeks: number
  /** Só para `targetKind: 'letters'`: o alfabeto reduzido disponível (índice = código). */
  alphabet?: readonly string[]
  /** Só para `targetKind: 'letters'`: palavras possíveis (uma é sorteada; cada letra é um pacote). */
  words?: readonly string[]
  /** Só para `targetKind: 'image'`: os desenhos possíveis, cada um como 64 bits (0|1). */
  images?: readonly (readonly (0 | 1)[])[]
}

/** Alfabeto reduzido de 8 letras (código = índice, 0 a 7) para a Fase 4. */
export const ALPHABET = ['A', 'E', 'I', 'L', 'M', 'O', 'S', 'T'] as const

/** Palavras de 4 letras que só usam o alfabeto reduzido. */
export const WORDS = ['MESA', 'LATA', 'SOMA', 'TELA', 'MOLA', 'SALA', 'MATE', 'LIMA'] as const

/**
 * Desenhos de 8×8 para a Fase 5 (1 = aceso, 0 = apagado), lidos linha por
 * linha. Simples de propósito: carinha, seta e coração.
 */
// prettier-ignore
const SMILEY: readonly (0 | 1)[] = [
  0, 0, 0, 1, 1, 0, 0, 0,
  0, 0, 1, 0, 0, 1, 0, 0,
  0, 1, 0, 0, 0, 0, 1, 0,
  0, 1, 0, 1, 0, 1, 0, 0,
  0, 1, 0, 0, 0, 0, 1, 0,
  0, 1, 0, 1, 1, 1, 0, 0,
  0, 0, 1, 0, 0, 1, 0, 0,
  0, 0, 0, 1, 1, 0, 0, 0,
]

// prettier-ignore
const ARROW: readonly (0 | 1)[] = [
  0, 0, 0, 0, 1, 0, 0, 0,
  0, 0, 0, 1, 1, 1, 0, 0,
  0, 0, 1, 1, 1, 1, 1, 0,
  0, 1, 1, 1, 1, 1, 1, 1,
  0, 0, 0, 1, 1, 1, 0, 0,
  0, 0, 0, 1, 1, 1, 0, 0,
  0, 0, 0, 1, 1, 1, 0, 0,
  0, 0, 0, 1, 1, 1, 0, 0,
]

// prettier-ignore
const HEART: readonly (0 | 1)[] = [
  0, 1, 1, 0, 0, 1, 1, 0,
  1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1,
  0, 1, 1, 1, 1, 1, 1, 0,
  0, 0, 1, 1, 1, 1, 0, 0,
  0, 0, 0, 1, 1, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,
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
    plan: [
      { pop: 1, dur: 20 },
      { pop: 2, dur: 20 },
    ],
    lives: 3,
    peeks: 0,
  },
  {
    id: 'nivel-1',
    kind: 'level',
    canLose: true,
    bitCount: 4,
    layout: 'row',
    showPlaceValues: true,
    targetKind: 'number',
    plan: [
      { pop: 1, dur: 14 },
      { pop: 2, dur: 13 },
      { pop: 2, dur: 12 },
      { pop: 3, dur: 12 },
      { pop: 3, dur: 11 },
    ],
    lives: 3,
    peeks: 0,
  },
  {
    id: 'nivel-2',
    kind: 'level',
    canLose: true,
    unlocksCard: 'bit-byte',
    bitCount: 8,
    layout: 'row',
    showPlaceValues: true,
    targetKind: 'number',
    plan: [
      { pop: 2, dur: 16 },
      { pop: 3, dur: 15 },
      { pop: 3, dur: 14 },
      { pop: 4, dur: 14 },
      { pop: 5, dur: 13 },
    ],
    lives: 3,
    peeks: 0,
  },
  {
    id: 'nivel-3',
    kind: 'level',
    canLose: true,
    bitCount: 8,
    layout: 'row',
    showPlaceValues: false,
    targetKind: 'number',
    plan: [
      { pop: 2, dur: 16 },
      { pop: 3, dur: 15 },
      { pop: 4, dur: 14 },
      { pop: 4, dur: 13 },
      { pop: 6, dur: 12 },
    ],
    lives: 3,
    peeks: 2,
  },
  {
    id: 'nivel-4',
    kind: 'level',
    canLose: true,
    unlocksCard: 'codigo-caractere',
    bitCount: 8,
    layout: 'row',
    showPlaceValues: false,
    targetKind: 'letters',
    plan: [{ dur: 20 }, { dur: 19 }, { dur: 18 }, { dur: 17 }],
    lives: 3,
    peeks: 2,
    alphabet: ALPHABET,
    words: WORDS,
  },
  {
    id: 'nivel-5',
    kind: 'level',
    canLose: true,
    bitCount: 64,
    layout: 'grid',
    showPlaceValues: false,
    targetKind: 'image',
    plan: [{ dur: 45 }, { dur: 42 }, { dur: 40 }],
    lives: 3,
    peeks: 0,
    images: IMAGES,
  },
] as const
