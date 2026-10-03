import { lazy } from 'react'
import { defineGame } from '@/engine/types'
import { CARDS, COPY } from './content'
import { PHASES } from './phases'

/**
 * Estação Rede (`network`): dividir uma mensagem em pacotes numerados,
 * encaminhá-los por um grafo fixo de roteadores (tocar no pacote, depois no
 * roteador) e remontar a mensagem no destino, em caixinhas numeradas, não
 * importa a ordem de chegada. Ver `docs/design/network.md`.
 */
export const networkGame = defineGame({
  meta: {
    id: 'network',
    icon: 'network',
    hasDifficulty: false,
    hasAutoplay: false,
    // Política do projeto: a estação é publicada ao ser mergeada na master.
    released: true,
  },
  copy: COPY,
  phases: PHASES,
  cards: CARDS,
  Scene: lazy(() => import('./scene/NetworkScene')),
  goalValues: (phase) => ({ goal: phase.goal, time: phase.duration, hearts: 3 }),
})

export default networkGame
