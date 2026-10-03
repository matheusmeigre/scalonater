import type { DifficultyId } from '@/engine/types'
import { createRng, nextRandom, type Rng } from '@/engine/random'
import {
  addPoints,
  emptyCombo,
  registerHit,
  starsFor,
  type ComboState,
  type StarCount,
} from '@/engine/scoring/scoring'
import { fromBits, toBits } from '@/games/shared/binary'
import {
  evaluateCircuit,
  type Circuit,
  type CircuitNode,
  type GateType,
  type NodeId,
} from '@/games/shared/circuit'
import { FULL_ADDER_TEMPLATE } from '../phases'
import type { AluOp, AluPhase } from '../phases'

/**
 * Portas que o jogador encaixa nos meios-somadores (Fases 2-3). Inclui XOR
 * (necessária para a soma do meio-somador) além das 3 básicas de `gates` —
 * aqui XOR já está "destravada" como peça pronta, ao contrário de `gates`,
 * onde o jogador precisa montá-la (design doc `alu`, "Mecânica principal":
 * "mais XOR como peça pronta aqui").
 */
export const CIRCUIT_GATE_CHOICES: readonly GateType[] = ['AND', 'OR', 'NOT', 'XOR']

// ---------------------------------------------------------------------------
// addManual (Fase 1): soma bit a bit, da direita para a esquerda.
// ---------------------------------------------------------------------------

export interface AddColumnResult {
  sum: 0 | 1
  carryOut: 0 | 1
}

export interface AddManualResult {
  /** Uma entrada por coluna (mesma ordem MSB-primeiro dos bits de entrada). */
  columns: readonly AddColumnResult[]
  /** Resultado final, mesmo `bitCount` dos operandos (overflow é descartado). */
  result: readonly (0 | 1)[]
  /** `true` quando o vai-um da coluna mais significativa não tem para onde ir. */
  overflow: boolean
}

/**
 * Soma binária coluna a coluna (design doc `alu`, "Regras puras a testar").
 * Nunca usa operadores bit a bit do JavaScript — soma aritmética normal,
 * bit a bit, com o vai-um propagando da direita (menos significativo) para
 * a esquerda.
 */
export function addManual(
  aBits: readonly (0 | 1)[],
  bBits: readonly (0 | 1)[],
): AddManualResult {
  const n = aBits.length
  const columns: AddColumnResult[] = new Array(n)
  const result: (0 | 1)[] = new Array(n)
  let carry: 0 | 1 = 0
  for (let i = n - 1; i >= 0; i--) {
    const total = aBits[i]! + bBits[i]! + carry
    const sum = (total % 2) as 0 | 1
    const carryOut = (total >= 2 ? 1 : 0) as 0 | 1
    columns[i] = { sum, carryOut }
    result[i] = sum
    carry = carryOut
  }
  return { columns, result, overflow: carry === 1 }
}

/** Confere só a coluna `columnIndex` do gabarito contra o que o jogador digitou. */
export function checkColumn(
  gabarito: AddManualResult,
  columnIndex: number,
  sum: 0 | 1,
): boolean {
  return gabarito.columns[columnIndex]?.sum === sum
}

// ---------------------------------------------------------------------------
// Fase 1 — soma manual de 4 bits.
// ---------------------------------------------------------------------------

export interface ManualState {
  phase: AluPhase
  rng: Rng
  a: readonly (0 | 1)[]
  b: readonly (0 | 1)[]
  gabarito: AddManualResult
  /** O que o jogador já marcou em cada casa do resultado (mesmo bitCount). */
  answer: readonly (0 | 1)[]
  solved: number
  scoring: ComboState
  status: 'playing' | 'won' | 'lost'
}

