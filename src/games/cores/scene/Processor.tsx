import { useDraggable, useDroppable } from '@dnd-kit/core'
import { memo, type CSSProperties } from 'react'
import { cx, fill } from '@/ui/format'
import { Icon } from '@/ui/icons'
import { APPS_COPY, UI } from '../content'
import type { DragSource } from '../logic/rules'
import { APP_COLOR, sameView, type ThreadView } from './ThreadCard'

export type CoreState = 'free' | 'run' | 'shared' | 'stalled'

export interface SlotModel {
  index: number
  core: number
  thread: ThreadView | null
  /** Rodando com cache quente (+30%). */
  hot: boolean
}

export interface CoreModel {
  index: number
  state: CoreState
  hotWaiting: boolean
  slots: SlotModel[]
}

const SLOT_BASE =
  'no-callout relative flex w-full min-h-0 flex-1 flex-col items-center justify-center gap-1 overflow-hidden rounded-[9px] border-2 p-0 text-center touch-none roomy:rounded-md roomy:border-[3px]'
/** Altura mínima: com SMT cabem dois espaços por núcleo, então eles encolhem (sempre ≥ 44px). */
const slotHeight = (smt: boolean) =>
  smt ? 'min-h-[44px] roomy:min-h-[56px]' : 'min-h-[52px] roomy:min-h-[84px] short:min-h-[44px]'

