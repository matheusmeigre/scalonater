import { useDraggable, useDroppable } from '@dnd-kit/core'
import type { ReactNode } from 'react'
import { cx, fill } from '@/ui/format'
import { Icon } from '@/ui/icons'
import { Panel } from '@/ui/Panel'
import { APPS_COPY, UI } from '../content'
import type { DragSource } from '../logic/rules'
import { ThreadCard, type ThreadView } from './ThreadCard'

const STRIP =
  'flex min-h-0 gap-1.5 overflow-x-auto overflow-y-hidden overscroll-x-contain scrollbar-thin px-0.5 pt-1 pb-1.5 roomy:gap-2.5 ' +
  'short:grid short:grid-cols-2 short:content-start short:overflow-x-hidden short:overflow-y-auto ' +
  'side:grid side:grid-cols-2 side:content-start side:overflow-x-hidden side:overflow-y-auto'

const ITEM =
  'h-[60px] w-[84px] flex-none roomy:h-[70px] roomy:w-[200px] short:h-[54px] short:w-auto side:h-[70px] side:w-auto'

function ZoneHeader({
  title,
  hint,
  count,
  icon,
}: {
  title: string
  hint: string
  count?: number
  icon?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h2 className="m-0 text-sm tracking-[0.5px] uppercase roomy:text-[19px] roomy:tracking-[1px]">
          {title}
        </h2>
        <p className="m-0 hidden text-[13.5px] leading-[1.3] text-muted roomy:mt-0.5 roomy:block">
          {hint}
        </p>
      </div>
      {count !== undefined && (
        <span
          aria-label={`${UI.queueCount}: ${count}`}
          className="flex h-7 min-w-7 flex-none items-center justify-center rounded-[8px] bg-orange px-1.5 font-display text-[15px] text-on-accent shadow-[0_2px_0_var(--color-orange-depth)] roomy:h-11 roomy:min-w-11 roomy:rounded-[12px] roomy:text-[22px] roomy:shadow-[0_4px_0_var(--color-orange-depth)]"
        >
          {count}
        </span>
      )}
      {icon}
    </div>
  )
}

function threadLabel(v: ThreadView, showPatience: boolean, selected: boolean) {
  const app = APPS_COPY[v.app]
  const parts: string[] = []
  if (v.blocked) parts.push(UI.aria.threadBlocked)
  else if (showPatience) parts.push(fill(UI.aria.threadPatience, { p: v.patience * 2 }))
  if (v.preferred >= 0) parts.push(fill(UI.aria.threadPreferred, { n: v.preferred + 1 }))
  if (selected) parts.push(UI.aria.threadSelected)
  parts.push(UI.aria.threadAction)
  return fill(UI.aria.thread, {
    app: app.name,
    task: app.tasks[v.task] ?? '',
    state: parts.join(' '),
  })
}

function QueueItem({
  view,
  showPatience,
  selected,
  disabled,
  onTap,
}: {
  view: ThreadView
  showPatience: boolean
  selected: boolean
  disabled: boolean
  onTap: (id: number) => void
}) {
  const source: DragSource = { kind: 'queue', threadId: view.id }
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: `q:${view.id}`,
    data: { source },
    disabled,
    attributes: { roleDescription: UI.dnd.roleDescription },
  })
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      aria-pressed={selected}
      aria-label={threadLabel(view, showPatience, selected)}
      disabled={disabled}
      onClick={() => onTap(view.id)}
      className={cx(
        'thread-btn block rounded-md p-0 text-left no-callout',
        'touch-pan-x short:touch-pan-y side:touch-pan-y',
        ITEM,
      )}
      data-thread={view.id}
    >
      <ThreadCard view={view} showPatience={showPatience} selected={selected} faded={isDragging} />
    </button>
  )
}

export function QueueZone({
  threads,
  selected,
  showPatience,
  dragging,
  autoplay,
  highlight,
  onTap,
}: {
  threads: ThreadView[]
  selected: number | null
  showPatience: boolean
  dragging: DragSource | null
  autoplay: boolean
  highlight: boolean
  onTap: (id: number) => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'zone:queue',
    data: { target: { kind: 'queue' } },
    disabled: dragging?.kind !== 'slot',
  })
  return (
    <Panel
      ref={setNodeRef}
      data-highlight={highlight}
      data-zone="queue"
      aria-label={UI.aria.queueZone}
      role="region"
      className={cx(
        'flex min-h-0 flex-col gap-1 rounded-[14px] px-2.5 py-2 [grid-area:queue] roomy:gap-3 roomy:rounded-xl roomy:p-4',
        isOver && 'border-cyan shadow-target',
      )}
    >
      <ZoneHeader
        title={UI.queue}
        hint={autoplay ? UI.queueHintAuto : UI.queueHint}
        count={threads.length}
      />
      {threads.length === 0 ? (
        <p className="m-0 flex min-h-[60px] items-center justify-center rounded-md border border-dashed border-line p-2 text-center text-[13px] text-muted roomy:min-h-[70px] roomy:border-2 roomy:text-[14.5px]">
          {UI.queueEmpty}
        </p>
      ) : (
        <div className={STRIP}>
          {threads.map((v) => (
            <QueueItem
              key={v.id}
              view={v}
              showPatience={showPatience}
              selected={selected === v.id}
              disabled={autoplay}
              onTap={onTap}
            />
          ))}
        </div>
      )}
    </Panel>
  )
}

export function IoZone({
  threads,
  dragging,
}: {
  threads: ThreadView[]
  dragging: DragSource | null
}) {
  const { setNodeRef, isOver, active } = useDroppable({
    id: 'zone:io',
    data: { target: { kind: 'io' } },
  })
  const canDropHere = !!active && dragging?.kind === 'slot'
  return (
    <Panel
      ref={setNodeRef}
      data-zone="io"
      role="region"
      aria-label={UI.aria.ioZone}
      className={cx(
        'flex min-h-0 flex-col gap-1 rounded-[14px] px-2.5 py-2 [grid-area:io] roomy:gap-3 roomy:rounded-xl roomy:p-4',
        isOver && canDropHere && 'border-cyan shadow-target',
      )}
    >
      <ZoneHeader
        title={UI.io}
        hint={UI.ioHint}
        icon={
          <span className="hidden size-[38px] flex-none items-center justify-center rounded-[12px] bg-orange-tint text-orange roomy:flex">
            <Icon name="hourglass" className="size-[22px]" />
          </span>
        }
      />
      {threads.length === 0 ? (
        <p className="m-0 flex min-h-11 items-center justify-center rounded-md border border-dashed border-line p-2 text-center text-[13px] text-muted roomy:border-2 roomy:text-[14.5px]">
          {UI.ioEmpty}
        </p>
      ) : (
        <ul className={cx(STRIP, 'm-0 list-none')}>
          {threads.map((v) => (
            <li
              key={v.id}
              className="h-11 w-[84px] flex-none roomy:h-[62px] roomy:w-[200px] short:h-11 short:w-auto side:h-[62px] side:w-auto"
            >
              <span className="sr-only">{`${APPS_COPY[v.app].name}, ${APPS_COPY[v.app].tasks[v.task] ?? ''}`}</span>
              <ThreadCard view={v} showPatience={false} variant="io" />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
