import { STATION_IDS, type StationId } from '@/engine/types'

/** Ordem da trilha (do mais baixo nível ao mais alto). */
export const TRAIL: readonly StationId[] = STATION_IDS

export interface Point {
  x: number
  y: number
}

/** Desenho da placa-mãe em dois formatos: deitado (desktop/tablet) e em pé (celular). */
export interface BoardLayout {
  width: number
  height: number
  /** Centro de cada estação. */
  stations: Record<StationId, Point>
  /** Tamanho de cada estação, nas unidades do viewBox. */
  tile: { w: number; h: number }
  /** Áreas decorativas (soquete da CPU, slots de RAM…). */
  zones: { id: string; x: number; y: number; w: number; h: number }[]
  /** Como as trilhas dobram: "hvh" (deitado) ou "vhv" (em pé). */
  route: 'hvh' | 'vhv'
}

export const BOARD_LANDSCAPE: BoardLayout = {
  width: 1160,
  height: 740,
  tile: { w: 150, h: 118 },
  route: 'hvh',
  stations: {
    io: { x: 130, y: 180 },
    network: { x: 130, y: 380 },
    alu: { x: 530, y: 200 },
    cycle: { x: 710, y: 200 },
    cores: { x: 530, y: 380 },
    cache: { x: 710, y: 380 },
    memory: { x: 960, y: 290 },
    bits: { x: 130, y: 615 },
    gates: { x: 350, y: 615 },
    storage: { x: 640, y: 620 },
    pixel: { x: 960, y: 620 },
  },
  zones: [
    { id: 'backpanel', x: 40, y: 66, w: 180, h: 396 },
    { id: 'cpu', x: 430, y: 100, w: 380, h: 365 },
    { id: 'ram', x: 870, y: 100, w: 180, h: 365 },
    { id: 'ssd', x: 545, y: 520, w: 190, h: 180 },
    { id: 'gpu', x: 865, y: 520, w: 190, h: 180 },
  ],
}

/** Em pé: as estações seguem a trilha em zigue-zague, de cima para baixo. */
export const BOARD_PORTRAIT: BoardLayout = {
  width: 400,
  height: 1420,
  tile: { w: 156, h: 112 },
  route: 'vhv',
  stations: Object.fromEntries(
    TRAIL.map((id, i) => [id, { x: i % 2 === 0 ? 105 : 295, y: 110 + i * 120 }]),
  ) as Record<StationId, Point>,
  zones: [],
}

/** Pontos de uma trilha entre duas estações, dobrando em ângulo reto. */
export function routeBetween(a: Point, b: Point, route: BoardLayout['route']): Point[] {
  if (a.x === b.x || a.y === b.y) return [a, b]
  if (route === 'hvh') {
    const mx = (a.x + b.x) / 2
    return [a, { x: mx, y: a.y }, { x: mx, y: b.y }, b]
  }
  const my = (a.y + b.y) / 2
  return [a, { x: a.x, y: my }, { x: b.x, y: my }, b]
}
