import { lazy } from 'react'
import { defineGame } from '@/engine/types'
import { CARDS, COPY } from './content'
import { BINARY_ICON, LETTER_ICON } from './icons'
import { resolveConfig } from './logic/model'
import { PHASES } from './phases'

/**
 * Minigame "Bits" (interruptores): o jogador liga e desliga bits até formar
 * números, letras e, por fim, um desenho em pixels. Cria `shared/binary/`
 * (design doc `docs/design/bits.md`), que Memória e ULA vão importar nas
 * próximas ondas.
 */
export const bitsGame = defineGame({
  meta: {
    id: 'bits',
    icon: 'bits',
    hasDifficulty: true,
    hasAutoplay: false,
    // Novas estações entram com `released: false` (definição de pronto,
    // docs/PLANEJAMENTO.md seção 5); o dono do projeto decide quando liberar.
    released: false,
  },
  copy: COPY,
  phases: PHASES,
  cards: CARDS,
  Scene: lazy(() => import('./scene/BitsScene')),
  goalValues: (phase, o) => {
    const c = resolveConfig(phase, o)
    return { goal: c.goal, time: c.time }
  },
  icons: {
    // Usados pelos cards de conceito "Bit e byte" e "Código de caractere".
    binary: { node: BINARY_ICON },
    letter: { node: LETTER_ICON },
  },
})

export default bitsGame
