/**
 * Módulo compartilhado de binário (criado pela estação Bits, design doc
 * `docs/design/bits.md`). Memória (endereços) e ULA (operandos) importam
 * daqui; não editam. Qualquer campo novo necessário é um pedido para a onda
 * seguinte, não uma edição direta por outro agente.
 */
export { toBits, fromBits, placeValue, formatBinary, hammingDistance, popCount } from './convert'
export { BitSwitch, type BitSwitchProps } from './BitSwitch'
export { BitRow, type BitRowProps } from './BitRow'
