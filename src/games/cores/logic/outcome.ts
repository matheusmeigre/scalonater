import { starsFor, type StarCount } from '@/engine/scoring/scoring'
import type { CoresState } from './model'
import { cpuUsage } from './rules'

export interface CoresOutcome {
  won: boolean
  stars: StarCount
  score: number
  done: number
  goal: number
  maxCombo: number
  /** 0..100 */
  cpuPercent: number
  lostReason: 'time' | 'hearts' | null
}

/** Resultado final de uma partida, já com as estrelas calculadas. */
export function computeOutcome(s: CoresState): CoresOutcome {
  const { config } = s
  const won = s.status === 'won'
  let metric = cpuUsage(s)
  if (config.starMetric === 'timeLeft') metric = config.duration ? s.timeLeft / config.duration : 1
  if (config.starMetric === 'hearts') metric = config.hearts ? s.hearts / config.hearts : 1
  return {
    won,
    stars: won ? starsFor(metric, config.starThresholds) : 0,
    score: s.scoring.score,
    done: s.done,
    goal: config.goal,
    maxCombo: Math.max(1, s.scoring.maxCombo),
    cpuPercent: Math.round(cpuUsage(s) * 100),
    lostReason: s.lostReason,
  }
}
