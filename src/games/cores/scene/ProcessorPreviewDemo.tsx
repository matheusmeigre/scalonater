import { useState } from 'react'
import { ProcessorPreview } from './ProcessorPreview'
import type { CoreModel } from './Processor'

const DEMO_CORES: CoreModel[] = [
  {
    index: 0,
    state: 'run',
    hotWaiting: false,
    slots: [{ index: 0, core: 0, hot: false, thread: { id: 1, app: 'game', task: 0, patience: 50, progress: 40, blocks: 2, blocked: false, preferred: -1 } }],
  },
  { index: 1, state: 'free', hotWaiting: false, slots: [{ index: 1, core: 1, hot: false, thread: null }] },
]

/**
 * Demo estática de `ProcessorPreview`, registrada em `GameModule.preview`
 * (ver `src/engine/types.ts`). Quem precisa controlar o estado de fora
 * (ex.: a estação `pixel`) deve importar `ProcessorPreview` diretamente.
 */
export function ProcessorPreviewDemo({ className }: { className?: string }) {
  const [cores, setCores] = useState<CoreModel[]>(DEMO_CORES)
  return (
    <ProcessorPreview
      cores={cores}
      className={className}
      onTap={(slot) =>
        setCores((cs) =>
          cs.map((c) => ({
            ...c,
            slots: c.slots.map((s) => (s.index === slot ? { ...s, hot: !s.hot } : s)),
          })),
        )
      }
    />
  )
}
