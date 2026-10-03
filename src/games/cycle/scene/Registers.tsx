import { cx } from '@/ui/format'
import { Label } from '@/ui/Panel'
import { UI } from '../content'

export interface RegistersProps {
  pc: number
  acc: number
  /** Qual registrador acabou de mudar — dispara a animação de "pulso". */
  pulse?: 'pc' | 'acc' | null
}

function RegisterBox({
  label,
  value,
  active,
}: {
  label: string
  value: number
  active: boolean
}) {
  return (
    <div className={cx('cycle-register', active && 'is-active')}>
      <Label>{label}</Label>
      <b className="font-display text-xl leading-none roomy:text-[28px]">{value}</b>
    </div>
  )
}

/**
 * Painel de registradores (PC, ACC): "memória interna" da CPU, sem endereço
 * — por isso é um componente próprio desta estação, fora de `shared/memory`
 * (design doc, "Layout mobile e desktop").
 */
export function Registers({ pc, acc, pulse = null }: RegistersProps) {
  return (
    <div className="cycle-registers" role="group" aria-label="Registradores">
      <RegisterBox label={UI.pcLabel} value={pc} active={pulse === 'pc'} />
      <RegisterBox label={UI.accLabel} value={acc} active={pulse === 'acc'} />
    </div>
  )
}
