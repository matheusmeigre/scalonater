import { lazy } from 'react'
import { defineGame } from '@/engine/types'
import { CARDS, COPY } from './content'
import { PHASES } from './phases'

/**
 * Cache: a CPU pede endereços automaticamente; o jogador só decide quem sai
 * quando a bancada (o cache) enche. Ver `docs/design/cache.md`.
 */
export const cacheGame = defineGame({
  meta: {
    id: 'cache',
    icon: 'cache',
    hasDifficulty: false,
    hasAutoplay: false,
    released: true,
  },
  copy: COPY,
  phases: PHASES,
  cards: CARDS,
  Scene: lazy(() => import('./scene/CacheScene')),
  goalValues: (phase) => ({ goal: phase.requestsGoal, time: phase.maxAvgLatency }),
})

export default cacheGame
