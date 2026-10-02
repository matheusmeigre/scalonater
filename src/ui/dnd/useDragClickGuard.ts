import { useRef } from 'react'

/**
 * Evita que o clique que chega logo depois de soltar um arraste seja
 * interpretado como um toque de seleção (dnd-kit dispara ambos em alguns
 * navegadores). Chame `markDragEnd()` em `onDragEnd`/`onDragCancel` e
 * verifique `wasRecentDrag()` antes de tratar um clique/tap.
 */
export function useDragClickGuard(windowMs = 250) {
  const lastDragEnd = useRef(0)
  const markDragEnd = () => {
    lastDragEnd.current = performance.now()
  }
  const wasRecentDrag = () => performance.now() - lastDragEnd.current < windowMs
  return { markDragEnd, wasRecentDrag }
}
