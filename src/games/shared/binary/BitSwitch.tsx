import { forwardRef } from 'react'
import { cx } from '@/ui/format'
import './binary.css'

export interface BitSwitchProps {
  /** 0 ou 1. */
  value: 0 | 1
  /** Valor decimal da casa, exibido abaixo quando `showPlaceValue` é true. */
  placeValue?: number
  showPlaceValue?: boolean
  /** Rótulo acessível completo, ex. "bit 3 de 8, valor 8, ligado". */
  label: string
  disabled?: boolean
  onToggle: () => void
}

/** Lâmpada: nunca é só a cor que diz o estado (também o traço e o "0"/"1" no botão). */
function Bulb({ on }: { on: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="bit-switch-bulb"
      aria-hidden="true"
      focusable="false"
      fill={on ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18.5h6M10 21.5h4M12 2.5a6.3 6.3 0 0 0-3.6 11.4c.5.4.9 1 .9 1.7v1.4h5.4v-1.4c0-.7.4-1.3.9-1.7A6.3 6.3 0 0 0 12 2.5z" />
    </svg>
  )
}

/**
 * Interruptor acessível (README/design doc `bits`): `role="switch"`,
 * `aria-checked`, alvo de toque mínimo 44×44px, foco visível, ativa com
 * Enter/Espaço (comportamento nativo de `<button>`). O estado nunca é só
 * cor: tem também o ícone da lâmpada e o texto "0"/"1".
 */
export const BitSwitch = forwardRef<HTMLButtonElement, BitSwitchProps>(function BitSwitch(
  { value, placeValue, showPlaceValue, label, disabled, onToggle },
  ref,
) {
  const on = value === 1
  return (
    <div className="bit-switch-wrap">
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        disabled={disabled}
        onClick={onToggle}
        className={cx('bit-switch', on && 'bit-switch--on')}
      >
        <Bulb on={on} />
        <span className="bit-switch-value" aria-hidden="true">
          {value}
        </span>
      </button>
      {showPlaceValue && placeValue !== undefined && (
        <span className="bit-switch-place" aria-hidden="true">
          {placeValue}
        </span>
      )}
    </div>
  )
})
