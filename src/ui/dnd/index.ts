/**
 * Kit "tocar ou arrastar": peças comuns para qualquer estação com arraste.
 * Toda estação com arraste deve usar este kit em vez de reimplementar a
 * colisão com ímã, o modificador de toque ou a marcenaria dos anúncios.
 */
export { buildDndAnnouncements, type DndAnnounceCopy } from './announcements'
export { DragButton, type DragButtonProps } from './DragButton'
export { DropTarget, type DropTargetProps } from './DropTarget'
export { magnetCollision } from './magnet'
export { liftAboveFinger } from './modifiers'
export { useDragClickGuard } from './useDragClickGuard'
