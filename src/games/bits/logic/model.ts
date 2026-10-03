import type { DifficultyId } from '@/engine/types'
import type { BitsPhase } from '../phases'

export interface BitsConfig {
  /** Quantos pacotes a fase tem (o plano inteiro). */
  goal: number
  /** Multiplicador do tempo de chegada de cada pacote (fácil 1.3, difícil 0.8). */
  durMult: number
  /** Os pacotes andam até a CPU (fases com derrota e com relógio ligado). */
  moving: boolean
}

export function resolveConfig(
  phase: BitsPhase,
  { difficulty, untimed }: { difficulty: DifficultyId; untimed: boolean },
): BitsConfig {
  const durMult = difficulty === 'easy' ? 1.3 : difficulty === 'hard' ? 0.8 : 1
  return { goal: phase.plan.length, durMult, moving: phase.canLose && !untimed }
}
