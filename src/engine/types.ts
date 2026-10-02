import type { ComponentType } from 'react'
import type { StarCount } from './scoring/scoring'

/** Estações da placa-mãe, na ordem da trilha. */
export const STATION_IDS = [
  'bits',
  'gates',
  'alu',
  'memory',
  'cycle',
  'cache',
  'storage',
  'cores',
  'io',
  'network',
  'pixel',
] as const
export type StationId = (typeof STATION_IDS)[number]

export const DIFFICULTY_IDS = ['easy', 'normal', 'hard'] as const
export type DifficultyId = (typeof DIFFICULTY_IDS)[number]

/** Toda fase é dado. A cena interpreta os parâmetros específicos do jogo. */
export interface PhaseBase {
  id: string
  kind: 'tutorial' | 'level'
  /** Tutoriais não têm derrota. */
  canLose: boolean
  /** Card de conceito liberado ao vencer a fase pela primeira vez. */
  unlocksCard?: string
}

/** Texto de uma fase. Strings aceitam **negrito** e {ícone} (ver ui/RichText). */
export interface PhaseCopy {
  title: string
  teaser: string
  intro: string[]
  bulletsTitle: string
  bullets: string[]
  /** Meta exibida no cartão de abertura da fase. Aceita {goal}, {time}, {hearts}. */
  goal: string
  /** Meta no modo sem tempo. Se omitida, o shell usa um texto genérico. */
  goalUntimed?: string
  real: string
  learn: string
  /** Dica do Kernel quando o jogador perde a fase. */
  tip: string
}

export interface GameCopy {
  title: string
  /** Peça do computador que a estação representa. */
  component: string
  tagline: string
  concepts: string[]
  /** Abertura do Kernel: até 3 falas curtas. */
  opening: string[]
  phases: Record<string, PhaseCopy>
  /** Frase que liga esta estação à próxima da trilha. */
  connection: string
  finale: { title: string; intro: string; bullets: string[]; extraTitle: string; extra: string }
}

export interface ConceptCard {
  id: string
  /** Nome popular do conceito. */
  title: string
  /** Nome técnico, como aparece em livros e na internet. */
  term: string
  summary: string
  analogy: string
  realWorld: string
  icon: string
}

export type StatTone = 'ink' | 'gold' | 'orange' | 'mint' | 'cyan'
export interface OutcomeStat {
  id: string
  label: string
  value: string
  tone: StatTone
}

export interface PhaseOutcome {
  won: boolean
  stars: StarCount
  score: number
  stats: OutcomeStat[]
  failTitle?: string
  failReason?: string
  /** Rodada assistida (o sistema jogou sozinho): não conta progresso. */
  autoplay?: boolean
}

export interface SceneProps<P extends PhaseBase = PhaseBase> {
  phase: P
  difficulty: DifficultyId
  untimed: boolean
  paused: boolean
  /** Multiplicador de velocidade do loop (1 = normal). */
  speed: number
  autoplay: boolean
  /** Muda a cada recomeço; a cena deve reiniciar a partida quando mudar. */
  runId: number
  onPauseChange: (paused: boolean) => void
  onRestart: () => void
  onFinish: (outcome: PhaseOutcome) => void
}

export interface GameMeta {
  id: StationId
  /** Nome do ícone (ui/icons) usado no mapa e no Manual. */
  icon: string
  /** Pré-requisitos explícitos. Se omitido, vale a ordem da trilha. */
  prerequisites?: StationId[]
  /** O jogo usa o seletor de dificuldade. */
  hasDifficulty: boolean
  /** O jogo tem a rodada "ver o sistema jogar sozinho" ao final. */
  hasAutoplay: boolean
}

export interface GameModule<P extends PhaseBase = PhaseBase> {
  meta: GameMeta
  copy: GameCopy
  phases: readonly P[]
  cards: readonly ConceptCard[]
  Scene: ComponentType<SceneProps<P>>
  /** Valores para preencher a meta da fase ({goal}, {time}, {hearts}…). */
  goalValues: (
    phase: P,
    o: { difficulty: DifficultyId; untimed: boolean },
  ) => Record<string, number>
}

/** Apaga o tipo específico da fase para o módulo caber no registro. */
export function defineGame<P extends PhaseBase>(module: GameModule<P>): GameModule {
  return module as unknown as GameModule
}
