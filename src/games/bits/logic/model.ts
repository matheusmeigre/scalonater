import type { DifficultyId } from '@/engine/types'
import type { BitsPhase } from '../phases'

export interface BitsConfig {
  /** Quantos alvos o jogador precisa acertar para vencer a fase. */
  goal: number
  /** Segundos totais da fase (ignorado no modo sem tempo e no tutorial). */
  time: number
  /**
   * Segundos que um alvo leva para "cair" até a fileira antes de errar
   * (ignorado no modo sem tempo e no tutorial, ver `missTarget`).
   */
  perTargetTime: number
}

/**
 * Ajustes por dificuldade sobre os dados da fase (design doc `bits`,
 * contrato de `goalValues`): meta -1 no fácil / +1 no difícil (fora do
 * tutorial); tempo ×1.3 no fácil / ×0.8 no difícil.
 */
export function resolveConfig(
  phase: BitsPhase,
  { difficulty }: { difficulty: DifficultyId; untimed: boolean },
): BitsConfig {
  let goal = phase.targetCount
  if (phase.kind !== 'tutorial') {
    if (difficulty === 'easy') goal -= 1
    else if (difficulty === 'hard') goal += 1
  }
  goal = Math.max(1, goal)

  const mult = difficulty === 'easy' ? 1.3 : difficulty === 'hard' ? 0.8 : 1
  const time = Math.round(phase.targetCount * phase.secondsPerTarget * mult)
  const perTargetTime = Math.round(phase.secondsPerTarget * mult)

  return { goal, time, perTargetTime }
}
