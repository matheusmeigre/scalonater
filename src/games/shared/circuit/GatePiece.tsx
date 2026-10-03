import { DragButton } from '@/ui/dnd'
import { cx } from '@/ui/format'
import type { GateType } from './types'
import './circuit.css'

export interface GatePieceProps {
  /** Id único da peça (DOM/dnd-kit). */
  id: string
  gate: GateType
  /** Quantas sobram no estoque; omitido = ilimitado. */
  remaining?: number
  /** `true` quando esta é a peça selecionada pelo caminho "tocar → tocar". */
  selected?: boolean
  disabled?: boolean
  onPick: () => void
}

/**
 * Peça de porta arrastável/tocável no estoque (usa `DragButton` do kit
 * `src/ui/dnd`): arrastar até um `CircuitSlot` ou tocar para selecionar e
 * depois tocar no encaixe. Mostra o nome da porta por texto; o número
 * restante nunca é só cor.
 */
export function GatePiece({ id, gate, remaining, selected, disabled, onPick }: GatePieceProps) {
  const exhausted = remaining !== undefined && remaining <= 0
  return (
    <DragButton
      id={id}
      data={{ gate }}
      selected={selected}
      disabled={disabled || exhausted}
      data-piece={gate}
      className={cx('gate-piece', selected && 'gate-piece--selected')}
      aria-label={
        remaining === undefined
          ? `Porta ${gate}`
          : `Porta ${gate}, ${remaining} no estoque`
      }
      onClick={onPick}
    >
      <span className="gate-piece-name">{gate}</span>
      {remaining !== undefined && <span className="gate-piece-count">×{remaining}</span>}
    </DragButton>
  )
}
