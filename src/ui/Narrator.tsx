import { Kernel, type KernelMood } from './Kernel'
import { Paper } from './Panel'
import { RichText } from './RichText'
import { cx } from './format'

export interface NarratorProps {
  message: string
  mood?: KernelMood
  speaker: string
  role?: string
  /** Região aria-live (desligue quando outra região já anuncia a mesma fala). */
  live?: boolean
  className?: string
}

/** Painel de diálogo do Kernel: robô à esquerda e a fala num papel claro. */
export function Narrator({
  message,
  mood = 'neutral',
  speaker,
  role,
  live = true,
  className,
}: NarratorProps) {
  return (
    <Paper
      className={cx(
        'flex min-w-0 items-center gap-2.5 py-1.5 pr-2.5 pl-1.5 roomy:gap-4 roomy:py-2.5 roomy:pr-[22px] roomy:pl-3.5',
        className,
      )}
    >
      <div className="flex size-10 flex-none items-center justify-center rounded-[10px] bg-paper-ink roomy:size-[68px] roomy:rounded-[16px]">
        <Kernel mood={mood} className="size-[30px] roomy:size-[52px]" />
      </div>
      <div className="min-w-0">
        <div className="hidden items-center gap-2.5 roomy:flex">
          <b className="font-display text-[15px] font-normal tracking-[2px] text-violet">
            {speaker}
          </b>
          {role && <span className="text-[13px] text-pin">{role}</span>}
        </div>
        <RichText
          text={message}
          tone="paper"
          as="p"
          className="m-0 text-sm leading-[1.3] font-semibold roomy:mt-0.5 roomy:text-xl roomy:leading-[1.25]"
          {...(live ? { 'aria-live': 'polite' } : {})}
        />
      </div>
    </Paper>
  )
}
