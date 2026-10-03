import { DropTarget } from '@/ui/dnd'
import { cx } from '@/ui/format'
import type { GateType } from './types'
import './circuit.css'

export interface CircuitSlotProps {
  /** Id único do encaixe (DOM/dnd-kit). Normalmente o `NodeId` do slot no template. */
  id: string
  /** Porta atualmente encaixada, ou undefined se o encaixe está vazio. */
  gate?: GateType
  /** Rótulo acessível do encaixe, ex. "encaixe 2, porta AND, entradas A e B". */
  label: string
  disabled?: boolean
  /**
   * Porta pendente (selecionada por toque no estoque, ver `GatePiece`). Não
   * faz parte do contrato original do design doc (que listava só
   * `onDrop`/`onClear`): sem ela, o encaixe não saberia qual porta tocar ao
   * receber um toque direto (a alternativa ao arraste). Ver DECISIONS.md.
   */
  pendingGate?: GateType | null
  /**
   * Chamado quando o encaixe recebe uma porta: pelo toque direto (usa
   * `pendingGate`) ou pelo arraste solto sobre este encaixe (a cena chama
   * isto a partir de `onDragEnd` do `DndContext`, lendo `active.data`).
   */
  onDrop: (gate: GateType) => void
  onClear?: () => void
}

/**
 * Encaixe acessível para uma porta: aceita arraste (`useDroppable` via
 * `DropTarget` do kit `src/ui/dnd`) e toque (ao tocar com uma peça
 * pendente, chama `onDrop` com ela — o padrão "tocar → tocar"). Alvo de
 * toque mínimo 44×44px. Mostra o nome da porta por texto, não só por
 * ícone/cor. Tocar num encaixe já preenchido chama `onClear` (remove a
 * peça, que volta ao estoque).
 */
export function CircuitSlot({
  id,
  gate,
  label,
  disabled,
  pendingGate,
  onDrop,
  onClear,
}: CircuitSlotProps) {
  return (
    <DropTarget
      id={id}
      data={{ target: { kind: 'slot', slotId: id } }}
      disabled={disabled}
      aria-label={label}
      aria-pressed={!!gate}
      data-slot={id}
      data-filled={!!gate}
      className={cx('circuit-slot', gate ? 'circuit-slot--filled' : 'circuit-slot--empty')}
      onClick={() => {
        if (gate) onClear?.()
        else if (pendingGate) onDrop(pendingGate)
      }}
    >
      {gate ? (
        <span className="circuit-slot-gate">{gate}</span>
      ) : (
        <span aria-hidden="true">{'?'}</span>
      )}
    </DropTarget>
  )
}
