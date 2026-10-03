/**
 * Módulo compartilhado de circuitos lógicos (criado pela estação Portas
 * lógicas, design doc `docs/design/gates.md`). A ULA importa daqui; não
 * edita. Qualquer mudança de assinatura é um pedido para a onda seguinte
 * (`docs/PLANEJAMENTO.md`, seção 2.2).
 */
export type {
  Circuit,
  CircuitNode,
  CircuitTemplate,
  GateNode,
  GateType,
  InputNode,
  NodeId,
  OutputNode,
  SlotNode,
} from './types'
export { evaluateCircuit, evaluateGate, truthTable, validateCircuit } from './evaluate'
export { CircuitSlot, type CircuitSlotProps } from './CircuitSlot'
export { GatePiece, type GatePieceProps } from './GatePiece'
