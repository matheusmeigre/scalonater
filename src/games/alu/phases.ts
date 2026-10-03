import type { PhaseBase } from '@/engine/types'
import type { CircuitTemplate } from '@/games/shared/circuit'

/**
 * Contrato de dados das fases (design doc `docs/design/alu.md`, "Contrato de
 * dados das fases"). `targetTruthTable` generaliza o contrato original
 * (`readonly boolean[]`) para `readonly (readonly boolean[])[]`: o
 * meio-somador e o somador completo têm 2 saídas (soma, vai-um), não 1 como
 * em `gates` — cada linha guarda os valores esperados das saídas, na ordem
 * em que elas aparecem no `template`, alinhada com a ordem de `truthTable`
 * de `shared/circuit` (entradas em ordem binária crescente). Ver
 * DECISIONS.md.
 */
export type AluMode = 'manual' | 'half-adder' | 'full-adder' | 'alu-select'
export type AluOp = 'add' | 'and' | 'or'

export interface AluPhase extends PhaseBase {
  mode: AluMode
  /** Número de bits dos operandos (1 no tutorial, 4 nas demais fases). */
  bitCount: number
  /** Só para mode 'manual': quantas somas o jogador precisa resolver. */
  targetCount?: number
  /**
   * Pares fixos (não sorteados) para o tutorial, nesta ordem — extensão
   * própria desta estação (o design doc não cobre "tutorial guiado sem
   * sorteio" no contrato, só descreve as duas contas guiadas no texto).
   */
  fixedPairs?: readonly { a: number; b: number }[]
  /** Só para mode 'half-adder' | 'full-adder': a topologia com os slots vazios. */
  template?: CircuitTemplate
  /** Ver comentário do tipo acima. */
  targetTruthTable?: readonly (readonly boolean[])[]
  /** Só para mode 'alu-select': operações que o seletor precisa resolver, nesta ordem. */
  challenges?: readonly { a: number; b: number; op: AluOp }[]
  secondsLimit: number
}

/**
 * Meio-somador (Fase 2): 2 entradas (A, B), 2 encaixes vazios (soma = XOR,
 * vai-um = AND) que o jogador preenche — exatamente como o design doc
 * especifica em "Reuso de shared/circuit".
 */
export const HALF_ADDER_TEMPLATE: CircuitTemplate = {
  nodes: [
    { kind: 'input', id: 'a', label: 'A' },
    { kind: 'input', id: 'b', label: 'B' },
    { kind: 'slot', id: 'xorNode', inputs: ['a', 'b'] },
    { kind: 'slot', id: 'andNode', inputs: ['a', 'b'] },
    { kind: 'output', id: 'sum', label: 'soma', input: 'xorNode' },
    { kind: 'output', id: 'carryOut', label: 'vai-um', input: 'andNode' },
  ],
}

// soma = A XOR B; vai-um = A AND B, para A,B de 00 a 11 (ordem binária
// crescente, igual a `truthTable`).
export const HALF_ADDER_TRUTH: readonly (readonly boolean[])[] = [
  [false, false],
  [true, false],
  [true, false],
  [false, true],
]

/**
 * Somador completo (Fase 3): os dois meios-somadores encadeados já vêm
 * prontos (design doc: "peça 'meio-somador' já pronta, reaproveitada da fase
 * 2") — só o encaixe final (OR, para combinar os dois vai-uns) fica vazio
 * para o jogador montar. `ha1_*` é o primeiro meio-somador (A, B); `ha2_*` é
 * o segundo, recebendo a soma do primeiro e o vai-um de entrada.
 */
export const FULL_ADDER_TEMPLATE: CircuitTemplate = {
  nodes: [
    { kind: 'input', id: 'a', label: 'A' },
    { kind: 'input', id: 'b', label: 'B' },
    { kind: 'input', id: 'carryIn', label: 'vai-um de entrada' },
    { kind: 'gate', id: 'ha1_xor', gate: 'XOR', inputs: ['a', 'b'] },
    { kind: 'gate', id: 'ha1_and', gate: 'AND', inputs: ['a', 'b'] },
    { kind: 'gate', id: 'ha2_xor', gate: 'XOR', inputs: ['ha1_xor', 'carryIn'] },
    { kind: 'gate', id: 'ha2_and', gate: 'AND', inputs: ['ha1_xor', 'carryIn'] },
    { kind: 'slot', id: 'orNode', inputs: ['ha1_and', 'ha2_and'] },
    { kind: 'output', id: 'sum', label: 'soma', input: 'ha2_xor' },
    { kind: 'output', id: 'carryOut', label: 'vai-um de saída', input: 'orNode' },
  ],
}

// soma, vai-um-de-saída para A,B,vai-um-de-entrada de 000 a 111.
export const FULL_ADDER_TRUTH: readonly (readonly boolean[])[] = [
  [false, false],
  [true, false],
  [true, false],
  [false, true],
  [true, false],
  [false, true],
  [false, true],
  [true, true],
]

export const PHASES: readonly AluPhase[] = [
  {
    id: 'tutorial',
    kind: 'tutorial',
    canLose: false,
    mode: 'manual',
    // 2 bits (não 1): a segunda conta guiada (1+1) precisa de duas casas
    // para mostrar "10" sem descartar o vai-um como overflow.
    bitCount: 2,
    targetCount: 2,
    fixedPairs: [
      { a: 0, b: 1 },
      { a: 1, b: 1 },
    ],
    secondsLimit: 0,
  },
  {
    id: 'nivel-1',
    kind: 'level',
    canLose: true,
    mode: 'manual',
    bitCount: 4,
    targetCount: 5,
    secondsLimit: 60,
    unlocksCard: 'vai-um',
  },
  {
    id: 'nivel-2',
    kind: 'level',
    canLose: true,
    mode: 'half-adder',
    bitCount: 4,
    template: HALF_ADDER_TEMPLATE,
    targetTruthTable: HALF_ADDER_TRUTH,
    secondsLimit: 60,
    unlocksCard: 'ula',
  },
  {
    id: 'nivel-3',
    kind: 'level',
    canLose: true,
    mode: 'full-adder',
    bitCount: 4,
    template: FULL_ADDER_TEMPLATE,
    targetTruthTable: FULL_ADDER_TRUTH,
    secondsLimit: 70,
  },
  {
    id: 'nivel-4',
    kind: 'level',
    canLose: true,
    mode: 'alu-select',
    bitCount: 4,
    challenges: [
      { a: 5, b: 3, op: 'add' },
      { a: 10, b: 6, op: 'and' },
      { a: 9, b: 4, op: 'or' },
      { a: 7, b: 8, op: 'add' },
      { a: 12, b: 10, op: 'and' },
    ],
    secondsLimit: 80,
  },
] as const
