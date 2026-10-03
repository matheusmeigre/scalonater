import { starsFor } from '@/engine/scoring/scoring'
import { START_HEARTS, type NetworkOutcome, type NetworkState } from './model'

/**
 * Estrelas por fase: tempo que sobrou (F1/F4), vidas restantes (F2) ou poucos
 * reenvios (F3). No modo sem tempo não há relógio a medir, então cai para o
 * critério de vidas (aproximação; ver DECISIONS.md).
 */
export function computeOutcome(state: NetworkState): NetworkOutcome {
  const won = state.status === 'won'
  if (!won) return { won: false, stars: 0, score: state.scoring.score }

  const [two, three] = state.config.stars.thresholds
  let metric: number
  if (!state.config.timed) {
    metric = state.hearts / START_HEARTS
  } else if (state.config.stars.metric === 'hearts') {
    metric = state.hearts / START_HEARTS
  } else if (state.config.stars.metric === 'resends') {
    const maxExpected = Math.max(1, state.messages.length * state.config.packetCount)
    metric = Math.max(0, 1 - state.resends / maxExpected)
  } else {
    metric =
      state.config.duration > 0
        ? Math.max(0, (state.config.duration - state.elapsed) / state.config.duration)
        : 1
  }

  return { won: true, stars: starsFor(metric, [two, three]), score: state.scoring.score }
}
