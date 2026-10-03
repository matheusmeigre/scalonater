import { lazy } from 'react'
import { defineGame } from '@/engine/types'
import { CARDS, COPY } from './content'
import { CARRY_ICON } from './icons'
import { resolveTime } from './logic/rules'
import { PHASES } from './phases'
import { OpSelectorDemo } from './scene/OpSelectorDemo'

/**
 * Minigame "A calculadora (ULA)" (`alu`): o jogador soma binário à mão
 * (com o vai-um), depois monta o meio-somador e o somador completo
 * reaproveitando `shared/circuit` (criado por `gates`), e por fim usa um
 * seletor para escolher entre soma, AND e OR na mesma ULA. Design doc:
 * `docs/design/alu.md`. Não cria módulo compartilhado próprio — consumidora
 * final de `shared/circuit` e `shared/binary`.
 */
export const aluGame = defineGame({
  meta: {
    id: 'alu',
    icon: 'alu',
    hasDifficulty: true,
    hasAutoplay: false,
    // Política do projeto: publica ao mergear na master.
    released: true,
  },
  copy: COPY,
  phases: PHASES,
  cards: CARDS,
  Scene: lazy(() => import('./scene/AluScene')),
  goalValues: (phase, o) => {
    const time = resolveTime(phase, o)
    const goal =
      phase.mode === 'manual'
        ? phase.targetCount ?? 1
        : phase.mode === 'alu-select'
          ? phase.challenges?.length ?? 1
          : phase.targetTruthTable?.length ?? 1
    return { goal, ...(time === undefined ? {} : { time }) }
  },
  icons: {
    // Usado pelo card de conceito "Vai-um (carry)". "alu" já existe em ui/icons.
    carry: { node: CARRY_ICON },
  },
  preview: OpSelectorDemo,
})

export default aluGame