const SlotView = memo(
  function SlotView({
    slot,
    armed,
    dragging,
    queueEmpty,
    autoplay,
    smt,
    onTap,
  }: {
    slot: SlotModel
    smt: boolean
    armed: boolean
    dragging: DragSource | null
    queueEmpty: boolean
    autoplay: boolean
    onTap: (slot: number) => void
  }) {
    const t = slot.thread
    const source: DragSource = { kind: 'slot', slot: slot.index }
    const drop = useDroppable({
      id: `slot:${slot.index}`,
      data: { target: { kind: 'slot', slot: slot.index } },
      disabled: !!t || !dragging,
    })
    const drag = useDraggable({
      id: `s:${slot.index}`,
      data: { source },
      disabled: !t || autoplay,
      attributes: { roleDescription: UI.dnd.roleDescription },
    })
    const ref = (el: HTMLElement | null) => {
      drop.setNodeRef(el)
      drag.setNodeRef(el)
    }
    const n = slot.core + 1

    if (t) {
      const app = APPS_COPY[t.app]
      const label = fill(UI.aria.slotFilled, {
        n,
        app: app.name,
        task: app.tasks[t.task] ?? '',
        pct: t.progress,
        extra: t.blocked ? UI.aria.slotBlocked : '',
      })
      return (
        <button
          ref={ref}
          type="button"
          {...drag.attributes}
          {...drag.listeners}
          aria-label={label}
          disabled={autoplay}
          onClick={() => onTap(slot.index)}
          data-slot={slot.index}
          data-filled="true"
          style={{ '--c': APP_COLOR[t.app] } as CSSProperties}
          className={cx(
            SLOT_BASE,
            slotHeight(smt),
            '@container items-stretch justify-center bg-panel-raised px-1 py-1 text-left text-ink',
            smt ? 'roomy:px-3 roomy:py-1.5' : 'roomy:px-3.5 roomy:py-3',
            t.blocked
              ? 'border-orange bg-[repeating-linear-gradient(-45deg,rgb(255_138_61/0.14)_0_10px,transparent_10px_20px)]'
              : 'border-(--c) roomy:shadow-[0_0_26px_color-mix(in_srgb,var(--c)_30%,transparent),inset_0_0_40px_color-mix(in_srgb,var(--c)_12%,transparent)]',
            drag.isDragging && 'opacity-40',
          )}
        >
          <span className="flex min-w-0 items-center justify-center gap-2.5 @min-[150px]:justify-start">
            <span
              className={cx(
                'flex size-[26px] flex-none items-center justify-center rounded-[8px] bg-(--c) text-on-accent roomy:shadow-[inset_0_-5px_0_rgb(0_0_0/0.22),0_0_22px_var(--c)]',
                smt ? 'roomy:size-8 roomy:rounded-[10px]' : 'roomy:size-12 roomy:rounded-[12px]',
              )}
              aria-hidden="true"
            >
              <Icon
                name={`app-${t.app}`}
                className={smt ? 'size-4 roomy:size-5' : 'size-4 roomy:size-7'}
              />
            </span>
            <span className="hidden min-w-0 flex-col leading-[1.1] @min-[150px]:flex">
              {!smt && (
                <b className="truncate text-[11px] font-bold tracking-[1.5px] text-(--c) uppercase roomy:text-xs">
                  {app.name}
                </b>
              )}
              <span
                className={cx('truncate text-base font-bold', !smt && '@min-[220px]:text-[22px]')}
              >
                {app.tasks[t.task]}
              </span>
            </span>
            {(t.blocked || slot.hot) && (
              <span className="absolute top-1 right-1 flex items-center gap-0.5 text-xs font-bold text-orange roomy:static roomy:ml-auto roomy:self-start">
                <Icon name={t.blocked ? 'hourglass' : 'flame'} className="size-3 roomy:size-4" />
                {!t.blocked && <span className="hidden @min-[150px]:inline">{UI.hotBonus}</span>}
              </span>
            )}
            {smt && (
              <b className="ml-auto hidden font-display text-base font-normal @min-[150px]:inline">
                {t.progress}
                {'%'}
              </b>
            )}
          </span>
          <span
            className={cx(
              'mt-auto hidden items-center justify-between gap-2 text-sm text-muted',
              !smt && '@min-[150px]:flex',
            )}
          >
            <span className={cx(t.blocked && 'font-bold text-orange')}>
              {t.blocked ? UI.waiting : UI.running}
            </span>
            <b className="font-display text-lg font-normal text-ink">
              {t.progress}
              {'%'}
            </b>
          </span>
          <span
            className={cx(
              'block h-2 w-full flex-none overflow-hidden rounded-[6px] border border-line bg-bg roomy:border-2',
              smt ? 'roomy:h-3' : 'roomy:mt-1 roomy:h-[18px] roomy:rounded-[10px]',
            )}
          >
            <i
              className={cx(
                'run-bar block h-full',
                !t.blocked && 'moving',
                t.blocked && 'saturate-[.6]',
              )}
              style={{
                transform: `scaleX(${t.progress / 100})`,
                ...(t.blocked ? { backgroundColor: 'var(--color-orange)' } : {}),
              }}
            />
          </span>
        </button>
      )
    }

    const label = dragging ? UI.slotDrop : armed ? UI.slotArmed : UI.slotFree
    const hint = autoplay
      ? UI.slotHintAuto
      : dragging
        ? UI.slotHintDrag
        : armed
          ? UI.slotHintArmed
          : queueEmpty
            ? ''
            : UI.slotHintIdle
    const target = !!dragging || (!queueEmpty && !autoplay)
    return (
      <button
        ref={ref}
        type="button"
        aria-label={fill(UI.aria.slotFree, {
          n,
          action: armed ? UI.aria.slotFreeAction : UI.aria.slotFreeActionFirst,
        })}
        disabled={autoplay}
        onClick={() => onTap(slot.index)}
        data-slot={slot.index}
        data-filled="false"
        className={cx(
          SLOT_BASE,
          slotHeight(smt),
          '@container border-dashed bg-transparent text-dim hover:brightness-125',
          target && 'border-cyan/55 text-[#7FDFF2]',
          armed &&
            !dragging &&
            'border-cyan text-cyan shadow-[0_0_0_4px_rgb(61_224_255/0.18),0_0_30px_rgb(61_224_255/0.32)] motion-safe:animate-glow',
          drop.isOver && 'border-solid border-gold bg-gold/10 text-gold',
          !target && 'border-dim',
        )}
      >
        {!smt && <Icon name="plus" className="hidden size-[30px] @min-[150px]:block" />}
        <b
          className={cx(
            'font-display text-[11px] font-normal tracking-[0.5px] uppercase roomy:tracking-[1.5px]',
            smt ? 'roomy:text-[15px]' : 'roomy:text-[19px]',
          )}
        >
          {label}
        </b>
        {hint && !smt && <small className="hidden text-sm @min-[200px]:block">{hint}</small>}
      </button>
    )
  },
  (a, b) =>
    sameSlot(a.slot, b.slot) &&
    a.armed === b.armed &&
    a.dragging === b.dragging &&
    a.queueEmpty === b.queueEmpty &&
    a.autoplay === b.autoplay &&
    a.smt === b.smt &&
    a.onTap === b.onTap,
)

function sameSlot(a: SlotModel, b: SlotModel) {
  if (a.index !== b.index || a.hot !== b.hot) return false
  if (!a.thread || !b.thread) return a.thread === b.thread
  return sameView(a.thread, b.thread)
}

const LED: Record<CoreState, string> = {
  free: 'bg-[#4A4570]',
  run: 'bg-mint shadow-[0_0_10px_var(--color-mint)] motion-safe:animate-pulse-soft',
  shared: 'bg-gold shadow-[0_0_10px_var(--color-gold)] motion-safe:animate-pulse-soft',
  stalled: 'bg-orange shadow-[0_0_10px_var(--color-orange)]',
}
const STATUS_COLOR: Record<CoreState, string> = {
  free: 'text-dim',
  run: 'text-mint',
  shared: 'text-gold',
  stalled: 'text-orange',
}

