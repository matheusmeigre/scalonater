import type { DifficultyId } from '@/engine/types'
import {
  truthTable,
  type Circuit,
  type CircuitNode,
  type NodeId,
} from '@/games/shared/circuit'
import {
  addPoints,
  emptyCombo,
  registerHit,
  starsFor,
  type ComboState,
  type StarCount,
} from '@/engine/scoring/scoring'
import type { GatesPhase, PlayableGateType } from '../phases'

type Stock = Partial<Record<PlayableGateType, number>>

export interface GatesState {
  phase: GatesPhase
  /** Valores atuais dos interruptores de entrada (exploração livre; não afeta a vitória). */
  inputs: Record<NodeId, boolean>
  /** Porta encaixada em cada slot (id do slot → porta). */
  placed: Record<NodeId, PlayableGateType>
  /** `undefined` quando `phase.stock === 'unlimited'`. */
  stock: Stock | undefined
  /** Quantas vezes `clearGate` foi chamado (usado nas estrelas do modo sem tempo). */
  swaps: number
  scoring: ComboState
  status: 'playing' | 'won' | 'lost'
}

function inputIdsOf(phase: GatesPhase): NodeId[] {
  return phase.template.nodes.filter((n) => n.kind === 'input').map((n) => n.id)
}

function slotIdsOf(phase: GatesPhase): NodeId[] {
  return phase.template.nodes.filter((n) => n.kind === 'slot').map((n) => n.id)
}

function initialStock(phase: GatesPhase): Stock | undefined {
  if (phase.stock === 'unlimited') return undefined
  const stock: Stock = {}
  for (const gate of phase.stock) stock[gate] = (stock[gate] ?? 0) + 1
  return stock
}

export function createGame(phase: GatesPhase): GatesState {
  const inputs: Record<NodeId, boolean> = {}
  for (const id of inputIdsOf(phase)) inputs[id] = false
  return {
    phase,
    inputs,
    placed: {},
    stock: initialStock(phase),
    swaps: 0,
    scoring: emptyCombo(),
    status: 'playing',
  }
}

/** Jogador liga/desliga um interruptor de entrada (exploração livre, sem efeito na vitória). */
export function toggleInput(state: GatesState, inputId: NodeId): GatesState {
  if (state.status !== 'playing') return state
  if (!(inputId in state.inputs)) return state
  return { ...state, inputs: { ...state.inputs, [inputId]: !state.inputs[inputId] } }
}

/** Monta o `Circuit` completo substituindo cada `SlotNode` pela porta já encaixada. */
function buildCircuit(state: GatesState): Circuit {
  return state.phase.template.nodes.map((node): CircuitNode => {
    if (node.kind !== 'slot') return node
    const gate = state.placed[node.id]
    // Enquanto o slot não tem porta, usa AND como substituto neutro só para
    // o circuito ficar bem formado (checkCircuit nunca chama truthTable
    // antes de todos os slots estarem preenchidos — ver 'incomplete' abaixo).
    return { kind: 'gate', id: node.id, gate: gate ?? 'AND', inputs: node.inputs }
  })
}

export type CheckResult =
  | { type: 'won' }
  | { type: 'incomplete' }
  | { type: 'mismatch'; failingCases: readonly number[] }

/**
 * Monta o circuito completo a partir do `CircuitTemplate` + portas
 * colocadas, chama `truthTable` de `shared/circuit` e compara linha a linha
 * com `phase.targetTruthTable`. Testa TODOS os `2^inputCount` casos, não só
 * o caso visível no momento (design doc `gates`, "Mecânica principal").
 */
export function checkCircuit(state: GatesState): CheckResult {
  const slotIds = slotIdsOf(state.phase)
  if (slotIds.some((id) => state.placed[id] === undefined)) return { type: 'incomplete' }

  const circuit = buildCircuit(state)
  const rows = truthTable(circuit)
  const inputCount = inputIdsOf(state.phase).length
  const failingCases: number[] = []
  rows.forEach((row, i) => {
    if (row[inputCount] !== state.phase.targetTruthTable[i]) failingCases.push(i)
  })
  return failingCases.length === 0 ? { type: 'won' } : { type: 'mismatch', failingCases }
}

