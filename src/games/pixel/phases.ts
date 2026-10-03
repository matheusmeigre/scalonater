import type { PhaseBase } from '@/engine/types'
import { IMAGES } from '@/games/bits/phases'

/**
 * Fases como dados (design doc `docs/design/clique-ao-pixel.md`, "Contrato
 * de dados das fases"). Os 4 capítulos da jornada: o tutorial é "Entrada"
 * (capítulo 1) e as 3 fases de nível são "Decisão", "Dados" e "Saída"
 * (capítulos 2 a 4).
 */
export type PixelChapter = 'entrada' | 'decisao' | 'dados' | 'saida'

/** Passo de uma fase de vários passos (Fases 1 e 2): a microtarefa de uma
 * estação de origem. */
export interface PixelStep {
  id: string
  from: 'io' | 'cores' | 'cycle' | 'alu' | 'cache' | 'memory' | 'storage' | 'bits'
  advanceOn: 'select' | 'place' | 'done'
}

/** O que faz uma etapa do tutorial guiado (capítulo 1, "Entrada") avançar. */
export type PixelTutorialTrigger = 'select' | 'done'
export interface PixelTutorialStep {
  id: string
  advanceOn: PixelTutorialTrigger
}

export interface PixelPhase extends PhaseBase {
  chapter: PixelChapter
  /** Passos desta fase, na ordem em que acontecem (vazio na Fase 3, Saída). */
  steps: readonly PixelStep[]
  /** Imagem-alvo da Fase 3 (Saída): 64 bits, mesma convenção de `BitsPhase.images`. */
  targetImage?: readonly (0 | 1)[]
  /** Fase 3: quantos dos 64 bits já chegam pré-marcados pela jornada. */
  prefilledCount?: number
  /** 0 = sem relógio (tutorial guiado e Fase 3, puramente celebratória). */
  secondsLimit: number
  tutorial?: readonly PixelTutorialStep[]
  /** Fase 2 (Dados), passo "disco": sequência fixa de blocos lidos em ordem. */
  diskSequence?: readonly number[]
}

/**
 * Reusa a carinha da Fase 5 de Bits (primeira imagem de `IMAGES`) como alvo
 * da Fase 3 — "fecha o círculo" com a mesma imagem que o jogador já desenhou
 * lá, em vez de uma nova (decisão do dono do projeto registrada no design
 * doc, seção "Riscos"). É só leitura de dado (`BitsPhase.images`), não um
 * componente, então não precisa de pedido à base.
 */
export const TARGET_IMAGE = IMAGES[0]!

/**
 * Decisão combinada com o dono do projeto (pergunta aberta do design doc,
 * "Riscos"): as fases 1-2 (Entrada, Decisão) têm relógio/derrota leve,
 * consistente com as outras 10 estações; só a Fase 3 (Saída) é sem tempo,
 * puramente celebratória.
 */
export const PHASES: readonly PixelPhase[] = [
  {
    id: 'tutorial',
    kind: 'tutorial',
    canLose: false,
    chapter: 'entrada',
    steps: [],
    secondsLimit: 0,
    tutorial: [
      { id: 'click-mouse', advanceOn: 'select' },
      { id: 'guard-ring', advanceOn: 'select' },
      { id: 'resume', advanceOn: 'done' },
    ],
  },
  {
    id: 'nivel-1',
    kind: 'level',
    canLose: true,
    chapter: 'decisao',
    steps: [
      { id: 'schedule', from: 'cores', advanceOn: 'place' },
      { id: 'cycle', from: 'cycle', advanceOn: 'done' },
      { id: 'alu', from: 'alu', advanceOn: 'select' },
    ],
    secondsLimit: 60,
  },
  {
    id: 'nivel-2',
    kind: 'level',
    canLose: true,
    chapter: 'dados',
    steps: [
      { id: 'cache', from: 'cache', advanceOn: 'select' },
      { id: 'disk', from: 'storage', advanceOn: 'done' },
    ],
    secondsLimit: 60,
    diskSequence: [2, 5, 7],
  },
  {
    id: 'nivel-3',
    kind: 'level',
    canLose: false,
    chapter: 'saida',
    unlocksCard: 'click-path',
    steps: [],
    secondsLimit: 0,
    targetImage: TARGET_IMAGE,
    prefilledCount: 48,
  },
] as const
