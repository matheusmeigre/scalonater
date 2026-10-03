import type { DifficultyId } from '@/engine/types'
import type { BitsPhase } from '../phases'

export interface BitsConfig {
  /** Quantos alvos o jogador precisa acertar para vencer a fase. */
  goal: number
  /** Segundos totais da fase (ignorado no modo sem tempo e no tutorial). */
  time: number
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

  let time = phase.targetCount * phase.secondsPerTarget
  if (difficulty === 'easy') time *= 1.3
  else if (difficulty === 'hard') time *= 0.8

  return { goal, time: Math.round(time) }
}
