import { motion } from 'motion/react'
import { STATION_COPY, ZONE_LABELS } from '@/content/stations'
import { SHELL } from '@/content/shell'
import type { StationStatus } from '@/engine/phases/progression'
import type { StarCount } from '@/engine/scoring/scoring'
import type { StationId } from '@/engine/types'
import {
  BOARD_LANDSCAPE,
  BOARD_PORTRAIT,
  TRAIL,
  routeBetween,
  type BoardLayout,
} from '@/games/catalog'
import { Stars } from '@/ui/Stars'
import { cx } from '@/ui/format'
import { Icon, isIconName } from '@/ui/icons'

export interface StationView {
  id: StationId
  status: StationStatus
  stars: StarCount
  icon: string
}

const TILE: Record<StationStatus, string> = {
  complete: 'border-gold bg-panel-raised shadow-card-gold text-ink',
  available: 'border-cyan bg-panel-raised text-ink shadow-target motion-safe:animate-glow',
  locked: 'border-line bg-panel text-muted',
  soon: 'border-dashed border-line-strong bg-panel text-muted',
}
const ICON_BOX: Record<StationStatus, string> = {
  complete: 'bg-gold text-on-accent',
  available: 'bg-cyan text-on-accent',
  locked: 'bg-line text-dim',
  soon: 'bg-core text-dim',
}
const STATUS_TEXT: Record<StationStatus, string> = {
  complete: 'text-gold',
  available: 'text-cyan',
  locked: 'text-muted',
  soon: 'text-muted',
}

function tracePath(points: { x: number; y: number }[]) {
  return points.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ')
}

export function Board({
  stations,
  portrait,
  justLit,
  onSelect,
}: {
  stations: Record<StationId, StationView>
  portrait: boolean
  justLit: StationId | null
  onSelect: (id: StationId) => void
}) {
  const L: BoardLayout = portrait ? BOARD_PORTRAIT : BOARD_LANDSCAPE
  const pct = (v: number, total: number) => `${(v / total) * 100}%`
  const edges = TRAIL.slice(1).map((to, i) => {
    const from = TRAIL[i]!
    const a = stations[from].status
    const b = stations[to].status
    const lit = a === 'complete' && b === 'complete'
    const energized = !lit && (a === 'complete' || b === 'complete')
    return {
      from,
      to,
      lit,
      energized,
      d: tracePath(routeBetween(L.stations[from], L.stations[to], L.route)),
    }
  })

  return (
    <div
      className={cx(
        '@container relative mx-auto w-full',
        // No desktop, o tabuleiro inteiro cabe na altura da tela.
        portrait
          ? 'max-w-[520px]'
          : 'max-w-[1240px] side:max-w-[min(1240px,calc((100dvh-96px)*1.5676))]',
      )}
      style={{ aspectRatio: `${L.width} / ${L.height}` }}
    >
      <svg
        viewBox={`0 0 ${L.width} ${L.height}`}
        className="absolute inset-0 size-full"
        aria-hidden="true"
        focusable="false"
      >
        <rect
          x="6"
          y="6"
          width={L.width - 12}
          height={L.height - 12}
          rx="28"
          fill="#120F26"
          stroke="#3A3470"
          strokeWidth="4"
        />
        {[
          [30, 30],
          [L.width - 30, 30],
          [30, L.height - 30],
          [L.width - 30, L.height - 30],
        ].map(([x, y]) => (
          <circle
            key={`${x}-${y}`}
            cx={x}
            cy={y}
            r="9"
            fill="#0B0A1C"
            stroke="#3A3470"
            strokeWidth="3"
          />
        ))}
        {L.zones.map((z) => (
          <g key={z.id}>
            <rect
              x={z.x}
              y={z.y}
              width={z.w}
              height={z.h}
              rx="18"
              fill="#17143A"
              stroke="#2E2A55"
              strokeWidth="3"
              strokeDasharray={z.id === 'cpu' ? undefined : '10 8'}
            />
            <text
              x={z.x + 16}
              y={z.y + 30}
              fill="#8C87B8"
              fontFamily="Russo One, sans-serif"
              fontSize="18"
              letterSpacing="2"
            >
              {ZONE_LABELS[z.id]}
            </text>
          </g>
        ))}
        {edges.map((e) => (
          <g key={`${e.from}-${e.to}`}>
            {e.lit && (
              <path
                d={e.d}
                fill="none"
                stroke="#FFC940"
                strokeOpacity="0.25"
                strokeWidth="16"
                strokeLinejoin="round"
              />
            )}
            <path
              d={e.d}
              fill="none"
              stroke={e.lit ? '#FFC940' : e.energized ? '#3DE0FF' : '#2E2A55'}
              strokeWidth={e.lit ? 6 : 5}
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray={e.energized ? '14 12' : undefined}
              className={
                e.energized ? 'motion-safe:animate-[trace-flow_1.2s_linear_infinite]' : undefined
              }
            />
          </g>
        ))}
      </svg>

      {TRAIL.map((id) => {
        const s = stations[id]
        const p = L.stations[id]
        const copy = STATION_COPY[id]
        const statusText = SHELL.map.status[s.status]
        const lit = justLit === id
        return (
          <motion.button
            key={id}
            type="button"
            data-station={id}
            data-status={s.status}
            onClick={() => onSelect(id)}
            initial={lit ? { scale: 0.8 } : false}
            animate={lit ? { scale: [0.8, 1.12, 1] } : undefined}
            transition={{ duration: 0.8, delay: 0.3 }}
            className={cx(
              'absolute flex flex-col items-center justify-center gap-[0.35em] rounded-[14px] border-[3px] p-[0.4em] text-center no-callout',
              portrait ? 'text-[clamp(11px,3.6cqw,15px)]' : 'text-[clamp(10px,1.3cqw,16px)]',
              'hover:brightness-110',
              TILE[s.status],
            )}
            style={{
              left: pct(p.x - L.tile.w / 2, L.width),
              top: pct(p.y - L.tile.h / 2, L.height),
              width: pct(L.tile.w, L.width),
              height: pct(L.tile.h, L.height),
            }}
          >
            <span
              className={cx(
                'flex size-[2.4em] flex-none items-center justify-center rounded-[0.6em]',
                ICON_BOX[s.status],
              )}
            >
              {s.status === 'locked' ? (
                <Icon name="lock" className="size-[1.4em]" />
              ) : (
                isIconName(s.icon) && <Icon name={s.icon} className="size-[1.4em]" />
              )}
            </span>
            <span className="font-display leading-[1.05] tracking-[0.03em] uppercase">
              {copy.title}
            </span>
            {s.status === 'complete' ? (
              <Stars count={s.stars} size="sm" />
            ) : (
              <span
                className={cx(
                  'text-[0.8em] leading-none font-bold tracking-[0.08em] uppercase',
                  STATUS_TEXT[s.status],
                )}
              >
                {statusText}
              </span>
            )}
            <span className="sr-only">{`. ${copy.part}`}</span>
          </motion.button>
        )
      })}
    </div>
  )
}