export type PlaceEvent =
  | { type: 'placed'; slotId: NodeId; gate: PlayableGateType }
  | { type: 'blocked'; reason: 'sem-estoque' }

/**
 * Preenche um slot vazio (ou troca a porta de um slot já preenchido) do
 * `CircuitTemplate`, decrementando o estoque se `stock !== 'unlimited'`.
 * Encaixar a última peça necessária que completa (e acerta) o circuito
 * vence a fase na hora.
 */
export function placeGate(
  state: GatesState,
  slotId: NodeId,
  gate: PlayableGateType,
): { state: GatesState; event: PlaceEvent } {
  if (state.status !== 'playing' || !slotIdsOf(state.phase).includes(slotId)) {
    return { state, event: { type: 'blocked', reason: 'sem-estoque' } }
  }

  const available = state.stock === undefined || (state.stock[gate] ?? 0) > 0
  if (!available) return { state, event: { type: 'blocked', reason: 'sem-estoque' } }

  const previous = state.placed[slotId]
  let stock = state.stock
  if (stock) {
    stock = { ...stock, [gate]: (stock[gate] ?? 0) - 1 }
    if (previous) stock[previous] = (stock[previous] ?? 0) + 1
  }

  const placed = { ...state.placed, [slotId]: gate }
  const next: GatesState = { ...state, placed, stock, scoring: addPoints(state.scoring, 5) }
  const result = checkCircuit(next)
  if (result.type === 'won') {
    return {
      state: { ...next, status: 'won', scoring: registerHit(next.scoring, 100, 20) },
      event: { type: 'placed', slotId, gate },
    }
  }
  return { state: next, event: { type: 'placed', slotId, gate } }
}

/** Remove a porta de um slot preenchido; ela volta ao estoque sem custo. */
export function clearGate(state: GatesState, slotId: NodeId): GatesState {
  if (state.status !== 'playing') return state
  const gate = state.placed[slotId]
  if (!gate) return state
  const placed = { ...state.placed }
  delete placed[slotId]
  const stock = state.stock ? { ...state.stock, [gate]: (state.stock[gate] ?? 0) + 1 } : undefined
  return { ...state, placed, stock, swaps: state.swaps + 1 }
}

/** Tempo esgotado: derrota (fora do tutorial, que nunca perde). */
export function expireTime(state: GatesState): GatesState {
  if (state.status !== 'playing' || !state.phase.canLose) return state
  return { ...state, status: 'lost' }
}

/** Marca o tutorial como concluído (sem derrota possível): usado quando o
 *  jogador observou a porta NOT nos dois estados. */
export function finishTutorial(state: GatesState): GatesState {
  if (state.status !== 'playing') return state
  return { ...state, status: 'won' }
}

/**
 * Tempo da fase (±20% pela dificuldade, design doc `gates`), omitido no
 * modo sem tempo. Réplica do padrão de `games/bits/logic/model.ts`.
 */
export function resolveTime(
  phase: GatesPhase,
  { difficulty, untimed }: { difficulty: DifficultyId; untimed: boolean },
): number | undefined {
  if (untimed) return undefined
  let time = phase.secondsLimit
  if (difficulty === 'easy') time *= 1.2
  else if (difficulty === 'hard') time *= 0.8
  return Math.round(time)
}

export interface GatesOutcome {
  won: boolean
  stars: StarCount
  score: number
}

/**
 * Estrelas: réplica da fórmula por tempo restante de Núcleos/Bits (≥30% → 3,
 * ≥12% → 2, vitória → 1); no modo sem tempo, por número de peças trocadas
 * (`clearGate`) — zero trocas = 3 estrelas, 1 troca = 2, 2+ trocas = 1.
 */
export function computeOutcome(
  state: GatesState,
  o: { timeLeft: number; timeLimit: number; untimed: boolean },
): GatesOutcome {
  const won = state.status === 'won'
  let stars: StarCount = 0
  if (won) {
    if (o.untimed || o.timeLimit <= 0) {
      const value = state.swaps === 0 ? 1 : state.swaps === 1 ? 0.5 : 0
      stars = starsFor(value, [0.4, 0.9])
    } else {
      stars = starsFor(o.timeLeft / o.timeLimit, [0.12, 0.3])
    }
  }
  return { won, stars, score: state.scoring.score }
}