/** Sorteia um par de operandos de `bitCount` bits cuja soma não dá overflow. */
function drawPair(bitCount: number, rng: Rng): { a: number; b: number; rng: Rng } {
  const max = 2 ** bitCount - 1
  const [v1, r1] = nextRandom(rng)
  const a = Math.floor(v1 * (max + 1))
  let b = 0
  let r = r1
  // Garante a + b <= max (sem overflow de bitCount bits) — design doc `alu`,
  // "Riscos": overflow de 4 bits é evitado nos desafios sorteados.
  do {
    const [v2, r2] = nextRandom(r)
    b = Math.floor(v2 * (max + 1))
    r = r2
  } while (a + b > max)
  return { a, b, rng: r }
}

export function createManualGame(phase: AluPhase, seed: number): ManualState {
  const bitCount = phase.bitCount
  const rng = createRng(seed)
  let a: number, b: number, nextRng: Rng
  if (phase.fixedPairs && phase.fixedPairs.length > 0) {
    const first = phase.fixedPairs[0]!
    a = first.a
    b = first.b
    nextRng = rng
  } else {
    const drawn = drawPair(bitCount, rng)
    a = drawn.a
    b = drawn.b
    nextRng = drawn.rng
  }
  const aBits = toBits(a, bitCount)
  const bBits = toBits(b, bitCount)
  return {
    phase,
    rng: nextRng,
    a: aBits,
    b: bBits,
    gabarito: addManual(aBits, bBits),
    answer: new Array(bitCount).fill(0) as (0 | 1)[],
    solved: 0,
    scoring: emptyCombo(),
    status: 'playing',
  }
}

/** Jogador toca numa casa do resultado para alternar 0/1. */
export function setAnswerBit(state: ManualState, index: number, value: 0 | 1): ManualState {
  if (state.status !== 'playing') return state
  if (index < 0 || index >= state.answer.length) return state
  const answer = state.answer.slice()
  answer[index] = value
  return { ...state, answer }
}

function nextPair(state: ManualState): { a: number; b: number; rng: Rng } {
  const bitCount = state.phase.bitCount
  const fixed = state.phase.fixedPairs
  if (fixed && state.solved + 1 < fixed.length) {
    const next = fixed[state.solved + 1]!
    return { a: next.a, b: next.b, rng: state.rng }
  }
  return drawPair(bitCount, state.rng)
}

export type ConfirmEvent = { type: 'correct' } | { type: 'wrong' }

/**
 * Confere a resposta inteira contra o gabarito. Acertando, soma pontos e
 * sorteia (ou avança para) a próxima conta; a fase termina quando
 * `targetCount` contas são resolvidas. Errando, não há penalidade além de
 * quebrar o combo — o jogador pode ajustar e confirmar de novo.
 */
export function confirmManualAnswer(state: ManualState): { state: ManualState; event: ConfirmEvent } {
  if (state.status !== 'playing') return { state, event: { type: 'wrong' } }
  const correct = state.answer.every((bit, i) => bit === state.gabarito.result[i])
  if (!correct) {
    return { state: { ...state, scoring: addPoints(state.scoring, 0) }, event: { type: 'wrong' } }
  }
  const solved = state.solved + 1
  const target = state.phase.targetCount ?? 1
  const scoring = registerHit(state.scoring, 40, 10)
  if (solved >= target) {
    return { state: { ...state, solved, scoring, status: 'won' }, event: { type: 'correct' } }
  }
  const { a, b, rng } = nextPair(state)
  const bitCount = state.phase.bitCount
  const aBits = toBits(a, bitCount)
  const bBits = toBits(b, bitCount)
  return {
    state: {
      ...state,
      solved,
      scoring,
      rng,
      a: aBits,
      b: bBits,
      gabarito: addManual(aBits, bBits),
      answer: new Array(bitCount).fill(0) as (0 | 1)[],
    },
    event: { type: 'correct' },
  }
}

// ---------------------------------------------------------------------------
// Fases 2-3 — montar o meio-somador / somador completo via shared/circuit.
// ---------------------------------------------------------------------------

