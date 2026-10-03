import { lazy } from 'react'
import type { Synth } from '@/engine/audio/sfx'
import { defineGame } from '@/engine/types'
import { CARDS, COPY } from './content'
import { BINARY_ICON, LETTER_ICON } from './icons'
import { resolveConfig } from './logic/model'
import { PHASES } from './phases'

/**
 * Bipe do protótipo "Decodificador de pacotes" (oscilador direto com ganho
 * `v`) traduzido para o sintetizador do motor, cuja saída de efeitos tem
 * ganho 0,55: o volume é compensado para soar igual.
 */
function beep(s: Synth, f: number, d = 0.09, type: OscillatorType = 'square', v = 0.035, w = 0) {
  s.tone(f, d, { type, vol: v / 0.55, at: w })
}

const sfx: Record<string, (s: Synth) => void> = {
  bitsWin: (s) =>
    [523, 659, 784, 1046].forEach((f, k) => beep(s, f, 0.12, 'square', 0.035, k * 0.07)),
  bitsLose: (s) => {
    beep(s, 220, 0.25, 'sawtooth', 0.04)
    beep(s, 150, 0.35, 'sawtooth', 0.04, 0.15)
  },
  bitsTick: (s) => beep(s, 880, 0.05, 'square', 0.025),
  bitsGo: (s) => beep(s, 1046, 0.25, 'square', 0.04),
  bitsCount: (s) => beep(s, 523, 0.08, 'square', 0.03),
}
for (let i = 0; i < 8; i++) {
  sfx[`bitsOn${i}`] = (s) => beep(s, 330 + i * 55, 0.08, 'square', 0.03)
  sfx[`bitsOff${i}`] = (s) => beep(s, 260 + i * 30, 0.06, 'triangle', 0.04)
}

/**
 * Minigame "Bits": o Decodificador de pacotes. Pacotes de dados viajam até
 * a CPU, cada um carregando um número (ou letra, ou desenho), e o jogador
 * acende as lâmpadas certas para escrevê-lo em binário antes que chegue.
 * Cria `shared/binary/`, usado por Memória e ULA.
 */
export const bitsGame = defineGame({
  meta: {
    id: 'bits',
    icon: 'bits',
    hasDifficulty: true,
    hasAutoplay: false,
    released: true,
  },
  copy: COPY,
  phases: PHASES,
  cards: CARDS,
  Scene: lazy(() => import('./scene/BitsScene')),
  goalValues: (phase, o) => ({ goal: resolveConfig(phase, o).goal, hearts: phase.lives }),
  icons: {
    // Usados pelos cards de conceito "Bit e byte" e "Código de caractere".
    binary: { node: BINARY_ICON },
    letter: { node: LETTER_ICON },
  },
  sfx,
})

export default bitsGame
