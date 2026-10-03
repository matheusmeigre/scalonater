import { starsFor, type StarCount } from '@/engine/scoring/scoring'
import type { MemoryGameState } from './model'

export interface MemoryOutcome {
  won: boolean
  stars: StarCount
  score: number
  requestsDone: number
  requestsGoal: number
  mistakes: number
}

/**
 * Estrelas por `timeLeft` (fases 1–2, média de tempo restante nos acertos)
 * ou `mistakesLeft` (fases 3–4, fração do orçamento de erros que sobrou).
 * Quem vence sempre leva pelo menos 1 estrela (`starsFor`).
 */
export function computeOutcome(state: MemoryGameState): MemoryOutcome {
  const metricValue =
    state.config.starMetric === 'timeLeft'
      ? state.requestsDone > 0
        ? state.timeBonusAcc / state.requestsDone
        : 0
      : state.config.maxMistakes > 0
        ? Math.max(0, (state.config.maxMistakes - state.mistakes) / state.config.maxMistakes)
        : 1

  return {
    won: state.status === 'won',
    stars: state.status === 'won' ? starsFor(metricValue, state.config.starThresholds) : 0,
    score: state.scoring.score,
    requestsDone: state.requestsDone,
    requestsGoal: state.config.requestsGoal,
    mistakes: state.mistakes,
  }
}
