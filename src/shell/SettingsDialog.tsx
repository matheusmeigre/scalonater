import { useState } from 'react'
import { SHELL } from '@/content/shell'
import { useProgress } from '@/engine/store/progressStore'
import { useSettings } from '@/engine/store/settingsStore'
import { DIFFICULTY_IDS } from '@/engine/types'
import { announce } from '@/ui/Announcer'
import { Button } from '@/ui/Button'
import { Modal } from '@/ui/Modal'
import { Card } from '@/ui/Panel'
import { Toggle } from '@/ui/Toggle'
import { cx } from '@/ui/format'
import { useSession } from './session'

export function SettingsDialog() {
  const open = useSession((s) => s.settingsOpen)
  const setOpen = useSession((s) => s.setSettingsOpen)
  const installPrompt = useSession((s) => s.installPrompt)
  const s = useSettings()
  const resetProgress = useProgress((p) => p.reset)
  const [confirmReset, setConfirmReset] = useState(false)
  const close = () => {
    setConfirmReset(false)
    setOpen(false)
  }

  const h3 = 'm-0 mt-5 mb-2 text-sm tracking-[2px] text-cyan uppercase'
  return (
    <Modal open={open} onDismiss={close} labelledBy="settings-title">
      <Card>
        <div className="flex items-center justify-between gap-3">
          <h2 id="settings-title" className="m-0 text-[28px] tracking-[1px] uppercase">
            {SHELL.settings.title}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            icon="close"
            iconOnly
            label={SHELL.common.close}
            onClick={close}
            autoFocus
          />
        </div>

        <h3 className={h3}>{SHELL.settings.sound}</h3>
        <div className="flex flex-col gap-2">
          <Toggle
            label={SHELL.settings.muted}
            checked={s.muted}
            onChange={(v) => s.set('muted', v)}
          />
          <Toggle
            label={SHELL.settings.music}
            checked={s.music}
            onChange={(v) => s.set('music', v)}
          />
          <Toggle label={SHELL.settings.sfx} checked={s.sfx} onChange={(v) => s.set('sfx', v)} />
        </div>

        <h3 className={h3}>{SHELL.settings.play}</h3>
        <div className="flex flex-col gap-2">
          <Toggle
            label={SHELL.settings.untimed}
            hint={SHELL.settings.untimedHint}
            checked={s.untimed}
            onChange={(v) => s.set('untimed', v)}
          />
          <Toggle
            label={SHELL.settings.reduceMotion}
            hint={SHELL.settings.reduceMotionHint}
            checked={s.reduceMotion}
            onChange={(v) => s.set('reduceMotion', v)}
          />
          <div
            role="radiogroup"
            aria-label={SHELL.settings.difficulty}
            className="grid grid-cols-3 gap-2"
          >
            {DIFFICULTY_IDS.map((d) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={s.difficulty === d}
                onClick={() => s.set('difficulty', d)}
                className={cx(
                  'min-h-12 rounded-md border-2 px-2 font-display text-sm uppercase',
                  s.difficulty === d
                    ? 'border-gold bg-panel-selected text-gold'
                    : 'border-line bg-panel-raised',
                )}
              >
                {SHELL.difficulty[d].name}
              </button>
            ))}
          </div>
        </div>

        {installPrompt && (
          <>
            <h3 className={h3}>{SHELL.settings.install}</h3>
            <p className="m-0 mb-2 text-sm text-muted">{SHELL.settings.installHint}</p>
            <Button variant="cyan" icon="download" onClick={() => void installPrompt.prompt()}>
              {SHELL.settings.install}
            </Button>
          </>
        )}

        <h3 className={h3}>{SHELL.settings.data}</h3>
        {confirmReset ? (
          <div className="flex flex-col gap-2 rounded-md border-2 border-danger p-3">
            <p className="m-0 text-sm">{SHELL.settings.resetConfirm}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="orange"
                size="sm"
                onClick={() => {
                  void resetProgress()
                  announce(SHELL.settings.resetDone, 'assertive')
                  setConfirmReset(false)
                }}
              >
                {SHELL.settings.reset}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>
                {SHELL.common.back}
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirmReset(true)}>
            {SHELL.settings.reset}
          </Button>
        )}

        <p className="m-0 mt-5 text-xs leading-snug text-muted">{SHELL.settings.credits}</p>
      </Card>
    </Modal>
  )
}
