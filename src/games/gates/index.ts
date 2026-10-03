import { lazy } from 'react'
import { defineGame } from '@/engine/types'
import { CARDS, COPY } from './content'
import { GATE_ICON, TABLE_ICON } from './icons'
import { resolveTime } from './logic/rules'
import { PHASES } from './phases'

/**
 * Minigame "Portas lógicas" (`gates`): o jogador encaixa AND/OR/NOT num
 * circuito fixo até a lâmpada bater com a tabela-verdade-alvo em todos os
 * casos. Cria `shared/circuit/` (design doc `docs/design/gates.md`), que a
 * ULA (Etapa 3) reusa inteiro para montar o somador.
 */
export const gatesGame = defineGame({
  meta: {
    id: 'gates',
    icon: 'gates',
    hasDifficulty: true,
    hasAutoplay: false,
    // Política do projeto: publica ao mergear na master.
    released: true,
  },
  copy: COPY,
  phases: PHASES,
  cards: CARDS,
  Scene: lazy(() => import('./scene/GatesScene')),
  goalValues: (phase, o) => {
    const time = resolveTime(phase, o)
    return { goal: phase.targetTruthTable.length, ...(time === undefined ? {} : { time }) }
  },
  icons: {
    // Usados pelos cards de conceito "Porta lógica" e "Tabela-verdade".
    gate: { node: GATE_ICON },
    table: { node: TABLE_ICON },
  },
})

export default gatesGame
