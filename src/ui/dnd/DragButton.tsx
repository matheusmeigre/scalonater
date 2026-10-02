import { useDraggable } from '@dnd-kit/core'
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cx } from '@/ui/format'

export interface DragButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'id'> {
  id: string
  /** Dados do dnd-kit disponíveis em `active.data.current` nos eventos de arraste. */
  data?: Record<string, unknown>
  /** `true` quando esta peça está selecionada pelo caminho "tocar → tocar". */
  selected?: boolean
  disabled?: boolean
  children: ReactNode
}

/**
 * Peça arrastável acessível: funciona arrastando (mouse ou toque) ou pelo
 * caminho "tocar para selecionar → tocar no destino" (ver `DropTarget`), e
 * também pelo teclado (Tab até aqui, Enter para selecionar). O estado de
 * seleção é de quem chama (`selected`): o dnd-kit só cuida do arraste.
 */
export const DragButton = forwardRef<HTMLButtonElement, DragButtonProps>(function DragButton(
  { id, data, selected = false, disabled, className, children, ...rest },
  forwardedRef,
) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    data,
    disabled,
  })
  return (
    <button
      ref={(node) => {
        setNodeRef(node)
        if (typeof forwardedRef === 'function') forwardedRef(node)
        else if (forwardedRef) forwardedRef.current = node
      }}
      type="button"
      data-dragging={isDragging || undefined}
      className={cx(className)}
      {...attributes}
      {...listeners}
      {...rest}
      aria-pressed={selected}
      aria-disabled={disabled || undefined}
    >
      {children}
    </button>
  )
})
