/**
 * Lógica pura da "estante de gavetas" (RAM): endereço × conteúdo, sem nada de
 * React. Criado pela estação Memória (`docs/design/memory.md`); Ciclo da CPU
 * e Cache só importam — ver "O que o Ciclo e o Cache podem (e não podem)
 * fazer" no design doc. Mudar esta API depois do merge exige pedido formal.
 */

export interface MemoryCell {
  address: number
  /** `null` = gaveta vazia. */
  value: number | null
}

export interface MemoryState {
  size: number
  cells: readonly MemoryCell[]
}

export type MemoryEvent =
  | { type: 'read'; address: number; value: number | null }
  | { type: 'write'; address: number; value: number; overwritten: number | null }
  | { type: 'erase-all' }

/** Estante nova, com `size` gavetas, todas vazias. */
export function createMemory(size: number): MemoryState {
  const cells: MemoryCell[] = []
  for (let address = 0; address < size; address++) cells.push({ address, value: null })
  return { size, cells }
}

export function isValidAddress(state: MemoryState, address: number): boolean {
  return Number.isInteger(address) && address >= 0 && address < state.size
}

/**
 * Lê uma gaveta. Endereço inválido nunca lança erro: devolve o estado
 * inalterado e um evento com `value: null` — quem chama decide se isso é
 * derrota.
 */
export function readMemory(
  state: MemoryState,
  address: number,
): { state: MemoryState; event: MemoryEvent } {
  if (!isValidAddress(state, address)) {
    return { state, event: { type: 'read', address, value: null } }
  }
  const value = state.cells[address]!.value
  return { state, event: { type: 'read', address, value } }
}

/**
 * Escreve numa gaveta. Endereço inválido nunca lança erro: devolve o estado
 * inalterado e `overwritten: null`. Numa gaveta já ocupada, `overwritten`
 * traz o valor antigo (perdido).
 */
export function writeMemory(
  state: MemoryState,
  address: number,
  value: number,
): { state: MemoryState; event: MemoryEvent } {
  if (!isValidAddress(state, address)) {
    return { state, event: { type: 'write', address, value, overwritten: null } }
  }
  const overwritten = state.cells[address]!.value
  const cells = state.cells.map((cell) => (cell.address === address ? { address, value } : cell))
  return { state: { ...state, cells }, event: { type: 'write', address, value, overwritten } }
}

/**
 * Fase 4 (queda de energia) e qualquer estação que precise "zerar" a RAM
 * (ex.: recomeço). Zera todas as células e preserva `size`.
 */
export function eraseAll(state: MemoryState): { state: MemoryState; event: MemoryEvent } {
  const cells = state.cells.map((cell) => ({ address: cell.address, value: null }))
  return { state: { ...state, cells }, event: { type: 'erase-all' } }
}
