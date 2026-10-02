import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router'
import { audio } from '@/engine/audio/audioEngine'
import { cx } from './format'
import { Icon, type IconName } from './icons'

export type ButtonVariant = 'gold' | 'cyan' | 'orange' | 'mint' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANT: Record<ButtonVariant, string> = {
  gold: 'bg-gold text-on-accent [--sh:var(--color-gold-depth)]',
  cyan: 'bg-cyan text-on-accent [--sh:var(--color-cyan-depth)]',
  orange: 'bg-orange text-on-accent [--sh:var(--color-orange-depth)]',
  mint: 'bg-mint text-on-accent [--sh:var(--color-mint-depth)]',
  ghost: 'bg-line text-ink [--sh:var(--color-shade)]',
}

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-11 min-w-11 px-3.5 gap-1.5 text-[13px] rounded-[12px] [--d:3px] [&_svg]:size-[18px]',
  md: 'h-[52px] min-w-[52px] px-5 gap-2 text-base rounded-[16px] [--d:5px] sm:h-[60px] sm:px-7 sm:text-lg sm:rounded-lg [&_svg]:size-[22px]',
  lg: 'h-[58px] min-w-[58px] px-6 gap-2.5 text-lg rounded-lg [--d:6px] sm:h-[68px] sm:px-8 sm:text-[21px] [&_svg]:size-6',
}

/** Classe do botão com volume (borda dura que afunda ao apertar). */
export function buttonClass(
  variant: ButtonVariant = 'gold',
  size: ButtonSize = 'md',
  extra?: string,
) {
  return cx(
    'inline-flex shrink-0 items-center justify-center font-display leading-none tracking-[1px] uppercase no-callout',
    'shadow-[0_var(--d)_0_var(--sh)] transition-[transform,box-shadow] duration-75',
    'active:translate-y-[calc(var(--d)-2px)] active:shadow-[0_2px_0_var(--sh)]',
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0',
    VARIANT[variant],
    SIZE[size],
    extra,
  )
}

interface CommonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: IconName
  iconRight?: IconName
  /** Mostra só o ícone; `label` vira o aria-label. */
  iconOnly?: boolean
  label?: string
  children?: ReactNode
  /** Toca o clique ao apertar (padrão: sim). */
  sound?: boolean
}

export type ButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement>

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant,
    size,
    icon,
    iconRight,
    iconOnly,
    label,
    children,
    className,
    sound = true,
    onClick,
    type,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      className={buttonClass(variant, size, cx(iconOnly && 'px-0', className))}
      aria-label={iconOnly ? label : rest['aria-label']}
      onClick={(e) => {
        if (sound) audio.play('click')
        onClick?.(e)
      }}
      {...rest}
    >
      {icon && <Icon name={icon} />}
      {!iconOnly && (children ?? label)}
      {iconRight && <Icon name={iconRight} />}
    </button>
  )
})

export type ButtonLinkProps = CommonProps & LinkProps

export function ButtonLink({
  variant,
  size,
  icon,
  iconRight,
  iconOnly,
  label,
  children,
  className,
  sound = true,
  onClick,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link
      className={buttonClass(variant, size, cx(iconOnly && 'px-0', className))}
      aria-label={iconOnly ? label : undefined}
      onClick={(e) => {
        if (sound) audio.play('click')
        onClick?.(e)
      }}
      {...rest}
    >
      {icon && <Icon name={icon} />}
      {!iconOnly && (children ?? label)}
      {iconRight && <Icon name={iconRight} />}
    </Link>
  )
}
