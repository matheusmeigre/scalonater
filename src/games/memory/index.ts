import { lazy } from 'react'
import { defineGame } from '@/engine/types'
import { CARDS, COPY } from './content'
import { resolveConfig } from './logic/model'
import { PHASES } from './phases'

/** Minigame "Memória": o jogador atende pedidos de guardar e ler numa estante de gavetas. */
export const memoryGame = defineGame({
  meta: { id: 'memory', icon: 'memory', hasDifficulty: false, hasAutoplay: false, released: true },
  copy: COPY,
  phases: PHASES,
  cards: CARDS,
  Scene: lazy(() => import('./scene/MemoryScene')),
  goalValues: (phase, o) => {
    const c = resolveConfig(phase, o)
    return { goal: c.requestsGoal, time: c.secondsPerRequest }
  },
})

export default memoryGame
