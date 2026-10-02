import { lazy } from 'react'
import { defineGame } from '@/engine/types'
import { CARDS, COPY } from './content'
import { PHASES } from './phases'

/**
 * Esqueleto de minigame (README, "Como criar um novo minigame"). Esta pasta
 * começa com "_" e por isso é ignorada pelo registro automático
 * (`src/games/registry.ts`): copie-a para `src/games/<id>/` — onde `<id>`
 * é uma das estações de `STATION_IDS` (`src/engine/types.ts`) — e troque:
 *
 * 1. `meta.id` (abaixo) pelo id real da estação;
 * 2. `phases.ts`, `content.ts` e `logic/` pela fase e pela regra do seu jogo;
 * 3. `scene/` pela cena do seu jogo (continue usando `GameFrame`,
 *    `useTutorialSteps`/`useNarration` e o kit `src/ui/dnd` se precisar
 *    de arraste).
 *
 * Nada em `src/engine`, `src/ui`, `src/shell` ou `src/games/registry.ts`
 * precisa mudar: a nova pasta aparece no mapa, nas rotas, no hub, no
 * resultado e no Manual sozinha.
 */
export const templateGame = defineGame({
  meta: {
    id: 'bits', // troque pelo id real da estação ao copiar esta pasta
    icon: 'info',
    hasDifficulty: false,
    hasAutoplay: false,
    released: false,
  },
  copy: COPY,
  phases: PHASES,
  cards: CARDS,
  Scene: lazy(() => import('./scene/TemplateScene')),
  goalValues: (phase) => ({ goal: phase.goal }),
})

export default templateGame
