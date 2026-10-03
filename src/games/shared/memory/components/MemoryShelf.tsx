import type { CSSProperties, ReactNode } from 'react'
import type { MemoryCell } from '../model'
import { Drawer } from './Drawer'

export interface MemoryShelfProps {
  cells: readonly MemoryCell[]
  /** Colunas no layout atual (o chamador decide compact/roomy). */
  columns: number
  addressFormat: 'decimal' | 'binary'
  /** Gaveta destacada (seleção atual do jogador ou do PC, no Ciclo). */
  highlightAddress?: number | null
  /** Gaveta que acabou de ser lida/escrita: dispara a animação do `Drawer`. */
  pulse?: { address: number; kind: 'read' | 'write' } | null
  /** Toque direto numa gaveta (ler, ou soltar um valor já selecionado). */
  onSelect?: (address: number) => void
  /** Rótulo de acessibilidade por gaveta; o padrão é "Gaveta {endereço}". */
  labelFor?: (cell: MemoryCell) => string
  /** Formata o conteúdo mostrado. Usado pelo Ciclo para mostrar o mnemônico
   * da instrução em vez do número puro. */
  renderValue?: (value: number | null) => ReactNode
}

/** A estante inteira: uma grade de `Drawer`s com `columns` colunas. */
export function MemoryShelf({
  cells,
  columns,
  addressFormat,
  highlightAddress = null,
  pulse = null,
  onSelect,
  labelFor,
  renderValue,
}: MemoryShelfProps) {
  return (
    <div
      className="memory-shelf"
      role="group"
      aria-label="Estante de memória"
      style={{ '--memory-columns': columns } as CSSProperties}
    >
      {cells.map((cell) => (
        <Drawer
          key={cell.address}
          cell={cell}
          addressFormat={addressFormat}
          highlighted={highlightAddress === cell.address}
          pulse={pulse && pulse.address === cell.address ? pulse.kind : null}
          onSelect={onSelect ? () => onSelect(cell.address) : undefined}
          label={labelFor?.(cell)}
          renderValue={renderValue}
        />
      ))}
    </div>
  )
}
