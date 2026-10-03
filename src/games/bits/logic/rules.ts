import { createRng, roller, type Rng } from '@/engine/random'
import type { StarCount } from '@/engine/scoring/scoring'
import { fromBits, placeValue, toBits } from '@/games/shared/binary'
import type { BitsPhase } from '../phases'

/**
 * Lógica pura do "Decodificador de pacotes": pacotes viajam até a CPU, cada
 * um carregando um alvo (número, código de letra ou desenho). O jogador
 * acende as lâmpadas certas antes que o pacote chegue. Espelha o fluxo do
 * protótipo aprovado: `createGame` (reset) → `toggleBit`/`clearBits` →
 * `tick` (chegada) → `advance` (próximo pacote ou fim).
 */

/** Número ou código de letra (decimal), ou os 64 bits do desenho. */
export type BitsTarget = number | readonly (0 | 1)[]

export type PacketResult = 'ok' | 'bad'

export interface BitsState {
  phase: BitsPhase
  /** Um alvo por pacote do plano, sorteados de uma vez (`createGame`). */
  targets: readonly BitsTarget[]
  /** Pacote atual (índice em `targets`). */
  idx: number
  target: BitsTarget
  bits: readonly (0 | 1)[]
  /** Segundos que o pacote atual leva até a CPU, e quanto ainda falta. */
  dur: number
  remaining: number
  durMult: number
  /** Resultado de cada pacote já resolvido (`undefined` = ainda não). */
  results: readonly (PacketResult | undefined)[]
  lives: number
  score: number
  /** Multiplicador do próximo acerto: começa em 1, sobe a cada acerto, zera no erro ou ao espiar. */
  combo: number
  /** Maior multiplicador usado num acerto. */
  best: number
  solved: number
  peeks: number
  /** `running`: pacote andando; `locked`: pausa de comemoração/revelação antes do próximo. */
  stage: 'running' | 'locked'
  status: 'playing' | 'won' | 'lost'
}

export type BitsEvent =
  | { type: 'toggled'; index: number; value: 0 | 1 }
  | { type: 'cleared' }
  | { type: 'success'; points: number; combo: number }
  | { type: 'fail' }

/** Código de cada letra: ASCII de verdade (A = 65 = 0100 0001). */
export function letterCode(letter: string): number {
  return letter.charCodeAt(0)
}

export function letterOf(code: number): string {
  return String.fromCharCode(code)
}