export interface CircuitPhaseState {
  phase: AluPhase
  /** Valores atuais dos interruptores de entrada (exploração livre). */
  inputs: Record<NodeId, boolean>
  /** Porta encaixada em cada slot do template (id do slot → porta). */
  placed: Record<NodeId, GateType>
  swaps: number
  scoring: ComboState
  status: 'playing' | 'won' | 'lost'
}

function templateOf(phase: AluPhase) {
  if (!phase.template) throw new Error(`fase "${phase.id}" não tem template de circuito`)
  return phase.template
}

function inputIdsOf(phase: AluPhase): NodeId[] {
  return templateOf(phase).nodes.filter((n) => n.kind === 'input').map((n) => n.id)
}

function slotIdsOf(phase: AluPhase): NodeId[] {
  return templateOf(phase).nodes.filter((n) => n.kind === 'slot').map((n) => n.id)
}

function outputIdsOf(phase: AluPhase): NodeId[] {
  return templateOf(phase).nodes.filter((n) => n.kind === 'output').map((n) => n.id)
}

export function createCircuitGame(phase: AluPhase): CircuitPhaseState {
  const inputs: Record<NodeId, boolean> = {}
  for (const id of inputIdsOf(phase)) inputs[id] = false
  return { phase, inputs, placed: {}, swaps: 0, scoring: emptyCombo(), status: 'playing' }
}

export function toggleCircuitInput(state: CircuitPhaseState, inputId: NodeId): CircuitPhaseState {
  if (state.status !== 'playing') return state
  if (!(inputId in state.inputs)) return state
  return { ...state, inputs: { ...state.inputs, [inputId]: !state.inputs[inputId] } }
}

/** Monta o `Circuit` completo substituindo cada `SlotNode` pela porta encaixada. */
function buildCircuit(state: CircuitPhaseState): Circuit {
  return templateOf(state.phase).nodes.map((node): CircuitNode => {
    if (node.kind !== 'slot') return node
    const gate = state.placed[node.id]
    // Enquanto o slot não tem porta, usa AND como substituto neutro só para
    // o circuito ficar bem formado (checkCircuitPhase nunca confia nisso
    // antes de todos os slots estarem preenchidos — ver 'incomplete' abaixo).
    return { kind: 'gate', id: node.id, gate: gate ?? 'AND', inputs: node.inputs }
  })
}

export type CheckResult =
  | { type: 'won' }
  | { type: 'incomplete' }
  | { type: 'mismatch'; failingRows: readonly number[] }

/**
 * Monta o circuito a partir do template + portas encaixadas, avalia todas as
 * combinações de entrada e compara as saídas com `phase.targetTruthTable`
 * linha a linha (mesma convenção de ordem de `truthTable`: entradas em
 * ordem binária crescente). Réplica do `checkCircuit` de `gates`, generalizada
 * para múltiplas saídas.
 */
export function checkCircuitPhase(state: CircuitPhaseState): CheckResult {
  const slotIds = slotIdsOf(state.phase)
  if (slotIds.some((id) => state.placed[id] === undefined)) return { type: 'incomplete' }

  const circuit = buildCircuit(state)
  const inputIds = inputIdsOf(state.phase)
  const outputIds = outputIdsOf(state.phase)
  const target = state.phase.targetTruthTable ?? []
  const n = inputIds.length
  const failingRows: number[] = []
  for (let combo = 0; combo < 2 ** n; combo++) {
    const inputValues: Record<NodeId, boolean> = {}
    inputIds.forEach((id, i) => {
      inputValues[id] = ((combo >> (n - 1 - i)) & 1) === 1
    })
    const values = evaluateCircuit(circuit, inputValues)
    const expected = target[combo] ?? []
    const ok = outputIds.every((id, i) => values[id] === expected[i])
    if (!ok) failingRows.push(combo)
  }
  return failingRows.length === 0 ? { type: 'won' } : { type: 'mismatch', failingRows }
}

export type PlaceEvent = { type: 'placed'; slotId: NodeId; gate: GateType }

