import { lazy } from 'react'
import { defineGame } from '@/engine/types'
import { CARDS, COPY } from './content'
import { PHASES } from './phases'

/**
 * "Do clique ao pixel" — estação final da trilha (design doc
 * `docs/design/clique-ao-pixel.md`). Uma jornada narrada em 4 capítulos que
 * reaproveita a versão mini da cena de cada uma das dez estações anteriores.
 *
 * `prerequisites` exige explicitamente as 10 outras estações (não só a
 * anterior na trilha): é a única estação com essa regra especial de
 * liberação (`docs/PLANEJAMENTO.md`, seção 2.3/4.11). O mecanismo já existe
 * em `GameMeta.prerequisites`/`effectivePrerequisites`
 * (`src/engine/phases/progression.ts`) — nenhuma mudança de base foi
 * necessária.
 */
export const pixelGame = defineGame({
  meta: {
    id: 'pixel',
    icon: 'pixel',
    prerequisites: [
      'bits',
      'gates',
      'alu',
      'memory',
      'cycle',
      'cache',
      'storage',
      'cores',
      'io',
      'network',
    ],
    hasDifficulty: false,
    hasAutoplay: false,
    released: true,
  },
  copy: COPY,
  phases: PHASES,
  cards: CARDS,
  Scene: lazy(() => import('./scene/PixelScene')),
  goalValues: (phase, { untimed }) => ({
    goal: phase.steps.length || 64,
    ...(phase.secondsLimit > 0 && !untimed ? { time: phase.secondsLimit } : {}),
  }),
})

export default pixelGame
