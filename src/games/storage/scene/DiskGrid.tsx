import type { CSSProperties } from 'react'
import { Icon } from '@/ui/icons'

/**
 * Grade de blocos de disco de `StorageScene`, extraída como apresentação
 * pura (ver `docs/design/clique-ao-pixel.md`, "Pedidos à base" (4)). O
 * estado de cada bloco é calculado por quem chama (hoje, `StorageScene`;
 * a versão mini de `pixel` pode montar `blocks` com uma lista fixa de 3
 * números, sem simular fragmentação/HD×SSD).
 */
export type DiskBlockState = 'system' | 'free' | 'selected' | 'highlighted' | 'occupied'

export interface DiskBlockView {
  index: number
  state: DiskBlockState
  /** Rótulo de acessibilidade já formatado pelo chamador. */
  label: string
  /** Texto "continua no bloco N" quando o bloco é o último de um pedaço fragmentado. */
  linkLabel?: string
}

export interface DiskGridProps {
  blocks: readonly DiskBlockView[]
  columns: number
  disabled?: boolean
  onBlockClick?: (index: number) => void
  className?: string
}

export function DiskGrid({ blocks, columns, disabled, onBlockClick, className }: DiskGridProps) {
  return (
    <div
      className={className ?? 'storage-disk'}
      data-disk
      style={
        {
          '--storage-cols-mobile': blocks.length / columns,
          '--storage-cols-desktop': columns,
        } as CSSProperties
      }
    >
      {blocks.map((b) => (
        <button
          key={b.index}
          type="button"
          data-block={b.index}
          data-state={b.state}
          aria-label={b.label}
          aria-pressed={b.state === 'selected' || b.state === 'highlighted'}
          disabled={disabled}
          className="storage-block"
          onClick={() => onBlockClick?.(b.index)}
        >
          <span className="storage-block-n" aria-hidden="true">
            {b.index + 1}
          </span>
          {b.linkLabel && (
            <span className="storage-link" aria-hidden="true">
              <Icon name="arrow-right" className="size-3" />
              {b.linkLabel}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
