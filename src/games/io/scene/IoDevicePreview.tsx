import { cx } from '@/ui/format'
import { Icon } from '@/ui/icons'
import { DEVICE_COPY } from '../content'
import type { IoDeviceId } from '../phases'
import './io.css'

/**
 * Par "dispositivo piscando + botão Guardar e atender" de `IoScene`, extraído
 * como apresentação pura (sem `useIoSession`, sem fila, sem paciência) para
 * uso fora da sessão completa de `io` — ex.: a jornada "Do clique ao pixel"
 * (ver `docs/design/clique-ao-pixel.md`, "Pedidos à base").
 *
 * Todo o estado é recebido via props; o chamador decide o que significa
 * "tocando" (`ringing`) e "guardado" (`guarded`).
 */
export interface IoDevicePreviewProps {
  device: IoDeviceId
  /** O dispositivo está "tocando" (piscando), pedindo atenção. */
  ringing: boolean
  /** O contexto da tarefa principal já foi guardado nesta pilha mini. */
  guarded: boolean
  guardLabel: string
  /** Rótulo de acessibilidade do botão "atender" quando o dispositivo toca. */
  attendingLabel?: string
  onGuard?: () => void
  onAttend?: () => void
  className?: string
}

export function IoDevicePreview({
  device,
  ringing,
  guarded,
  guardLabel,
  attendingLabel,
  onGuard,
  onAttend,
  className,
}: IoDevicePreviewProps) {
  const dc = DEVICE_COPY[device]
  return (
    <div className={cx('io-field flex flex-col items-center gap-2', className)}>
      <button
        type="button"
        data-device={device}
        data-ringing={ringing}
        className={cx('io-device', ringing && 'io-device-ringing')}
        disabled={!ringing}
        onClick={onAttend}
        aria-label={ringing ? (attendingLabel ?? `${dc.name}: tocando`) : dc.name}
      >
        <Icon
          name={dc.icon}
          label={ringing ? (attendingLabel ?? `${dc.name}: tocando`) : dc.name}
          className="size-6 roomy:size-8"
        />
        <span className="io-device-name">{dc.name}</span>
      </button>
      <button
        type="button"
        data-guard-button
        className="io-btn io-btn-gold"
        disabled={guarded}
        onClick={onGuard}
      >
        {guardLabel}
      </button>
    </div>
  )
}