export function placeCircuitGate(
  state: CircuitPhaseState,
  slotId: NodeId,
  gate: GateType,
): { state: CircuitPhaseState; event: PlaceEvent } {
  if (state.status !== 'playing' || !slotIdsOf(state.phase).includes(slotId)) {
    return { state, event: { type: 'placed', slotId, gate } }
  }
  const placed = { ...state.placed, [slotId]: gate }
  const next: CircuitPhaseState = { ...state, placed, scoring: addPoints(state.scoring, 5) }
  const result = checkCircuitPhase(next)
  if (result.type === 'won') {
    return {
      state: { ...next, status: 'won', scoring: registerHit(next.scoring, 100, 20) },
      event: { type: 'placed', slotId, gate },
    }
  }
  return { state: next, event: { type: 'placed', slotId, gate } }
}

export function clearCircuitGate(state: CircuitPhaseState, slotId: NodeId): CircuitPhaseState {
  if (state.status !== 'playing') return state
  if (!(slotId in state.placed)) return state
  const placed = { ...state.placed }
  delete placed[slotId]
  return { ...state, placed, swaps: state.swaps + 1 }
}

/**
 * Circuito completo do somador completo (Fase 3), com o encaixe final já
 * resolvido como OR — usado para a demonstração visual da cadeia de 4 bits
 * (não depende do que o jogador encaixou durante o quebra-cabeça) e para os
 * testes de consistência contra `addManual`.
 */
export function fullAdderCircuit(): Circuit {
  return FULL_ADDER_TEMPLATE.nodes.map((node): CircuitNode =>
    node.kind === 'slot' ? { kind: 'gate', id: node.id, gate: 'OR', inputs: node.inputs } : node,
  )
}

/**
 * Encadeia 4 avaliações do somador completo (uma por posição de bit, da
 * menos significativa para a mais significativa), alimentando o `carryOut`
 * de uma posição como `carryIn` da próxima — design doc `alu`, "Reuso de
 * shared/circuit": "não precisa de um Circuit de 4 bits unificado".
 */
export function evaluateFullAdderChain(
  aBits: readonly (0 | 1)[],
  bBits: readonly (0 | 1)[],
): { sumBits: (0 | 1)[]; carryOut: 0 | 1 } {
  const circuit = fullAdderCircuit()
  const n = aBits.length
  const sumBits: (0 | 1)[] = new Array(n)
  let carry = false
  for (let i = n - 1; i >= 0; i--) {
    const values = evaluateCircuit(circuit, {
      a: aBits[i] === 1,
      b: bBits[i] === 1,
      carryIn: carry,
    })
    sumBits[i] = values.sum ? 1 : 0
    carry = values.carryOut === true
  }
  return { sumBits, carryOut: carry ? 1 : 0 }
}

// ---------------------------------------------------------------------------
// Fase 4 — seletor de operação (soma/AND/OR), calculado direto com shared/binary.
// ---------------------------------------------------------------------------

export interface AluSelectState {
  phase: AluPhase
  challengeIndex: number
  selectedOp: AluOp | null
  solved: number
  scoring: ComboState
  status: 'playing' | 'won' | 'lost'
}

export function createAluSelectGame(phase: AluPhase): AluSelectState {
  return {
    phase,
    challengeIndex: 0,
    selectedOp: null,
    solved: 0,
    scoring: emptyCombo(),
    status: 'playing',
  }
}

export interface AluOpResult {
  result: readonly (0 | 1)[]
  event: { type: 'answered'; correct: boolean }
}

/**
 * Calcula a operação da ULA direto com `shared/binary` (design doc `alu`,
 * "Reuso de shared/circuit e shared/binary": a Fase 4 é deliberadamente fora
 * do padrão de circuito). `correct` compara `op` com o esperado, quando informado.
 */