function shuffled<T>(items: readonly T[], roll: () => number): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(roll() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

/** Número com exatamente `pop` lâmpadas acesas, sem repetir um já usado na fase. */
function makeTarget(pop: number, bitCount: number, used: Set<number>, roll: () => number) {
  const k = Math.max(1, Math.min(bitCount, pop))
  for (let tries = 0; tries < 200; tries++) {
    const idx = shuffled(
      Array.from({ length: bitCount }, (_, i) => i),
      roll,
    ).slice(0, k)
    const n = idx.reduce((a, i) => a + placeValue(i, bitCount), 0)
    if (!used.has(n)) {
      used.add(n)
      return n
    }
  }
  // Combinações esgotadas (não acontece nos planos atuais): aceita repetir.
  return Array.from({ length: k }, (_, i) => placeValue(i, bitCount)).reduce((a, b) => a + b, 0)
}

function generateTargets(phase: BitsPhase, rng: Rng): BitsTarget[] {
  const holder = { rng }
  const roll = roller(holder)
  if (phase.targetKind === 'image') {
    const images = shuffled(phase.images ?? [], roll)
    return phase.plan.map((_, i) => images[i % images.length]!)
  }
  if (phase.targetKind === 'letters') {
    const words = phase.words ?? []
    const word = words[Math.floor(roll() * words.length)] ?? ''
    return phase.plan.map((_, i) => letterCode(word[i % word.length] ?? 'A'))
  }
  const used = new Set<number>()
  return phase.plan.map((p) => makeTarget(p.pop ?? 1, phase.bitCount, used, roll))
}

/** Os bits que um alvo representa (a resposta certa). */
export function targetBits(phase: BitsPhase, target: BitsTarget): readonly (0 | 1)[] {
  if (phase.targetKind === 'image') return target as readonly (0 | 1)[]
  return toBits(target as number, phase.bitCount)
}

/** Valor decimal da fileira (soma das casas acesas). */
export function sumOf(state: BitsState): number {
  return fromBits(state.bits)
}

function matches(state: BitsState): boolean {
  const want = targetBits(state.phase, state.target)
  return state.bits.every((b, i) => b === want[i])
}

function startPacket(state: BitsState, idx: number): BitsState {
  const dur = state.phase.plan[idx]!.dur * state.durMult
  return {
    ...state,
    idx,
    target: state.targets[idx]!,
    bits: toBits(0, state.phase.bitCount),
    dur,
    remaining: dur,
    stage: 'running',
  }
}

export function createGame(phase: BitsPhase, seed: number, durMult = 1): BitsState {
  const targets = generateTargets(phase, createRng(seed))
  const base: BitsState = {
    phase,
    targets,
    idx: 0,
    target: targets[0]!,
    bits: toBits(0, phase.bitCount),
    dur: 0,
    remaining: 0,
    durMult,
    results: [],
    lives: phase.lives,
    score: 0,
    combo: 1,
    best: 1,
    solved: 0,
    peeks: phase.peeks,
    stage: 'running',
    status: 'playing',
  }
  return startPacket(base, 0)
}

function canAct(state: BitsState): boolean {
  return state.status === 'playing' && state.stage === 'running'
}

/** Acertou: pontos = (100 + segundos restantes × 15) × combo; o combo sobe para o próximo. */
function success(state: BitsState): { state: BitsState; event: BitsEvent } {
  const usedCombo = state.combo
  const points = Math.round((100 + state.remaining * 15) * usedCombo)
  const results = state.results.slice()
  results[state.idx] = 'ok'
  return {
    state: {
      ...state,
      score: state.score + points,
      solved: state.solved + 1,
      results,
      combo: usedCombo + 1,
      best: Math.max(state.best, usedCombo),
      stage: 'locked',
    },
    event: { type: 'success', points, combo: usedCombo },
  }
}

/** Alterna a lâmpada `index`. Se a fileira bater com o alvo, o pacote decodifica sozinho. */
export function toggleBit(
  state: BitsState,
  index: number,
): { state: BitsState; events: BitsEvent[] } {
  if (!canAct(state)) return { state, events: [] }
  const bits = state.bits.slice() as (0 | 1)[]
  const value: 0 | 1 = bits[index] === 1 ? 0 : 1
  bits[index] = value
  const next = { ...state, bits }
  const events: BitsEvent[] = [{ type: 'toggled', index, value }]
  if (!matches(next)) return { state: next, events }
  const s = success(next)
  return { state: s.state, events: [...events, s.event] }
}

/** "Apagar tudo": zera a fileira. */
export function clearBits(state: BitsState): { state: BitsState; events: BitsEvent[] } {
  if (!canAct(state)) return { state, events: [] }
  return {
    state: { ...state, bits: toBits(0, state.phase.bitCount) },
    events: [{ type: 'cleared' }],
  }
}

/**
 * O pacote chegou à CPU sem ser decodificado: perde uma vida, o combo volta
 * a x1 e a fileira passa a mostrar a resposta certa (para aprender com o erro).
 */
export function failPacket(state: BitsState): { state: BitsState; events: BitsEvent[] } {
  if (!canAct(state)) return { state, events: [] }
  const results = state.results.slice()
  results[state.idx] = 'bad'
  return {
    state: {
      ...state,
      remaining: 0,
      lives: state.lives - 1,
      combo: 1,
      results,
      bits: targetBits(state.phase, state.target),
      stage: 'locked',
    },
    events: [{ type: 'fail' }],
  }
}

/** Avança o relógio do pacote atual; ao zerar, o pacote chega à CPU (`failPacket`). */
export function tick(state: BitsState, dt: number): { state: BitsState; events: BitsEvent[] } {
  if (!canAct(state)) return { state, events: [] }
  const remaining = state.remaining - dt
  if (remaining > 0) return { state: { ...state, remaining }, events: [] }
  return failPacket({ ...state, remaining: 0 })
}

/** Depois da pausa: sem vidas, perde; senão, próximo pacote (ou vence, se era o último). */
export function advance(state: BitsState): BitsState {
  if (state.status !== 'playing' || state.stage !== 'locked') return state
  if (state.lives <= 0) return { ...state, status: 'lost' }
  const idx = state.idx + 1
  if (idx >= state.targets.length) return { ...state, status: 'won' }
  return startPacket(state, idx)
}

/** "Espiar valores": gasta uma espiada e zera o combo. */
export function peek(state: BitsState): BitsState | null {
  if (!canAct(state) || state.peeks <= 0) return null
  return { ...state, peeks: state.peeks - 1, combo: 1 }
}

export type BitsHint = { kind: 'over' } | { kind: 'bit'; index: number; rest: number }

/**
 * Dica depois de um tempo parado: se passou do alvo, apagar a menor acesa;
 * senão, a maior casa apagada que ainda cabe no que falta.
 */
export function hintFor(state: BitsState): BitsHint | null {
  if (state.phase.targetKind === 'image' || !canAct(state)) return null
  const sum = sumOf(state)
  const target = state.target as number
  if (sum > target) return { kind: 'over' }
  const rest = target - sum
  const n = state.phase.bitCount
  for (let i = 0; i < n; i++) {
    if (state.bits[i] === 0 && placeValue(i, n) <= rest) return { kind: 'bit', index: i, rest }
  }
  return null
}

/** Casas acesas do alvo, da maior para a menor (ex.: 187 → [128, 32, 16, 8, 2, 1]). */
export function partsOf(phase: BitsPhase, target: BitsTarget): number[] {
  if (phase.targetKind === 'image') return []
  const bits = targetBits(phase, target)
  return bits.flatMap((b, i) => (b === 1 ? [placeValue(i, bits.length)] : []))
}

export interface BitsOutcome {
  won: boolean
  stars: StarCount
  score: number
}

/** Estrelas pelas vidas que sobraram: 3 vidas → 3, 2 → 2, 1 → 1. O tutorial fecha com 3. */
export function computeOutcome(state: BitsState): BitsOutcome {
  if (state.status !== 'won') return { won: false, stars: 0, score: state.score }
  if (state.phase.kind === 'tutorial') return { won: true, stars: 3, score: state.score }
  const stars: StarCount = state.lives >= 3 ? 3 : state.lives === 2 ? 2 : 1
  return { won: true, stars, score: state.score }
}
