import { lazy } from 'react'
import { defineGame } from '@/engine/types'
import { CARDS, COPY } from './content'
import { resolveConfig } from './logic/model'
import { PHASES } from './phases'

/** Minigame "Núcleos": o jogador é o escalonador do sistema operacional. */
export const coresGame = defineGame({
  meta: { id: 'cores', icon: 'cores', hasDifficulty: true, hasAutoplay: true },
  copy: COPY,
  phases: PHASES,
  cards: CARDS,
  Scene: lazy(() => import('./scene/CoresScene')),
  goalValues: (phase, o) => {
    const c = resolveConfig(phase, o)
    return { goal: c.goal, time: c.duration, hearts: c.hearts }
  },
})
