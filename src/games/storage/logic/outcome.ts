import { starsFor, type StarCount } from '@/engine/scoring/scoring'
import type { StorageState } from './model'

export interface StorageOutcome {
  won: boolean
  stars: StarCount
  score: number
  opsDone: number
  opsGoal: number
  totalTime: number
  maxTotalTime: number
  defragUsed: number
  noSpaceCount: number
  lostReason: 'space' | 'time' | null
}

/**
 * Resultado final de uma partida. Estrelas: fases 1–2 (`opsLeft`) medem
 * quantas das 3 "faltas de espaço" permitidas o jogador evitou; fases 3–4
 * (`timeLeft`) medem a fração do orçamento de tempo que sobrou.
 */
export function computeOutcome(state: StorageState): StorageOutcome {
  const { phase } = state
  const won = state.status === 'won'
  const metric =
    phase.stars.metric === 'timeLeft'
      ? phase.maxTotalTime
        ? Math.max(0, (phase.maxTotalTime - state.totalTime) / phase.maxTotalTime)
        : 1
      : Math.max(0, (3 - state.noSpaceCount) / 3)
  return {
    won,
    stars: won ? starsFor(metric, phase.stars.thresholds) : 0,
    score: state.scoring.score,
    opsDone: state.opIndex,
    opsGoal: phase.operations.length,
    totalTime: Math.round(state.totalTime),
    maxTotalTime: phase.maxTotalTime ?? 0,
    defragUsed: state.defragUsed,
    noSpaceCount: state.noSpaceCount,
    lostReason: state.lostReason,
  }
}
