import { starsFor, type StarCount } from '@/engine/scoring/scoring'
import type { IoState } from './model'

export interface IoOutcome {
  won: boolean
  stars: StarCount
  score: number
  attended: number
  hearts: number
  /** 0..100 */
  progressPercent: number
  energyWasted: number
  lostReason: 'queue' | 'deadline' | 'time' | null
}

/** Resultado final de uma partida, já com as estrelas calculadas. */
export function computeOutcome(s: IoState): IoOutcome {
  const { config } = s
  const won = s.status === 'won'
  let metric = 1
  if (config.starMetric === 'timeLeft') metric = config.duration ? s.timeLeft / config.duration : 1
  if (config.starMetric === 'hearts') metric = config.hearts ? s.hearts / config.hearts : 1
  if (config.starMetric === 'energySaved')
    metric = Math.max(0, 1 - s.energyWasted / Math.max(1, config.goal * 2))

  const progressPercent = config.compareMode
    ? Math.round(s.pollingProgress * 100)
    : config.dma
      ? Math.round((s.dmaCollected ? 1 : s.dmaProgress) * 100)
      : Math.round(s.mainProgress * 100)

  // o tutorial sempre fecha com todas as estrelas: é só para aprender.
  const isTutorial = !config.timed && !config.compareMode && !config.dma && config.duration === 0

  return {
    won,
    stars: !won ? 0 : isTutorial ? 3 : starsFor(metric, config.starThresholds),
    score: s.scoring.score,
    attended: s.attendedCount,
    hearts: s.hearts,
    progressPercent,
    energyWasted: s.energyWasted,
    lostReason: s.lostReason,
  }
}
