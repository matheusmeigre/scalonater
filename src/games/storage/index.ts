import { lazy } from 'react'
import { defineGame } from '@/engine/types'
import { CARDS, COPY } from './content'
import { PHASES } from './phases'

/**
 * Armazenamento (README, "Como criar um novo minigame"): um disco em grade
 * de blocos e uma tabela de arquivos. O jogador salva, apaga e reaproveita
 * espaço; fragmentação e o custo de posição no HD aparecem a partir da
 * Fase 2. Design doc: docs/design/storage.md.
 *
 * `released: false` é o padrão das estações novas (docs/PLANEJAMENTO.md, seção 5): em
 * produção ela aparece como "em construção" e não entra como pré-requisito de ninguém (a
 * trilha é "linear, com exceção" — DECISIONS.md, Etapa 0). Em `npm run dev` e com
 * `VITE_SHOW_UNRELEASED=1` ela aparece liberada, como qualquer outra, para revisão. O dono do
 * projeto decide quando virar `true`.
 */
export const storageGame = defineGame({
  meta: {
    id: 'storage',
    icon: 'storage',
    hasDifficulty: false,
    hasAutoplay: false,
    released: true,
  },
  copy: COPY,
  phases: PHASES,
  cards: CARDS,
  Scene: lazy(() => import('./scene/StorageScene')),
  goalValues: (phase) => ({ goal: phase.operations.length, time: phase.maxTotalTime ?? 0 }),
})

export default storageGame
