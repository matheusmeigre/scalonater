import { useState } from 'react'
import { DiskGrid, type DiskBlockView } from './DiskGrid'

const COLUMNS = 4
const TOTAL = 8

/**
 * Demo estática de `DiskGrid`, registrada em `GameModule.preview` (ver
 * `src/engine/types.ts`). Quem precisa controlar o estado de fora (ex.: a
 * estação `pixel`) deve importar `DiskGrid` diretamente.
 */
export function DiskGridDemo({ className }: { className?: string }) {
  const [selected, setSelected] = useState<number[]>([0])
  const blocks: DiskBlockView[] = Array.from({ length: TOTAL }, (_, i) => ({
    index: i,
    state: i === 0 ? 'system' : selected.includes(i) ? 'selected' : 'free',
    label: `Bloco ${i + 1}`,
  }))
  return (
    <DiskGrid
      blocks={blocks}
      columns={COLUMNS}
      className={className}
      onBlockClick={(i) =>
        setSelected((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]))
      }
    />
  )
}
