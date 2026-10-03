import { starsFor, type StarCount } from '@/engine/scoring/scoring'
import type { GameState } from './rules'

export interface CacheOutcome {
  won: boolean
  stars: StarCount
  score: number
  requestsDone: number
  avgLatency: number
  lostReason: 'latency' | null
}

/**
 * Resultado final de uma partida. Diferente das outras estações,
 * `stars.metric` é sempre `'avgLatency'` aqui: quanto **menor** o valor,
 * melhor. `starsFor` recebe `1 - avgLatency / maxAvgLatency`, clampado em
 * `[0, 1]` (design doc, "Contrato de dados das fases").
 */
export function computeOutcome(s: GameState): CacheOutcome {
  const won = s.cache.status === 'won'
  const avgLatency = s.cache.requestsDone > 0 ? s.cache.totalLatency / s.cache.requestsDone : 0
  const metric = Math.max(0, Math.min(1, 1 - avgLatency / s.cache.config.maxAvgLatency))

  // o tutorial (sem limite de derrota de verdade) sempre fecha com todas as
  // estrelas: é só para aprender, como nas outras estações.
  const isTutorial = s.cache.config.maxAvgLatency >= 10

  return {
    won,
    stars: !won ? 0 : isTutorial ? 3 : starsFor(metric, s.cache.config.starThresholds),
    score: s.scoring.score,
    requestsDone: s.cache.requestsDone,
    avgLatency,
    lostReason: !won && s.cache.status === 'lost' ? 'latency' : null,
  }
}
