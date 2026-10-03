import type { PhaseBase } from '@/engine/types'
import type { CircuitTemplate } from '@/games/shared/circuit'

/**
 * Portas que o jogador de verdade encaixa (design doc `gates`, "Contrato de
 * dados das fases"). O tipo `GateType` de `shared/circuit` é maior (inclui
 * XOR/NAND/NOR, variantes internas que a ULA usa) — ver DECISIONS.md: os dois
 * tipos foram separados, como o próprio design doc sugeria como alternativa
 * na seção "Riscos" ("PlayableGateType vs GateType interno").
 */
export type PlayableGateType = 'AND' | 'OR' | 'NOT'

export interface GatesPhase extends PhaseBase {
  /**
   * Número de entradas booleanas do circuito desta fase. O design doc
   * restringe a `2 | 3`, mas o tutorial (design doc, seção "O que cada fase
   * ensina") tem só 1 entrada — por isso o tipo aqui inclui `1`
   * (DECISIONS.md registra esta pequena divergência do contrato original).
   */
  inputCount: 1 | 2 | 3
  /** Topologia fixa de encaixes vazios que o jogador preenche (ver shared/circuit). */
  template: CircuitTemplate
  /** Portas disponíveis para encaixar. 'unlimited' nas fases 1 a 3; lista exata na fase 4. */
  stock: readonly PlayableGateType[] | 'unlimited'
  /** Função booleana-alvo, usada para gerar a tabela-verdade exibida e validar a vitória. */
  targetTruthTable: readonly boolean[]
  secondsLimit: number
}

const notTemplate: CircuitTemplate = {
  nodes: [
    { kind: 'input', id: 'A', label: 'A' },
    { kind: 'gate', id: 'notA', gate: 'NOT', inputs: ['A'] },
    { kind: 'output', id: 'out', label: 'lâmpada', input: 'notA' },
  ],
}

// Fase 1: um único encaixe de 2 entradas — o jogador decide AND ou OR.
const twoInputSlotTemplate: CircuitTemplate = {
  nodes: [
    { kind: 'input', id: 'A', label: 'A' },
    { kind: 'input', id: 'B', label: 'B' },
    { kind: 'slot', id: 's1', inputs: ['A', 'B'] },
    { kind: 'output', id: 'out', label: 'lâmpada', input: 's1' },
  ],
}

// Fase 2: NAND montado como AND seguido de NOT (dois encaixes em série).
const nandTemplate: CircuitTemplate = {
  nodes: [
    { kind: 'input', id: 'A', label: 'A' },
    { kind: 'input', id: 'B', label: 'B' },
    { kind: 'slot', id: 's1', inputs: ['A', 'B'] },
    { kind: 'slot', id: 's2', inputs: ['s1'] },
    { kind: 'output', id: 'out', label: 'lâmpada', input: 's2' },
  ],
}

// Fase 3: XOR montado como "(A OR B) AND NOT(A AND B)", 4 encaixes.
const xorTemplate: CircuitTemplate = {
  nodes: [
    { kind: 'input', id: 'A', label: 'A' },
    { kind: 'input', id: 'B', label: 'B' },
    { kind: 'slot', id: 'sOr', inputs: ['A', 'B'] },
    { kind: 'slot', id: 'sAnd', inputs: ['A', 'B'] },
    { kind: 'slot', id: 'sNot', inputs: ['sAnd'] },
    { kind: 'slot', id: 'sFinal', inputs: ['sOr', 'sNot'] },
    { kind: 'output', id: 'out', label: 'lâmpada', input: 'sFinal' },
  ],
}

// Fase 4: 3 entradas, estoque exato (1 AND, 1 OR, 1 NOT) para
// "(A AND B) OR NOT(C)". sG1 e sFinal têm os dois 2 entradas (ambíguos:
// decidir qual leva AND e qual leva OR); sG2 tem 1 entrada (só NOT serve).
const stockTemplate: CircuitTemplate = {
  nodes: [
    { kind: 'input', id: 'A', label: 'A' },
    { kind: 'input', id: 'B', label: 'B' },
    { kind: 'input', id: 'C', label: 'C' },
    { kind: 'slot', id: 'sG1', inputs: ['A', 'B'] },
    { kind: 'slot', id: 'sG2', inputs: ['C'] },
    { kind: 'slot', id: 'sFinal', inputs: ['sG1', 'sG2'] },
    { kind: 'output', id: 'out', label: 'lâmpada', input: 'sFinal' },
  ],
}

export const PHASES: readonly GatesPhase[] = [
  {
    id: 'tutorial',
    kind: 'tutorial',
    canLose: false,
    inputCount: 1,
    template: notTemplate,
    stock: 'unlimited',
    // NOT(0) = 1, NOT(1) = 0.
    targetTruthTable: [true, false],
    secondsLimit: 0,
  },
  {
    id: 'nivel-1',
    kind: 'level',
    canLose: true,
    inputCount: 2,
    template: twoInputSlotTemplate,
    stock: 'unlimited',
    // AND(A,B): 00=0, 01=0, 10=0, 11=1.
    targetTruthTable: [false, false, false, true],
    secondsLimit: 40,
    unlocksCard: 'porta-logica',
  },
  {
    id: 'nivel-2',
    kind: 'level',
    canLose: true,
    inputCount: 2,
    template: nandTemplate,
    stock: 'unlimited',
    // NAND(A,B): inverso do AND.
    targetTruthTable: [true, true, true, false],
    secondsLimit: 50,
  },
  {
    id: 'nivel-3',
    kind: 'level',
    canLose: true,
    inputCount: 2,
    template: xorTemplate,
    stock: 'unlimited',
    // XOR(A,B): 00=0, 01=1, 10=1, 11=0.
    targetTruthTable: [false, true, true, false],
    secondsLimit: 70,
    unlocksCard: 'tabela-verdade',
  },
  {
    id: 'nivel-4',
    kind: 'level',
    canLose: true,
    inputCount: 3,
    template: stockTemplate,
    stock: ['AND', 'OR', 'NOT'],
    // (A AND B) OR NOT(C), para A,B,C de 000 a 111.
    targetTruthTable: [true, false, true, false, true, false, true, true],
    secondsLimit: 90,
  },
] as const
