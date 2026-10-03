import { createRng, nextRandom, type Rng } from '@/engine/random'
import {
  breakCombo,
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
  /**
   * Toda a sequência de alvos da fase, sorteada de uma vez em `createGame`
   * (determinística pela semente): dá para mostrar os próximos alvos na
   * "fila" antes de chegarem (ver `upcomingTargets`).
   */
  targets: readonly BitsTarget[]
  /** Posição do alvo atual em `targets` (`targets[idx] === target`). */
  idx: number
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
  /** Vidas restantes: um alvo que "cai" até a fileira sem bater custa uma (ver `missTarget`). */
  lives: number
  /** Vidas no início da fase (0 = fase sem esse mecanismo, ex.: tutorial). */
  maxLives: number
  /** Quantos alvos "caíram" sem bater (não contam como acerto). */
  misses: number
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

/** Os bits que um alvo representa (útil para revelar a resposta certa ao errar). */
export function targetBits(phase: BitsPhase, target: BitsTarget): readonly (0 | 1)[] {
  if (phase.targetKind === 'image') return target as readonly (0 | 1)[]
  return toBits(target as number, phase.bitCount)
}

function checkMatch(state: BitsState): boolean {
  if (state.phase.targetKind === 'image')
    return arraysEqual(state.bits, state.target as readonly (0 | 1)[])
  return fromBits(state.bits) === (state.target as number)
}

/**
 * Sorteia toda a sequência de alvos de uma vez, determinística pela semente
 * (design doc, fila de próximos alvos): o jogo pode perder até `maxLives`
 * alvos sem contar como acerto, então gera uma folga além de `targetCount`.
 */
function generateTargets(phase: BitsPhase, seed: number, targetCount: number, maxLives: number) {
  let rng: Rng = createRng(seed)
  let prev: BitsTarget | null = null
  const targets: BitsTarget[] = []
  const count = targetCount + maxLives + 10
  for (let i = 0; i < count; i++) {
    const [target, next] = sampleTarget(phase, rng, prev)
    targets.push(target)
    prev = target
    rng = next
  }
  return targets
}

export function createGame(phase: BitsPhase, targetCount: number, seed: number): BitsState {
  const bits = toBits(0, phase.bitCount)
  const maxLives = phase.lives ?? 0
  const targets = generateTargets(phase, seed, targetCount, maxLives)
  const target = targets[0]!
  const initial: BitsState = {
    phase,
    targets,
    idx: 0,
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
    lives: maxLives,
    maxLives,
    misses: 0,
  }
  // O primeiro alvo sorteado pode já bater com a fileira zerada (ex.: "A" em
  // binário é 00000000): sem isto, a fase travaria esperando um toque que
  // não precisa acontecer (ver `autoAdvanceIfAlreadyMatched`).
  return autoAdvanceIfAlreadyMatched(initial).state
}

/** Os próximos `n` alvos depois do atual, para a "fila" na cena (nunca mexe no estado). */
export function upcomingTargets(state: BitsState, n: number): readonly BitsTarget[] {
  return state.targets.slice(state.idx + 1, state.idx + 1 + n)
}

export type BitsEvent =
  | { type: 'toggled'; index: number; value: 0 | 1 }
  | { type: 'matched' }
  | { type: 'mismatch' }
  | { type: 'advanced'; target: BitsTarget }
  | { type: 'won' }
  | { type: 'missed' }
  | { type: 'out-of-lives' }
  | { type: 'cleared' }

/**
 * A fileira bate com o alvo: credita o acerto (pontos, combo, bônus de
 * eficiência) e sorteia o próximo alvo, ou vence a fase. Extraído de
 * `toggleBit` para ser reaproveitado por `autoAdvanceIfAlreadyMatched`
 * (o alvo às vezes já nasce igual à fileira, sem exigir nenhum toque).
 */
function applyMatch(state: BitsState): { state: BitsState; events: BitsEvent[] } {
  const events: BitsEvent[] = [{ type: 'matched' }]
  const hits = state.hits + 1
  const bonus = state.phase.efficiencyBonus && state.togglesThisTarget === state.minToggles
  const scoring = registerHit(state.scoring, bonus ? 40 : 25, 5)
  const bonusHits = state.bonusHits + (bonus ? 1 : 0)
  const won = hits >= state.targetCount

  if (won) {
    events.push({ type: 'won' })
    return { state: { ...state, hits, scoring, bonusHits, status: 'won' }, events }
  }

  const { state: advanced, event } = nextTarget({ ...state, hits, scoring, bonusHits })
  events.push(event)
  return { state: advanced, events }
}

/**
 * Um alvo sorteado (no início da fase ou logo após um acerto/erro) pode já
 * bater com a fileira sem precisar de nenhum toque (ex.: o alvo "A" das
 * letras é 00000000, igual à fileira zerada do começo). Sem isso, o jogo
 * travaria esperando um toque que nunca precisa acontecer: `toggleBit` só
 * confere o alvo reagindo a um toque. Repete a checagem (com um teto de
 * segurança) porque, em tese, o próximo alvo sorteado também poderia já
 * bater.
 */
function autoAdvanceIfAlreadyMatched(state: BitsState): { state: BitsState; events: BitsEvent[] } {
  const events: BitsEvent[] = []
  let s = state
  for (let i = 0; i < 4 && s.status === 'playing' && checkMatch(s); i++) {
    const applied = applyMatch(s)
    s = applied.state
    events.push(...applied.events)
  }
  return { state: s, events }
}

/** Troca o estado do interruptor `index`, devolvendo o novo estado e os eventos ocorridos. */
export function toggleBit(
  state: BitsState,
  index: number,
): { state: BitsState; events: BitsEvent[] } {
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

  const { state: matched, events: matchEvents } = applyMatch(toggled)
  events.push(...matchEvents)
  const after = autoAdvanceIfAlreadyMatched(matched)
  events.push(...after.events)
  return { state: after.state, events }
}

/**
 * Apaga a fileira inteira de uma vez ("Apagar tudo"): não conta como toque
 * para o bônus de eficiência (é um atalho de conforto, não uma jogada).
 * Ainda confere o alvo depois — apagar pode, por coincidência, já bater
 * (alvo igual a zero).
 */
export function clearBits(state: BitsState): { state: BitsState; events: BitsEvent[] } {
  if (state.status !== 'playing') return { state, events: [] }

  const bits = toBits(0, state.phase.bitCount)
  const cleared = { ...state, bits }
  const events: BitsEvent[] = [{ type: 'cleared' }]

  if (!checkMatch(cleared)) return { state: cleared, events }

  const { state: matched, events: matchEvents } = applyMatch(cleared)
  events.push(...matchEvents)
  const after = autoAdvanceIfAlreadyMatched(matched)
  events.push(...after.events)
  return { state: after.state, events }
}

/**
 * Avança para o próximo alvo já sorteado em `targets` (ver `createGame`).
 * A fileira volta a zero: cada alvo novo é decodificado do zero (design do
 * pacote), o que também mantém o medidor de soma e o bônus de eficiência
 * sempre comparando com a mesma base.
 */
export function nextTarget(state: BitsState): {
  state: BitsState
  event: { type: 'advanced'; target: BitsTarget }
} {
  const idx = state.idx + 1
  // Proteção: não deveria faltar alvo pré-sorteado (ver folga em `generateTargets`),
  // mas repetir o último em vez de estourar o array é mais seguro que travar.
  const target = state.targets[idx] ?? state.targets[state.targets.length - 1]!
  const bits = toBits(0, state.phase.bitCount)
  const next: BitsState = {
    ...state,
    idx,
    prevTarget: state.target,
    target,
    bits,
    minToggles: hammingDistance(bits, targetBits(state.phase, target)),
    togglesThisTarget: 0,
  }
  return { state: next, event: { type: 'advanced', target } }
}

/**
 * O alvo atual "caiu" até a fileira sem bater (design doc, mecânica de
 * queda): quebra o combo e custa uma vida. Sem vidas (`maxLives` 0, ex.:
 * tutorial) ou fora de jogo, não faz nada. Zerando as vidas, a fase termina
 * em derrota; senão, sorteia o próximo alvo como um acerto perdido.
 */
export function missTarget(state: BitsState): { state: BitsState; events: BitsEvent[] } {
  if (state.status !== 'playing' || state.maxLives <= 0) return { state, events: [] }

  const lives = state.lives - 1
  const scoring = breakCombo(state.scoring)
  const missed: BitsState = { ...state, lives, scoring, misses: state.misses + 1 }
  const events: BitsEvent[] = [{ type: 'missed' }]

  if (lives <= 0) {
    events.push({ type: 'out-of-lives' })
    return { state: { ...missed, status: 'lost' }, events }
  }

  const { state: advanced, event } = nextTarget(missed)
  events.push(event)
  const after = autoAdvanceIfAlreadyMatched(advanced)
  events.push(...after.events)
  return { state: after.state, events }
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
  /** Por que perdeu: vidas zeradas ou tempo esgotado. `null` ao vencer. */
  lostReason: 'lives' | 'time' | null
}

function lostReasonFor(state: BitsState): 'lives' | 'time' | null {
  if (state.status !== 'lost') return null
  return state.maxLives > 0 && state.lives <= 0 ? 'lives' : 'time'
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
  if (state.status !== 'won') {
    return { won: false, stars: 0, score: state.scoring.score, lostReason: lostReasonFor(state) }
  }
  if (state.phase.kind === 'tutorial') {
    return { won: true, stars: 3, score: state.scoring.score, lostReason: null }
  }

  let stars: StarCount
  if (o.untimed) {
    stars = state.phase.efficiencyBonus
      ? starsFor(state.bonusHits / state.targetCount, [0.5, 0.8])
      : 3
  } else {
    stars = starsFor(Math.max(0, o.timeLeftFraction), [0.12, 0.3])
  }
  return { won: true, stars, score: state.scoring.score, lostReason: null }
}
