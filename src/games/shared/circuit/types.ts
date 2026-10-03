/**
 * Módulo compartilhado de circuitos lógicos (criado pela estação Portas
 * lógicas, design doc `docs/design/gates.md`). A ULA (`alu`) reusa este
 * módulo inteiro para montar o meio-somador e o somador completo; a
 * interface aqui é o contrato que a ULA pode assumir sem olhar a
 * implementação. Não editar fora da estação `gates` (dono único,
 * `docs/PLANEJAMENTO.md`, seção 2.2) — mudanças de assinatura virariam
 * pedido formal para a próxima onda.
 */

/**
 * Tipo de porta. XOR/NAND/NOR são variantes derivadas (calculadas a partir
 * de AND/OR/NOT por `evaluateGate`) que a estação `gates` nunca oferece como
 * peça jogável — ela as monta combinando AND/OR/NOT. Existem aqui porque a
 * ULA precisa montar o meio-somador (XOR + AND) sem depender de `gates`
 * "destravar" XOR como peça. Ver `docs/design/gates.md`, seção "Riscos".
 */
export type GateType = 'AND' | 'OR' | 'NOT' | 'XOR' | 'NAND' | 'NOR'

/** Um nó do circuito: uma entrada nomeada, uma porta, ou uma saída nomeada. */
export type NodeId = string

export interface InputNode {
  kind: 'input'
  id: NodeId
  /** Nome exibido, ex. "A", "B", "vai-um". */
  label: string
}

export interface GateNode {
  kind: 'gate'
  id: NodeId
  gate: GateType
  /** Nós de origem, na ordem dos operandos da porta (NOT usa só 1). */
  inputs: readonly NodeId[]
}

export interface OutputNode {
  kind: 'output'
  id: NodeId
  label: string
  /** Nó de origem que alimenta esta saída. */
  input: NodeId
}

export type CircuitNode = InputNode | GateNode | OutputNode

/**
 * Um circuito é uma lista de nós. Deve ser acíclico: todo GateNode/OutputNode
 * só pode referenciar NodeIds já declarados antes dele na lista (ordem
 * topológica garantida por construção, não verificada em runtime por
 * desempenho — `validateCircuit` verifica, para uso em testes e nos
 * encaixes do editor).
 */
export type Circuit = readonly CircuitNode[]

/** Um nó de porta ainda incompleto num `CircuitTemplate`: a topologia (quem
 *  alimenta quem) já está fixa, só falta o jogador escolher `gate`. */
export interface SlotNode {
  kind: 'slot'
  id: NodeId
  inputs: readonly NodeId[]
}

/** Um "molde" de circuito com alguns nós de porta incompletos (porta a
 *  definir), usado pelas fases como `template`: o jogador preenche `gate`
 *  nos buracos (`SlotNode`). */
export interface CircuitTemplate {
  nodes: readonly (CircuitNode | SlotNode)[]
}
