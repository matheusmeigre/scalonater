import type { ReactNode } from 'react'
import { SHELL } from '@/content/shell'
import { useProgress } from '@/engine/store/progressStore'
import { useSettings } from '@/engine/store/settingsStore'
import { Button, ButtonLink } from '@/ui/Button'
import { ChipLogo } from '@/ui/Kernel'
import { cx, fill } from '@/ui/format'
import { useSession } from './session'

/** Barra superior das telas fora da partida: voltar/logo, título e atalhos. */
export function TopBar({ back, title }: { back?: { to: string; label: string }; title?: string }) {
  const muted = useSettings((s) => s.muted)
  const toggle = useSettings((s) => s.toggle)
  const unseen = useProgress((s) => s.progress.unseenCards.length)
  const openSettings = useSession((s) => s.setSettingsOpen)
  return (
    <header className="flex items-center gap-2 sm:gap-3">
      {back ? (
        <ButtonLink
          to={back.to}
          variant="ghost"
          size="sm"
          icon="arrow-left"
          iconOnly
          label={back.label}
        />
      ) : (
        <ChipLogo className="size-11 flex-none sm:size-14" />
      )}
      <div className="min-w-0 flex-1">
        {title ? (
          <p className="m-0 truncate font-display text-sm tracking-[1px] text-muted uppercase sm:text-base">
            {title}
          </p>
        ) : (
          <>
            <p className="m-0 font-display text-lg leading-none tracking-[1px] uppercase sm:text-2xl">
              {SHELL.appName}
            </p>
            <p className="m-0 hidden truncate text-sm text-muted sm:block">{SHELL.appTagline}</p>
          </>
        )}
      </div>
      <div className="relative">
        <ButtonLink to="/manual" variant="ghost" size="sm" icon="book" className="sm:px-4">
          <span className="max-sm:sr-only">{SHELL.map.manual}</span>
        </ButtonLink>
        {unseen > 0 && (
          <span
            aria-label={fill(SHELL.a11y.newCards, { n: unseen })}
            className="pointer-events-none absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-gold font-display text-xs text-on-accent shadow-[0_2px_0_var(--color-gold-depth)]"
          >
            {unseen}
          </span>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        icon="settings"
        iconOnly
        label={SHELL.a11y.settings}
        onClick={() => openSettings(true)}
      />
      <Button
        variant="ghost"
        size="sm"
        icon={muted ? 'sound-off' : 'sound-on'}
        iconOnly
        label={muted ? SHELL.a11y.muteOn : SHELL.a11y.muteOff}
        aria-pressed={muted}
        onClick={() => toggle('muted')}
      />
    </header>
  )
}

/** Moldura das telas de menu: largura máxima, respiro e áreas seguras. */
export function ScreenFrame({
  children,
  className,
  wide,
}: {
  children: ReactNode
  className?: string
  wide?: boolean
}) {
  return (
    <main
      className={cx(
        'mx-auto flex min-h-dvh w-full flex-col gap-4 safe-pt safe-px pb-[max(24px,env(safe-area-inset-bottom))] sm:gap-6',
        wide ? 'max-w-[1280px]' : 'max-w-[960px]',
        className,
      )}
    >
      {children}
    </main>
  )
}
