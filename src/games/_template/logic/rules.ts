import { createRng, nextRandom, type Rng } from '@/engine/random'
import {
  addPoints,
  emptyCombo,
  registerHit,
  starsFor,
  type ComboState,
  type StarCount,
} from '@/engine/scoring/scoring'
import type { TemplatePhase } from '../phases'

/**
 * Estado de exemplo: um alvo por vez (0..`targetCount`-1), quantos toques
 * certos já aconteceram e a pontuação. Troque por sua própria regra — o
 * importante é continuar puro (estado → estado, sem efeitos) para os testes
 * ficarem fáceis de escrever e deterministas com semente.
 */
export interface TemplateState {
  phase: TemplatePhase
  rng: Rng
  target: number
  targetCount: number
  hits: number
  scoring: ComboState
  status: 'playing' | 'won' | 'lost'
}

export function createGame(phase: TemplatePhase, targetCount: number, seed: number): TemplateState {
  const rng = createRng(seed)
  const [v, nextRng] = nextRandom(rng)
  return {
    phase,
    rng: nextRng,
    target: Math.floor(v * targetCount),
    targetCount,
    hits: 0,
    scoring: emptyCombo(),
    status: 'playing',
  }
}

/** Jogador tocou no alvo `index`. Só pontua quando é o alvo certo. */
export function tap(state: TemplateState, index: number): TemplateState {
  if (state.status !== 'playing') return state
  if (index !== state.target) {
    return { ...state, scoring: addPoints(state.scoring, 0) }
  }
  const hits = state.hits + 1
  const scoring = registerHit(state.scoring, 10, 2)
  const won = hits >= state.phase.goal
  const [v, rng] = nextRandom(state.rng)
  return {
    ...state,
    hits,
    scoring,
    rng,
    target: won ? state.target : Math.floor(v * state.targetCount),
    status: won ? 'won' : 'playing',
  }
}

export interface TemplateOutcome {
  won: boolean
  stars: StarCount
  score: number
}

export function computeOutcome(state: TemplateState): TemplateOutcome {
  const progress = Math.min(1, state.hits / state.phase.goal)
  return {
    won: state.status === 'won',
    stars: state.status === 'won' ? starsFor(progress, [0.6, 0.9]) : 0,
    score: state.scoring.score,
  }
}
