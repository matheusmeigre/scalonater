import type { CSSProperties } from 'react'
import { cx, fill } from '@/ui/format'
import { Icon } from '@/ui/icons'
import { APPS_COPY, UI } from '../content'
import { APP_COLOR } from './ThreadCard'
import type { CoreModel, CoreState, SlotModel } from './Processor'

/**
 * Variante de apresentação pura de `Processor`/`CoreBox`/`SlotView`
 * (`src/games/cores/scene/Processor.tsx`), sem `dnd-kit`
 * (`useDraggable`/`useDroppable`): recebe um estado estático
 * (`CoreModel`/`SlotModel`, os mesmos tipos exportados pela cena de
 * verdade) e um `onTap(slot)` simples, sem fila de threads, SMT ou
 * pontuação. Ver `docs/design/clique-ao-pixel.md`, "Pedidos à base" (2).
 *
 * Importa os mesmos tipos/cores da estação de origem (`CoreModel`,
 * `SlotModel`, `APP_COLOR`) para não duplicar o visual — se `cores`
 * redesenhar `Processor`, quem mudar a cena de verdade deve conferir se
 * este preview continua fazendo sentido (ver "Riscos" do design doc 11).
 */

const LED: Record<CoreState, string> = {
  free: 'bg-[#4A4570]',
  run: 'bg-mint shadow-[0_0_10px_var(--color-mint)] motion-safe:animate-pulse-soft',
  shared: 'bg-gold shadow-[0_0_10px_var(--color-gold)] motion-safe:animate-pulse-soft',
  stalled: 'bg-orange shadow-[0_0_10px_var(--color-orange)]',
}

function SlotViewPreview({ slot, onTap }: { slot: SlotModel; onTap?: (slot: number) => void }) {
  const t = slot.thread
  if (!t) {
    return (
      <button
        type="button"
        data-slot={slot.index}
        data-filled="false"
        onClick={() => onTap?.(slot.index)}
        className="no-callout relative flex min-h-[44px] w-full flex-1 flex-col items-center justify-center gap-1 rounded-[9px] border-2 border-dashed border-dim bg-transparent p-1 text-center text-dim roomy:min-h-[56px] roomy:rounded-md roomy:border-[3px]"
      >
        <Icon name="plus" className="size-5" />
      </button>
    )
  }
  const app = APPS_COPY[t.app]
  return (
    <button
      type="button"
      data-slot={slot.index}
      data-filled="true"
      onClick={() => onTap?.(slot.index)}
      style={{ '--c': APP_COLOR[t.app] } as CSSProperties}
      className="no-callout relative flex min-h-[44px] w-full flex-1 flex-col items-stretch justify-center gap-1 rounded-[9px] border-2 border-(--c) bg-panel-raised px-2 py-1 text-left text-ink roomy:min-h-[56px] roomy:rounded-md roomy:border-[3px]"
    >
      <span className="flex min-w-0 items-center gap-2">
        <span
          className="flex size-6 flex-none items-center justify-center rounded-[8px] bg-(--c) text-on-accent"
          aria-hidden="true"
        >
          <Icon name={`app-${t.app}`} className="size-4" />
        </span>
        <span className="truncate text-sm font-bold">{app.tasks[t.task]}</span>
      </span>
    </button>
  )
}

function CoreBoxPreview({ core, onTap }: { core: CoreModel; onTap?: (slot: number) => void }) {
  return (
    <div
      className={cx(
        'flex min-h-0 min-w-0 flex-col gap-1 rounded-[10px] border-2 bg-core p-[5px] roomy:gap-2.5 roomy:rounded-lg roomy:border-[3px] roomy:px-4 roomy:py-3.5',
        core.state === 'stalled' ? 'border-orange' : 'border-line-strong',
      )}
      data-core={core.index}
      data-state={core.state}
    >
      <span className="flex items-center gap-1.5 font-display text-[11px] tracking-[0.5px] uppercase roomy:text-[15px]">
        <i className={cx('size-2 flex-none rounded-full roomy:size-3', LED[core.state])} />
        {fill(UI.core, { n: core.index + 1 })}
      </span>
      <div className="flex min-h-0 flex-1 flex-col gap-1 roomy:gap-2.5">
        {core.slots.map((s) => (
          <SlotViewPreview key={s.index} slot={s} onTap={onTap} />
        ))}
      </div>
    </div>
  )
}

export function ProcessorPreview({
  cores,
  onTap,
  className,
}: {
  cores: readonly CoreModel[]
  onTap?: (slot: number) => void
  className?: string
}) {
  return (
    <div
      className={cx(
        'grid min-h-0 flex-1 auto-rows-fr grid-cols-2 gap-1.5 roomy:gap-3',
        className,
      )}
    >
      {cores.map((c) => (
        <CoreBoxPreview key={c.index} core={c} onTap={onTap} />
      ))}
    </div>
  )
}
