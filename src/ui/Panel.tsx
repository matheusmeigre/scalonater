import { forwardRef, type HTMLAttributes } from 'react'
import { cx } from './format'

/** Painel padrão (HUD, zonas de jogo). */
export const Panel = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function Panel(
  { className, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cx('rounded-lg border-2 border-line bg-panel', className)}
      {...rest}
    />
  )
})

export type CardTone = 'default' | 'win' | 'lose'

const CARD_TONE: Record<CardTone, string> = {
  default: 'border-cyan shadow-card-cyan',
  win: 'border-gold shadow-card-gold',
  lose: 'border-danger shadow-card-danger',
}

/** Cartão de tela cheia/modal (abertura de fase, pausa, derrota). */
export function Card({
  tone = 'default',
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { tone?: CardTone }) {
  return (
    <div
      className={cx(
        'rounded-[20px] border-[3px] bg-panel px-[18px] py-[22px] sm:rounded-2xl sm:p-8',
        CARD_TONE[tone],
        className,
      )}
      {...rest}
    />
  )
}

/** Papel claro: tudo que o Kernel fala e fatos da vida real. */
export function Paper({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        'rounded-[16px] bg-paper text-paper-ink shadow-[0_5px_0_var(--color-paper-shadow)] sm:rounded-[20px] sm:shadow-[0_6px_0_var(--color-paper-shadow)]',
        className,
      )}
      {...rest}
    />
  )
}

/** Rótulo pequeno em caixa alta (HUD, kickers). */
export function Label({ className, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-2 text-[11px] font-bold tracking-[1px] text-muted uppercase roomy:text-sm roomy:tracking-[2px]',
        className,
      )}
      {...rest}
    />
  )
}
