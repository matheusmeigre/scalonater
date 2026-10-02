import { useDroppable } from '@dnd-kit/core'
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cx } from '@/ui/format'

export interface DropTargetProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'id'> {
  id: string
  /** Dados do dnd-kit disponíveis em `over.data.current` nos eventos de arraste. */
  data?: Record<string, unknown>
  disabled?: boolean
  children: ReactNode
}

/**
 * Destino de arraste acessível, par do `DragButton`: aceita soltar uma peça
 * (mouse/toque) e também um toque direto, quando o jogador já selecionou a
 * peça pelo caminho "tocar → tocar". `data-over` marca quando uma peça está
 * sendo arrastada por cima, para estilizar o destaque do alvo.
 */
export const DropTarget = forwardRef<HTMLButtonElement, DropTargetProps>(function DropTarget(
  { id, data, disabled, className, children, ...rest },
  forwardedRef,
) {
  const { setNodeRef, isOver } = useDroppable({ id, data, disabled })
  return (
    <button
      ref={(node) => {
        setNodeRef(node)
        if (typeof forwardedRef === 'function') forwardedRef(node)
        else if (forwardedRef) forwardedRef.current = node
      }}
      type="button"
      data-over={isOver || undefined}
      aria-disabled={disabled || undefined}
      className={cx(className)}
      {...rest}
    >
      {children}
    </button>
  )
})
