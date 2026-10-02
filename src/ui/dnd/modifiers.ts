import type { Modifier } from '@dnd-kit/core'

/**
 * No toque, a peça arrastada fica acima do dedo para não esconder o
 * destino. No mouse/trackpad, a peça segue o cursor normalmente.
 */
export function liftAboveFinger(liftPx = 14, heightFactor = 0.6): Modifier {
  return ({ transform, activatorEvent, draggingNodeRect }) => {
    const touch =
      activatorEvent &&
      'pointerType' in activatorEvent &&
      (activatorEvent as PointerEvent).pointerType === 'touch'
    if (!touch || !draggingNodeRect) return transform
    return { ...transform, y: transform.y - draggingNodeRect.height * heightFactor - liftPx }
  }
}
