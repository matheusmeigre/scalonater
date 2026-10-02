import type { ReactNode } from 'react'
import { SHELL } from '@/content/shell'
import { formatScore } from '@/engine/scoring/scoring'
import { ComboChip } from './Pill'
import { Label, Panel } from './Panel'
import { Pips, Track } from './Meter'
import { Icon } from './icons'
import { cx, fill } from './format'

/** Selo dourado com o número da fase. */
export function LevelBadge({ kicker, value }: { kicker: string; value: ReactNode }) {
  const long = typeof value === 'string' && value.length > 2
  return (
    <div className="flex size-[42px] flex-none flex-col items-center justify-center rounded-[11px] bg-gold text-on-accent shadow-[0_3px_0_var(--color-gold-depth)] roomy:size-16 roomy:rounded-[16px] roomy:shadow-[0_5px_0_var(--color-gold-depth)]">
      <small className="text-[8px] leading-[1.1] font-bold tracking-[1px] roomy:text-[11px] roomy:tracking-[1.5px]">
        {kicker}
      </small>
      <b
        className={cx(
          'font-display leading-none font-normal',
          long ? 'text-xs roomy:text-[19px]' : 'text-xl roomy:text-[30px]',
        )}
      >
        {value}
      </b>
    </div>
  )
}

export function HudPanel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <Panel
      className={cx(
        'flex min-w-0 flex-col justify-center gap-1 rounded-[12px] px-[9px] py-1.5 roomy:gap-2 roomy:rounded-lg roomy:px-[18px] roomy:py-2.5',
        className,
      )}
    >
      {children}
    </Panel>
  )
}

const bigNumber = 'font-display text-xl leading-none roomy:text-[28px] lg:text-[34px]'

export function TimeStat({
  remaining,
  total,
  untimed,
}: {
  remaining: number
  total: number
  untimed: boolean
}) {
  const low = !untimed && remaining < 10
  return (
    <HudPanel>
      <div className="flex items-center justify-between gap-2">
        <Label>
          <Icon name="clock" className="hidden size-[18px] roomy:block" />
          {SHELL.hud.time}
        </Label>
        {untimed ? (
          <b className={cx(bigNumber, 'flex items-center gap-1 text-mint')}>
            <Icon name="infinity" className="size-5 roomy:size-7" />
            <span className="text-xs tracking-[1px] uppercase roomy:text-base">
              {SHELL.hud.untimed}
            </span>
          </b>
        ) : (
          <b className={cx(bigNumber, low && 'text-danger')}>
            {Math.max(0, Math.ceil(remaining))}
            <i className="text-xs text-muted not-italic roomy:text-lg">{SHELL.hud.seconds}</i>
          </b>
        )}
      </div>
      <Track
        value={untimed ? 1 : total ? remaining / total : 0}
        tone={untimed ? 'mint' : low ? 'danger' : 'cyan'}
      />
    </HudPanel>
  )
}

export function TasksStat({ done, goal }: { done: number; goal: number }) {
  return (
    <HudPanel>
      <div className="flex items-center justify-between gap-2">
        <Label>{SHELL.hud.tasks}</Label>
        <span className="text-xs font-bold tracking-[1px] text-gold roomy:text-sm roomy:tracking-[2px]">
          {done}/{goal}
        </span>
      </div>
      <Pips total={goal} done={done} />
    </HudPanel>
  )
}

export function ScoreStat({ score, combo }: { score: number; combo: number }) {
  return (
    <HudPanel>
      <div className="flex items-center justify-between gap-1 roomy:gap-3">
        <Label className="compact:tracking-[0.5px]">{SHELL.hud.score}</Label>
        <ComboChip hot={combo >= 2} label={SHELL.hud.combo}>
          {fill(SHELL.hud.comboValue, { n: Math.max(1, combo) })}
        </ComboChip>
      </div>
      <b className={cx(bigNumber, 'tracking-[0] roomy:tracking-[2px]')}>{formatScore(score)}</b>
    </HudPanel>
  )
}

export function LivesStat({
  hearts,
  max,
  className,
}: {
  hearts: number
  max: number
  className?: string
}) {
  const n = Math.max(0, hearts)
  return (
    <HudPanel className={cx('items-center', className)}>
      <Label>{SHELL.hud.lives}</Label>
      <div
        role="img"
        aria-label={fill(SHELL.a11y.hearts, { n, max })}
        className="flex gap-[3px] roomy:gap-[5px]"
      >
        {Array.from({ length: max }, (_, i) => (
          <Icon
            key={i}
            name="heart"
            className={cx(
              'size-[17px] roomy:size-[26px]',
              i < n ? 'text-danger' : 'text-line-strong',
            )}
          />
        ))}
      </div>
    </HudPanel>
  )
}

/** Corações em linha, sem painel (para caber no painel da fase no celular). */
export function HeartsInline({
  hearts,
  max,
  className,
}: {
  hearts: number
  max: number
  className?: string
}) {
  const n = Math.max(0, hearts)
  return (
    <span
      role="img"
      aria-label={fill(SHELL.a11y.hearts, { n, max })}
      className={cx('inline-flex gap-0.5', className)}
    >
      {Array.from({ length: max }, (_, i) => (
        <Icon
          key={i}
          name="heart"
          className={cx('size-[15px]', i < n ? 'text-danger' : 'text-line-strong')}
        />
      ))}
    </span>
  )
}
