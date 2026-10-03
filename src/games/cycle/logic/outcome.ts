import { starsFor, type StarCount } from '@/engine/scoring/scoring'
import type { CycleGameState } from './model'

export interface CycleOutcome {
  won: boolean
  stars: StarCount
  score: number
  executedCount: number
  totalExecutions: number
  mistakes: number
}

/**
 * Estrelas por `timeLeft` (fases 1, 2 e 4: média de tempo restante nas
 * execuções) ou `mistakesLeft` (fase 3: fração do orçamento de erros que
 * sobrou). Quem vence sempre leva pelo menos 1 estrela (`starsFor`).
 */
export function computeOutcome(state: CycleGameState): CycleOutcome {
  const metricValue =
    state.config.starMetric === 'timeLeft'
      ? state.timeBonusCount > 0
        ? state.timeBonusAcc / state.timeBonusCount
        : 1
      : state.config.maxMistakes > 0
        ? Math.max(0, (state.config.maxMistakes - state.mistakes) / state.config.maxMistakes)
        : 1

  return {
    won: state.status === 'won',
    stars: state.status === 'won' ? starsFor(metricValue, state.config.starThresholds) : 0,
    score: state.scoring.score,
    executedCount: state.executedCount,
    totalExecutions: state.config.totalExecutions,
    mistakes: state.mistakes,
  }
}
