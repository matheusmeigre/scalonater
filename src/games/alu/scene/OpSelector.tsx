import { Button } from '@/ui/Button'
import { UI } from '../content'
import type { AluOp } from '../phases'

/**
 * Seletor "Soma/AND/OR" da Fase 4 de `alu`, extraído de `AluScene.tsx` como
 * componente isolado do modo `manual`/`circuit` e do loop de tempo (ver
 * `docs/design/clique-ao-pixel.md`, "Pedidos à base" (3)). `computeAluOp`
 * (a função pura em `logic/rules.ts`) já é reusável direto; este componente
 * cobre só a parte visual do seletor.
 */
export const OP_LABEL: Record<AluOp, string> = {
  add: UI.select.add,
  and: UI.select.and,
  or: UI.select.or,
}

export interface OpSelectorProps {
  value: AluOp | null
  onChange: (op: AluOp) => void
  /** Resultado já formatado (ex.: `computeAluOp` + `formatBinary`), ou omitido. */
  result?: string | null
  className?: string
}

export function OpSelector({ value, onChange, result, className }: OpSelectorProps) {
  return (
    <div className={className}>
      <div className="alu-select-ops" role="group" aria-label={UI.select.title}>
        {(['add', 'and', 'or'] as const).map((op) => (
          <Button
            key={op}
            variant={value === op ? 'cyan' : 'ghost'}
            size="md"
            data-select-op={op}
            aria-pressed={value === op}
            onClick={() => onChange(op)}
          >
            {OP_LABEL[op]}
          </Button>
        ))}
      </div>
      {result != null && (
        <p className="alu-select-preview" data-preview>
          {'= '}
          {result}
        </p>
      )}
    </div>
  )
}