function CoreBox({
  core,
  armed,
  dragging,
  queueEmpty,
  autoplay,
  smt,
  onTap,
}: {
  core: CoreModel
  smt: boolean
  armed: boolean
  dragging: DragSource | null
  queueEmpty: boolean
  autoplay: boolean
  onTap: (slot: number) => void
}) {
  const long =
    core.state === 'shared'
      ? UI.coreStatus.shared
      : core.state === 'stalled'
        ? UI.coreStatus.stalled
        : UI.coreStatus[core.state]
  const short =
    core.state === 'shared'
      ? UI.coreStatus.sharedShort
      : core.state === 'stalled'
        ? UI.coreStatus.stalledShort
        : UI.coreStatus[core.state]
  return (
    <div
      className={cx(
        '@container flex min-h-0 min-w-0 flex-col gap-1 overflow-hidden rounded-[10px] border-2 bg-core p-[5px] transition-colors roomy:gap-2.5 roomy:rounded-lg roomy:border-[3px] roomy:px-4 roomy:py-3.5',
        core.state === 'stalled' ? 'border-orange' : 'border-line-strong',
      )}
      data-core={core.index}
      data-state={core.state}
    >
      <div className="flex flex-col items-start gap-px @min-[200px]:flex-row @min-[200px]:items-center @min-[200px]:justify-between @min-[200px]:gap-2">
        <span className="flex max-w-full min-w-0 items-center gap-1.5 font-display text-[clamp(9px,15cqw,11.5px)] leading-[1.15] tracking-[0.5px] uppercase @min-[200px]:gap-2.5 @min-[200px]:text-[17px] @min-[200px]:tracking-[1px]">
          <i className={cx('size-2 flex-none rounded-full roomy:size-3', LED[core.state])} />
          <span className="min-w-0 [overflow-wrap:anywhere]">
            {fill(UI.core, { n: core.index + 1 })}
          </span>
          {core.hotWaiting && (
            <Icon
              name="flame"
              label={UI.hotCore}
              className="size-3 flex-none text-orange roomy:size-4"
            />
          )}
        </span>
        <span
          className={cx(
            'max-w-full truncate text-[9.5px] font-bold tracking-[0.3px] uppercase @min-[200px]:text-[13px] @min-[200px]:tracking-[2px]',
            STATUS_COLOR[core.state],
          )}
        >
          <span className="@min-[260px]:hidden">{short}</span>
          <span className="hidden @min-[260px]:inline">{long}</span>
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-1 roomy:gap-2.5">
        {core.slots.map((s) => (
          <SlotView
            key={s.index}
            slot={s}
            armed={armed}
            dragging={dragging}
            queueEmpty={queueEmpty}
            autoplay={autoplay}
            smt={smt}
            onTap={onTap}
          />
        ))}
      </div>
    </div>
  )
}

export function Processor({
  cores,
  smt,
  armed,
  dragging,
  queueEmpty,
  autoplay,
  highlight,
  onTap,
}: {
  cores: CoreModel[]
  smt: boolean
  armed: boolean
  dragging: DragSource | null
  queueEmpty: boolean
  autoplay: boolean
  highlight: 'cpu' | 'slots' | null
  onTap: (slot: number) => void
}) {
  const busy = cores.filter((c) => c.state !== 'free').length
  const { setNodeRef: setDieRef } = useDroppable({ id: 'die', data: { magnet: true } })
  return (
    <section
      className="die-pins relative flex min-h-0 [grid-area:cpu] roomy:p-4"
      aria-label={smt ? UI.processorSmt : UI.processor}
      data-highlight={highlight === 'cpu'}
    >
      <div
        ref={setDieRef}
        className="relative flex min-w-0 flex-1 flex-col gap-1.5 rounded-[14px] border-2 border-line-strong bg-die p-2 roomy:gap-3.5 roomy:rounded-xl roomy:border-[3px] roomy:p-5 roomy:shadow-die"
      >
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-display text-sm tracking-[1px] uppercase roomy:text-[22px]">
              {smt ? UI.processorSmt : UI.processor}
            </span>
            <span className="hidden rounded-[8px] border-2 border-line-strong px-2.5 py-0.5 text-[13px] font-bold tracking-[2px] text-muted uppercase roomy:inline">
              {fill(smt ? UI.cpuInfoSmt : UI.cpuInfo, { cores: cores.length })}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted roomy:gap-2.5 roomy:text-sm">
            <span>{UI.inUse}</span>
            <b className="font-display text-sm font-normal text-mint roomy:text-xl">
              {busy}/{cores.length}
            </b>
          </div>
        </div>
        <div
          className="grid min-h-0 flex-1 auto-rows-fr grid-cols-4 gap-1.5 roomy:gap-3 side:grid-cols-2 side:gap-3.5"
          data-highlight={highlight === 'slots'}
        >
          {cores.map((c) => (
            <CoreBox
              key={c.index}
              core={c}
              armed={armed}
              dragging={dragging}
              queueEmpty={queueEmpty}
              autoplay={autoplay}
              smt={smt}
              onTap={onTap}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
