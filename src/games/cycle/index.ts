import { lazy } from 'react'
import { defineGame } from '@/engine/types'
import { CARDS, COPY } from './content'
import { resolveConfig } from './logic/model'
import { PHASES } from './phases'

/**
 * Minigame "O ciclo da CPU": o jogador leva cada instrução pelas três
 * estações do ciclo — buscar, decodificar, executar —, reaproveitando a
 * estante de gavetas de `src/games/shared/memory` (estação Memória).
 */
export const cycleGame = defineGame({
  meta: { id: 'cycle', icon: 'cycle', hasDifficulty: false, hasAutoplay: false, released: true },
  copy: COPY,
  phases: PHASES,
  cards: CARDS,
  Scene: lazy(() => import('./scene/CycleScene')),
  goalValues: (phase, o) => {
    const c = resolveConfig(phase, o)
    return { goal: c.goalAcc ?? c.totalExecutions, time: c.secondsPerStation }
  },
})

export default cycleGame
