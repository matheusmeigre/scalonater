import { pointerWithin, type CollisionDetection } from '@dnd-kit/core'

/**
 * Colisão com "ímã": perto da área de destino (`targetContainerId`), a peça
 * arrastada vai para o alvo livre mais próximo do dedo em vez de precisar de
 * precisão pixel a pixel. Fora do raio do ímã (`magnetPx`) ao redor da área,
 * nada colide. `isCandidate` filtra quais droppables contam como "destino
 * livre" (ex.: só os espaços vazios de um núcleo).
 */
export function magnetCollision(
  targetContainerId: string,
  isCandidate: (id: string) => boolean,
  magnetPx = 40,
): CollisionDetection {
  return (args) => {
    const hits = pointerWithin(args).filter((c) => String(c.id) !== targetContainerId)
    if (hits.length) return hits
    const p = args.pointerCoordinates
    const area = args.droppableRects.get(targetContainerId)
    if (!p || !area) return []
    if (
      p.x < area.left - magnetPx ||
      p.x > area.right + magnetPx ||
      p.y < area.top - magnetPx ||
      p.y > area.bottom + magnetPx
    )
      return []
    let best: { id: string | number; d: number } | null = null
    for (const c of args.droppableContainers) {
      if (!isCandidate(String(c.id))) continue
      const r = args.droppableRects.get(c.id)
      if (!r) continue
      const dx = Math.max(r.left - p.x, 0, p.x - r.right)
      const dy = Math.max(r.top - p.y, 0, p.y - r.bottom)
      const d = Math.hypot(dx, dy)
      if (!best || d < best.d) best = { id: c.id, d }
    }
    return best
      ? [
          {
            id: best.id,
            data: {
              droppableContainer: args.droppableContainers.find((c) => c.id === best.id),
              value: best.d,
            },
          },
        ]
      : []
  }
}
