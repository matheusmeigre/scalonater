import type { Announcements, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import { fill } from '@/ui/format'

/**
 * Textos (em `content.ts` de cada jogo, nunca aqui) para os anúncios do
 * arraste. Aceitam `{item}`/`{target}` como em qualquer texto do jogo.
 */
export interface DndAnnounceCopy {
  start: string
  over: string
  end: string
  endNowhere: string
  cancel: string
}

/**
 * Monta os `Announcements` do dnd-kit a partir dos textos do jogo e de duas
 * funções que nomeiam a peça (`itemName`) e o destino (`targetName`) a
 * partir do `data.current` do evento. Evita repetir essa marcenaria em cada
 * jogo que usa arraste.
 */
export function buildDndAnnouncements(
  copy: DndAnnounceCopy,
  itemName: (data: Record<string, unknown> | undefined) => string,
  targetName: (data: Record<string, unknown> | undefined) => string,
): Announcements {
  return {
    onDragStart: ({ active }: DragStartEvent) =>
      fill(copy.start, { item: itemName(active.data.current) }),
    onDragOver: ({ over }: DragOverEvent) =>
      over ? fill(copy.over, { target: targetName(over.data.current) }) : undefined,
    onDragEnd: ({ over }) =>
      over ? fill(copy.end, { target: targetName(over.data.current) }) : copy.endNowhere,
    onDragCancel: () => copy.cancel,
  }
}
