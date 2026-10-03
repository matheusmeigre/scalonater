import { useRef } from 'react'
import { placeValue } from './convert'
import { BitSwitch } from './BitSwitch'

export interface BitRowProps {
  bits: readonly (0 | 1)[]
  showPlaceValues?: boolean
  disabled?: boolean
  onChange: (index: number, next: 0 | 1) => void
  /** Prefixo para os rótulos acessíveis de cada bit, ex. "Interruptor". */
  labelPrefix?: string
}

/**
 * Fileira de `BitSwitch` com gerenciamento de foco por teclado: `Tab` segue
 * a ordem natural (esquerda = bit mais significativo), e as setas movem o
 * foco entre interruptores sem alternar o estado (design doc `bits`).
 */
export function BitRow({
  bits,
  showPlaceValues = false,
  disabled = false,
  onChange,
  labelPrefix = 'Interruptor',
}: BitRowProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      refs.current[(i + 1) % bits.length]?.focus()
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      refs.current[(i - 1 + bits.length) % bits.length]?.focus()
    }
  }

  return (
    <div className="bit-row" role="group" aria-label={`${labelPrefix}es`}>
      {bits.map((b, i) => {
        const pv = placeValue(i, bits.length)
        const label = `${labelPrefix} ${i + 1} de ${bits.length}, valor ${pv}, ${
          b === 1 ? 'ligado' : 'desligado'
        }`
        return (
          <div
            key={i}
            className="bit-row-item"
            data-bit={i}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            <BitSwitch
              ref={(el) => {
                refs.current[i] = el
              }}
              value={b}
              placeValue={pv}
              showPlaceValue={showPlaceValues}
              disabled={disabled}
              label={label}
              onToggle={() => onChange(i, b === 1 ? 0 : 1)}
            />
          </div>
        )
      })}
    </div>
  )
}
