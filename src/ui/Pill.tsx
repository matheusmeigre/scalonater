import type { DifficultyId } from '@/engine/types'
import { cx } from './format'

const DIFF: Record<DifficultyId, string> = {
  easy: 'bg-tint-mint text-mint',
  normal: 'bg-tint-cyan text-cyan',
  hard: 'bg-tint-danger text-danger',
}

/** Pílula de dificuldade: a palavra sempre aparece, a cor só reforça. */
export function DifficultyPill({
  difficulty,
  children,
  className,
}: {
  difficulty: DifficultyId
  children: string
  className?: string
}) {
  return (
    <span
      className={cx(
        'inline-block rounded-full px-2 py-px text-[11px] font-bold tracking-[1px] uppercase roomy:px-2.5 roomy:text-[13px]',
        DIFF[difficulty],
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Fichinha do combo. Fica sólida quando a sequência esquenta. */
export function ComboChip({
  hot,
  label,
  children,
}: {
  hot: boolean
  label: string
  children: string
}) {
  return (
    <span
      className={cx(
        'rounded-xs px-1 text-[10px] font-bold tracking-[0.5px] whitespace-nowrap roomy:px-2 roomy:text-[13px] roomy:tracking-[1px]',
        hot ? 'bg-orange text-on-accent' : 'bg-orange-tint text-orange',
      )}
    >
      <span className="compact:sr-only">{label} </span>
      {children}
    </span>
  )
}