export function computeAluOp(
  a: number,
  b: number,
  op: AluOp,
  bitCount: number,
  expectedOp?: AluOp,
): AluOpResult {
  const aBits = toBits(a, bitCount)
  const bBits = toBits(b, bitCount)
  let result: readonly (0 | 1)[]
  if (op === 'add') {
    result = addManual(aBits, bBits).result
  } else if (op === 'and') {
    result = aBits.map((bit, i) => ((bit === 1 && bBits[i] === 1 ? 1 : 0) as 0 | 1))
  } else {
    result = aBits.map((bit, i) => ((bit === 1 || bBits[i] === 1 ? 1 : 0) as 0 | 1))
  }
  return { result, event: { type: 'answered', correct: expectedOp === undefined || op === expectedOp } }
}

export function selectAluOp(state: AluSelectState, op: AluOp): AluSelectState {
  if (state.status !== 'playing') return state
  return { ...state, selectedOp: op }
}

export type ChallengeEvent = { type: 'correct' } | { type: 'wrong' }

/** Confirma a operação selecionada contra o desafio atual. */
export function confirmChallenge(state: AluSelectState): { state: AluSelectState; event: ChallengeEvent } {
  if (state.status !== 'playing' || state.selectedOp === null) {
    return { state, event: { type: 'wrong' } }
  }
  const challenges = state.phase.challenges ?? []
  const challenge = challenges[state.challengeIndex]
  if (!challenge || challenge.op !== state.selectedOp) {
    return { state: { ...state, scoring: addPoints(state.scoring, 0) }, event: { type: 'wrong' } }
  }
  const solved = state.solved + 1
  const scoring = registerHit(state.scoring, 40, 10)
  const challengeIndex = state.challengeIndex + 1
  const won = solved >= challenges.length
  return {
    state: {
      ...state,
      solved,
      scoring,
      challengeIndex,
      selectedOp: null,
      status: won ? 'won' : 'playing',
    },
    event: { type: 'correct' },
  }
}

// ---------------------------------------------------------------------------
// Compartilhado entre modos: tempo, derrota, dificuldade, estrelas.
// ---------------------------------------------------------------------------

/** Tempo da fase (±20% pela dificuldade), omitido no modo sem tempo —
 *  réplica do padrão de `games/gates/logic/rules.ts`. */
export function resolveTime(
  phase: AluPhase,
  { difficulty, untimed }: { difficulty: DifficultyId; untimed: boolean },
): number | undefined {
  if (untimed) return undefined
  let time = phase.secondsLimit
  if (difficulty === 'easy') time *= 1.2
  else if (difficulty === 'hard') time *= 0.8
  return Math.round(time)
}

export interface AluOutcome {
  won: boolean
  stars: StarCount
  score: number
}

/** Estrelas por tempo restante (réplica do padrão de `gates`/Núcleos). */
export function computeOutcome(
  status: 'playing' | 'won' | 'lost',
  scoring: ComboState,
  o: { timeLeft: number; timeLimit: number; untimed: boolean; swaps: number },
): AluOutcome {
  const won = status === 'won'
  let stars: StarCount = 0
  if (won) {
    if (o.untimed || o.timeLimit <= 0) {
      const value = o.swaps === 0 ? 1 : o.swaps === 1 ? 0.5 : 0
      stars = starsFor(value, [0.4, 0.9])
    } else {
      stars = starsFor(o.timeLeft / o.timeLimit, [0.12, 0.3])
    }
  }
  return { won, stars, score: scoring.score }
}

/** Avalia o desempenho do jogador ao tempo esgotar (fora do tutorial). */
export function expireManual(state: ManualState): ManualState {
  if (state.status !== 'playing' || !state.phase.canLose) return state
  return { ...state, status: 'lost' }
}

export function expireCircuit(state: CircuitPhaseState): CircuitPhaseState {
  if (state.status !== 'playing' || !state.phase.canLose) return state
  return { ...state, status: 'lost' }
}

export function expireAluSelect(state: AluSelectState): AluSelectState {
  if (state.status !== 'playing' || !state.phase.canLose) return state
  return { ...state, status: 'lost' }
}

export { fromBits }
