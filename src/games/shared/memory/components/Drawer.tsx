import type { ReactNode } from 'react'
import { cx } from '@/ui/format'
import type { MemoryCell } from '../model'

/** `000`, `001`, … — ao menos 3 bits, crescendo se o endereço precisar de mais. */
function toBinary(address: number): string {
  const bits = Math.max(3, address.toString(2).length)
  return address.toString(2).padStart(bits, '0')
}

function formatAddress(address: number, format: 'decimal' | 'binary'): string {
  return format === 'binary' ? toBinary(address) : String(address)
}

export interface DrawerProps {
  cell: MemoryCell
  addressFormat: 'decimal' | 'binary'
  /** Gaveta destacada (seleção atual do jogador ou do PC, no Ciclo). */
  highlighted?: boolean
  /** Dispara a animação (~400ms) de leitura/escrita; o chamador limpa depois. */
  pulse?: 'read' | 'write' | null
  onSelect?: () => void
  /** Rótulo de acessibilidade; o padrão é "Gaveta {endereço}". */
  label?: string
  /** Formata o conteúdo mostrado (o padrão mostra o número ou "vazia"). */
  renderValue?: (value: number | null) => ReactNode
}

/**
 * Uma gaveta da estante: `<button>` (toque e teclado funcionam sem nada
 * extra). O endereço (pequeno, fixo) e o conteúdo (grande, muda) usam
 * estilos bem distintos — o cerne didático desta estação (endereço ×
 * conteúdo nunca se confundem, nem para leitor de tela).
 */
export function Drawer({
  cell,
  addressFormat,
  highlighted = false,
  pulse = null,
  onSelect,
  label,
  renderValue,
}: DrawerProps) {
  const empty = cell.value === null
  const addressText = formatAddress(cell.address, addressFormat)
  const content = renderValue ? renderValue(cell.value) : empty ? 'vazia' : String(cell.value)
  const defaultLabel = `Gaveta ${cell.address}, ${empty ? 'vazia' : `conteúdo ${cell.value}`}`

  return (
    <button
      type="button"
      className="memory-drawer"
      data-address={cell.address}
      data-empty={empty}
      data-highlighted={highlighted}
      data-pulse={pulse ?? undefined}
      aria-pressed={highlighted}
      aria-label={label ?? defaultLabel}
      onClick={onSelect}
    >
      <span className="memory-drawer-address" aria-hidden="true">
        {addressText}
      </span>
      <span className={cx('memory-drawer-value', empty && 'is-empty')} aria-hidden="true">
        {content}
      </span>
    </button>
  )
}
