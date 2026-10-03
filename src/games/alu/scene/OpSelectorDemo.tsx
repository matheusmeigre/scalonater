import { useState } from 'react'
import { formatBinary, fromBits } from '@/games/shared/binary'
import { computeAluOp } from '../logic/rules'
import type { AluOp } from '../phases'
import { OpSelector } from './OpSelector'

const DEMO_A = 0b101
const DEMO_B = 0b011
const DEMO_BITS = 3

/**
 * Demo estática de `OpSelector`, registrada em `GameModule.preview` (ver
 * `src/engine/types.ts`). Quem precisa controlar o estado de fora (ex.: a
 * estação `pixel`) deve importar `OpSelector` diretamente.
 */
export function OpSelectorDemo({ className }: { className?: string }) {
  const [value, setValue] = useState<AluOp | null>(null)
  const result = value ? formatBinary(fromBits(computeAluOp(DEMO_A, DEMO_B, value, DEMO_BITS).result), DEMO_BITS) : null
  return <OpSelector value={value} onChange={setValue} result={result} className={className} />
}
