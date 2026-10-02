import { useId } from 'react'
import { SHELL } from '@/content/shell'
import { audio } from '@/engine/audio/audioEngine'
import { cx } from './format'

/** Interruptor liga/desliga com rótulo e texto de apoio. Linha inteira é clicável (≥44px). */
export function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (next: boolean) => void
}) {
  const hintId = useId()
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-describedby={hint ? hintId : undefined}
      onClick={() => {
        audio.play(checked ? 'deselect' : 'select')
        onChange(!checked)
      }}
      className="flex min-h-14 w-full items-center gap-4 rounded-md border-2 border-line bg-panel-raised px-4 py-2.5 text-left"
    >
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{label}</span>
        {hint && (
          <span id={hintId} className="block text-sm leading-snug text-muted">
            {hint}
          </span>
        )}
      </span>
      <span className="sr-only">{checked ? SHELL.settings.on : SHELL.settings.off}</span>
      <span
        aria-hidden="true"
        className={cx(
          'relative h-8 w-14 flex-none rounded-full border-2 transition-colors',
          checked ? 'border-mint bg-tint-mint' : 'border-line-strong bg-bg',
        )}
      >
        <span
          className={cx(
            'absolute top-1/2 left-1 size-5 -translate-y-1/2 rounded-full transition-transform',
            checked ? 'translate-x-6 bg-mint' : 'bg-dim',
          )}
        />
      </span>
    </button>
  )
}
