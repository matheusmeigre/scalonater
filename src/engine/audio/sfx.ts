/**
 * Efeitos sonoros sintetizados com Web Audio (sem arquivos), herdados do protótipo.
 * Cada receita recebe um "sintetizador" ligado ao canal de efeitos.
 */
export interface Synth {
  tone(
    freq: number,
    dur: number,
    o?: { type?: OscillatorType; vol?: number; at?: number; slide?: number },
  ): void
  noise(dur: number, o?: { vol?: number; at?: number; freq?: number; to?: number }): void
  notes(
    freqs: number[],
    o?: { step?: number; dur?: number; type?: OscillatorType; vol?: number; last?: number },
  ): void
}

export const SFX_RECIPES = {
  // interação
  pick: (s: Synth) => s.tone(440, 0.08, { type: 'triangle', vol: 0.14, slide: 660 }),
  hover: (s: Synth) => s.tone(1250, 0.03, { vol: 0.05 }),
  cancel: (s: Synth) => s.tone(420, 0.14, { vol: 0.1, slide: 240 }),
  select: (s: Synth) => s.tone(740, 0.06, { type: 'triangle', vol: 0.12 }),
  deselect: (s: Synth) => s.tone(520, 0.06, { type: 'triangle', vol: 0.1 }),
  invalid: (s: Synth) => {
    s.tone(150, 0.11, { type: 'square', vol: 0.06 })
    s.tone(138, 0.13, { type: 'square', vol: 0.06, at: 0.12 })
  },
  click: (s: Synth) => s.tone(600, 0.04, { type: 'triangle', vol: 0.1 }),
  pause: (s: Synth) => s.tone(600, 0.12, { vol: 0.12, slide: 400 }),
  resume: (s: Synth) => s.tone(400, 0.12, { vol: 0.12, slide: 600 }),
  // jogo
  place: (s: Synth) => {
    s.tone(220, 0.09, { type: 'triangle', vol: 0.28 })
    s.tone(660, 0.08, { vol: 0.1, at: 0.03 })
  },
  hot: (s: Synth) => {
    SFX_RECIPES.place(s)
    s.tone(1047, 0.12, { vol: 0.11, at: 0.07 })
    s.tone(1568, 0.2, { vol: 0.09, at: 0.13 })
  },
  shared: (s: Synth) => {
    s.tone(220, 0.09, { type: 'triangle', vol: 0.26 })
    s.tone(233, 0.16, { type: 'square', vol: 0.04, at: 0.04 })
  },
  back: (s: Synth) => s.tone(560, 0.15, { type: 'triangle', vol: 0.16, slide: 330 }),
  io: (s: Synth) => {
    s.noise(0.22, { vol: 0.12, freq: 1400, to: 500 })
    s.tone(320, 0.2, { vol: 0.1, slide: 180 })
  },
  ioBack: (s: Synth) => {
    s.tone(392, 0.07, { vol: 0.07 })
    s.tone(523, 0.1, { vol: 0.07, at: 0.06 })
  },
  spawn: (s: Synth) => s.tone(760, 0.05, { vol: 0.035, slide: 940 }),
  done: (s: Synth) => {
    s.tone(880, 0.16, { vol: 0.16 })
    s.tone(1319, 0.28, { vol: 0.12, at: 0.06 })
  },
  blocked: (s: Synth) => {
    s.tone(300, 0.07, { type: 'square', vol: 0.06 })
    s.tone(225, 0.11, { type: 'square', vol: 0.06, at: 0.09 })
  },
  low: (s: Synth) => {
    s.tone(1000, 0.04, { type: 'square', vol: 0.035 })
    s.tone(1000, 0.04, { type: 'square', vol: 0.035, at: 0.08 })
  },
  lost: (s: Synth) => {
    s.tone(330, 0.5, { type: 'sawtooth', vol: 0.12, slide: 70 })
    s.noise(0.3, { vol: 0.12, freq: 500, to: 150 })
  },
  tick: (s: Synth) => s.tone(1500, 0.03, { type: 'triangle', vol: 0.09 }),
  // telas
  win: (s: Synth) => s.notes([523, 659, 784, 1047], { last: 0.45 }),
  lose: (s: Synth) => {
    s.notes([392, 330, 262], { step: 0.18, dur: 0.22 })
    s.tone(196, 0.55, { type: 'sawtooth', vol: 0.07, at: 0.54 })
  },
  final: (s: Synth) => s.notes([523, 659, 784, 1047, 784, 1047, 1319], { step: 0.11, last: 0.6 }),
  card: (s: Synth) =>
    s.notes([784, 988, 1175, 1568], { step: 0.07, dur: 0.12, vol: 0.12, last: 0.4 }),
  power: (s: Synth) => {
    s.tone(110, 0.6, { type: 'sawtooth', vol: 0.06, slide: 440 })
    s.notes([440, 554, 659, 880], { step: 0.09, dur: 0.14, vol: 0.1, last: 0.5 })
  },
  talk: (s: Synth) => {
    s.tone(660, 0.04, { type: 'square', vol: 0.03 })
    s.tone(880, 0.04, { type: 'square', vol: 0.03, at: 0.05 })
  },
} satisfies Record<string, (s: Synth) => void>

export type SfxName = keyof typeof SFX_RECIPES
