import { createRng, nextRandom, type Rng } from '@/engine/random'
import {
  emptyCombo,
  registerHit,
  starsFor,
  type ComboState,
  type StarCount,
} from '@/engine/scoring/scoring'
import { fromBits, hammingDistance, toBits } from '@/games/shared/binary'
import type { BitsPhase } from '../phases'

/** Para `number`/`letters`, o alvo é um código (decimal). Para `image`, os 64 bits do desenho. */
export type BitsTarget = number | readonly (0 | 1)[]

export interface BitsState {
  phase: BitsPhase
  rng: Rng
  bits: readonly (0 | 1)[]
  target: BitsTarget
  prevTarget: BitsTarget | null
  hits: number
  targetCount: number
  /** Distância de Hamming entre a fileira no início do alvo atual e o alvo: o mínimo teórico de toques. */
  minToggles: number
  /** Toques desde que o alvo atual começou a valer (design doc: `countToggles`). */
  togglesThisTarget: number
  /** Quantos alvos foram fechados no mínimo de toques (só fases com `efficiencyBonus`). */
  bonusHits: number
  scoring: ComboState
  status: 'playing' | 'won' | 'lost'
}

function arraysEqual(a: readonly (0 | 1)[], b: readonly (0 | 1)[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

function targetRange(phase: BitsPhase): number {
  if (phase.targetKind === 'number') return 2 ** phase.bitCount
  if (phase.targetKind === 'letters') return phase.alphabet?.length ?? 0
  return phase.images?.length ?? 0
}

/** Sorteia o próximo alvo, nunca repetindo o alvo imediatamente anterior (design doc). */
function sampleTarget(phase: BitsPhase, rng: Rng, prev: BitsTarget | null): [BitsTarget, Rng] {
  const range = Math.max(1, targetRange(phase))
  const [v, nextRng] = nextRandom(rng)
  let idx = Math.min(range - 1, Math.floor(v * range))

  if (phase.targetKind === 'image') {
    const images = phase.images ?? []
    if (images.length > 1 && prev && arraysEqual(images[idx]!, prev as readonly (0 | 1)[])) {
      idx = (idx + 1) % images.length
    }
    return [images[idx]!, nextRng]
  }

  if (range > 1 && prev !== null && idx === prev) idx = (idx + 1) % range
  return [idx, nextRng]
}

function targetBits(phase: BitsPhase, target: BitsTarget): readonly (0 | 1)[] {
  if (phase.targetKind === 'image') return target as readonly (0 | 1)[]
  return toBits(target as number, phase.bitCount)
}

function checkMatch(state: BitsState): boolean {
  if (state.phase.targetKind === 'image') return arraysEqual(state.bits, state.target as readonly (0 | 1)[])
  return fromBits(state.bits) === (state.target as number)
}

export function createGame(phase: BitsPhase, targetCount: number, seed: number): BitsState {
  const rng0 = createRng(seed)
  const bits = toBits(0, phase.bitCount)
  const [target, rng] = sampleTarget(phase, rng0, null)
  return {
    phase,
    rng,
    bits,
    target,
    prevTarget: null,
    hits: 0,
    targetCount,
    minToggles: hammingDistance(bits, targetBits(phase, target)),
    togglesThisTarget: 0,
    bonusHits: 0,
    scoring: emptyCombo(),
    status: 'playing',
  }
}

export type BitsEvent =
  | { type: 'toggled'; index: number; value: 0 | 1 }
  | { type: 'matched' }
  | { type: 'mismatch' }
  | { type: 'advanced'; target: BitsTarget }
  | { type: 'won' }

/** Troca o estado do interruptor `index`, devolvendo o novo estado e os eventos ocorridos. */
export function toggleBit(state: BitsState, index: number): { state: BitsState; events: BitsEvent[] } {
  if (state.status !== 'playing') return { state, events: [] }

  const bits = state.bits.slice() as (0 | 1)[]
  const value: 0 | 1 = bits[index] === 1 ? 0 : 1
  bits[index] = value
  const toggled = { ...state, bits, togglesThisTarget: state.togglesThisTarget + 1 }
  const events: BitsEvent[] = [{ type: 'toggled', index, value }]

  if (!checkMatch(toggled)) {
    events.push({ type: 'mismatch' })
    return { state: toggled, events }
  }

  events.push({ type: 'matched' })
  const hits = toggled.hits + 1
  const bonus = toggled.phase.efficiencyBonus && toggled.togglesThisTarget === toggled.minToggles
  const scoring = registerHit(toggled.scoring, bonus ? 40 : 25, 5)
  const bonusHits = toggled.bonusHits + (bonus ? 1 : 0)
  const won = hits >= toggled.targetCount

  if (won) {
    events.push({ type: 'won' })
    return { state: { ...toggled, hits, scoring, bonusHits, status: 'won' }, events }
  }

  const { state: advanced, event } = nextTarget({ ...toggled, hits, scoring, bonusHits })
  events.push(event)
  return { state: advanced, events }
}

/** Sorteia o próximo alvo com `engine/random.ts` (determinístico pela semente). */
export function nextTarget(state: BitsState): { state: BitsState; event: { type: 'advanced'; target: BitsTarget } } {
  const [target, rng] = sampleTarget(state.phase, state.rng, state.target)
  const next: BitsState = {
    ...state,
    rng,
    prevTarget: state.target,
    target,
    minToggles: hammingDistance(state.bits, targetBits(state.phase, target)),
    togglesThisTarget: 0,
  }
  return { state: next, event: { type: 'advanced', target } }
}

/** Compara a fileira atual com o alvo, sem mexer no estado. */
export function checkTarget(state: BitsState): { type: 'matched' } | { type: 'mismatch' } {
  return checkMatch(state) ? { type: 'matched' } : { type: 'mismatch' }
}

/** Toques desde que o alvo atual começou a valer. */
export function countToggles(state: BitsState): number {
  return state.togglesThisTarget
}

export function markLost(state: BitsState): BitsState {
  return state.status === 'playing' ? { ...state, status: 'lost' } : state
}

export interface BitsOutcome {
  won: boolean
  stars: StarCount
  score: number
}

/**
 * Estrelas (design doc): tempo restante ≥ 30% → 3; ≥ 12% → 2; vitória simples
 * → 1 (mesma fórmula da fase 1 do Núcleos). Tutorial sempre fecha com 3. No
 * modo sem tempo, as fases sem bônus de eficiência fecham com 3; a fase "sem
 * cola" usa a fração de alvos fechados no mínimo de toques.
 */
export function computeOutcome(
  state: BitsState,
  o: { untimed: boolean; timeLeftFraction: number },
): BitsOutcome {
  if (state.status !== 'won') return { won: false, stars: 0, score: state.scoring.score }
  if (state.phase.kind === 'tutorial') return { won: true, stars: 3, score: state.scoring.score }

  let stars: StarCount
  if (o.untimed) {
    stars = state.phase.efficiencyBonus
      ? starsFor(state.bonusHits / state.targetCount, [0.5, 0.8])
      : 3
  } else {
    stars = starsFor(Math.max(0, o.timeLeftFraction), [0.12, 0.3])
  }
  return { won: true, stars, score: state.scoring.score }
}
