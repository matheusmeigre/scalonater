import { SHELL } from '@/content/shell'
import type { ConceptCard } from '@/engine/types'
import { Icon, isIconName } from './icons'
import { Paper } from './Panel'
import { RichText } from './RichText'
import { cx } from './format'

/** Verbete colecionável do Manual do Computador. */
export function ConceptCardView({
  card,
  station,
  isNew,
  headingId,
  className,
}: {
  card: ConceptCard
  station: string
  isNew?: boolean
  headingId?: string
  className?: string
}) {
  return (
    <article
      className={cx(
        'relative flex flex-col gap-3 rounded-xl border-[3px] border-gold bg-panel p-4 shadow-card-gold sm:p-6',
        className,
      )}
    >
      <header className="flex items-center gap-3">
        <span className="flex size-12 flex-none items-center justify-center rounded-[12px] bg-gold text-on-accent shadow-[inset_0_-4px_0_rgb(0_0_0/0.22)] sm:size-14">
          {isIconName(card.icon) && <Icon name={card.icon} className="size-7" />}
        </span>
        <div className="min-w-0">
          <p className="m-0 text-[11px] font-bold tracking-[2px] text-muted uppercase">{station}</p>
          <h3 id={headingId} className="m-0 text-xl tracking-[0.5px] uppercase sm:text-2xl">
            {card.title}
          </h3>
        </div>
        {isNew && (
          <span className="ml-auto self-start rounded-full bg-gold px-2 py-0.5 text-[11px] font-bold tracking-[1px] text-on-accent uppercase">
            {SHELL.manual.new}
          </span>
        )}
      </header>
      <p className="m-0 text-[13px] text-muted">
        <b className="font-bold text-cyan">{SHELL.manual.term}: </b>
        {card.term}
      </p>
      <RichText
        as="p"
        className="m-0 text-base leading-[1.45] sm:text-[17px]"
        text={card.summary}
      />
      <Paper className="px-4 py-3">
        <span className="mb-1 block font-display text-[13px] tracking-[2px] text-violet uppercase">
          {SHELL.manual.analogy}
        </span>
        <RichText
          as="p"
          tone="paper"
          className="m-0 text-[15px] leading-[1.4]"
          text={card.analogy}
        />
      </Paper>
      <p className="m-0 text-[15px] leading-[1.4] text-muted">
        <b className="font-bold text-mint">{SHELL.manual.realWorld}: </b>
        {card.realWorld}
      </p>
    </article>
  )
}

/** Card ainda não ganho: silhueta com a dica de onde ganhar. */
export function LockedCardView({ hint, className }: { hint: string; className?: string }) {
  return (
    <div
      className={cx(
        'flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line-strong bg-panel/60 p-5 text-center',
        className,
      )}
    >
      <Icon name="lock" className="size-8 text-dim" />
      <p className="m-0 font-display text-sm tracking-[1px] text-muted uppercase">
        {SHELL.manual.locked}
      </p>
      <p className="m-0 text-sm text-muted">{hint}</p>
    </div>
  )
}
