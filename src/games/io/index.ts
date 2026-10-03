import { lazy } from 'react'
import { defineGame } from '@/engine/types'
import { CARDS, COPY } from './content'
import { IO_ICONS } from './icons'
import { resolveConfig } from './logic/model'
import { PHASES } from './phases'
import { IoPreviewDemo } from './scene/IoPreviewDemo'

/**
 * Interrupções e E/S: a CPU guarda o contexto da tarefa principal antes de
 * atender a campainha de um dispositivo (teclado, mouse, disco, rede), para
 * não perder o progresso em andamento. Ver `docs/design/io.md`.
 */
export const ioGame = defineGame({
  meta: {
    id: 'io',
    icon: 'io',
    hasDifficulty: true,
    hasAutoplay: false,
    released: true,
  },
  copy: COPY,
  phases: PHASES,
  cards: CARDS,
  Scene: lazy(() => import('./scene/IoScene')),
  goalValues: (phase, o) => {
    const config = resolveConfig(phase, o)
    return {
      goal: phase.goal,
      time: config.duration,
      hearts: config.hearts,
      queueMax: config.queueMax,
    }
  },
  icons: IO_ICONS,
  preview: IoPreviewDemo,
})

export default ioGame
