import type { PhaseBase } from '@/engine/types'

export type StorageDevice = 'hd' | 'ssd'

/** Operação fixa (sem sorteio) que a fase pede, na ordem. */
export interface StorageOperation {
  kind: 'save' | 'delete'
  fileId: string
  /** Só para `save`. */
  sizeBlocks?: number
}

export type StorageTutorialTrigger = 'save' | 'search'

/** Etapa guiada extra do tutorial, além das `operations` (achar o arquivo pela tabela). */
export interface StorageTutorialStep {
  id: string
  advanceOn: StorageTutorialTrigger
}

export interface StoragePhase extends PhaseBase {
  diskBlocks: number
  /** Colunas da grade no layout largo (desktop/tablet deitado). */
  columns: number
  /** Sequência fixa de operações pedidas na fase (determinística, sem sorteio). */
  operations: readonly StorageOperation[]
  /** Blocos pré-ocupados por "arquivos do sistema" fixos, para forçar fragmentação (fase 2+). */
  reservedBlocks: readonly number[]
  deviceModes: readonly StorageDevice[]
  /** Custo de tempo (unidades de pontuação) por bloco de deslocamento da cabeça, só no HD. */
  hdSeekCostPerBlock: number
  /** Custo de tempo fixo por bloco acessado, no SSD. */
  baseCostPerBlock: number
  maxTotalTime?: number
  defragAvailable: boolean
  /** Fase 4: exige ao menos 1 uso para vencer. */
  requireDefrag: boolean
  stars: { metric: 'timeLeft' | 'opsLeft'; thresholds: readonly [number, number] }
  /** Só no tutorial: etapas guiadas extras, além de completar as `operations`. */
  tutorial?: readonly StorageTutorialStep[]
}

export const PHASES: readonly StoragePhase[] = [
  {
    id: 'tutorial',
    kind: 'tutorial',
    canLose: false,
    diskBlocks: 24,
    columns: 6,
    operations: [{ kind: 'save', fileId: 'A', sizeBlocks: 3 }],
    reservedBlocks: [],
    deviceModes: ['hd'],
    hdSeekCostPerBlock: 0,
    baseCostPerBlock: 0,
    defragAvailable: false,
    requireDefrag: false,
    stars: { metric: 'opsLeft', thresholds: [1, 1] },
    unlocksCard: 'filesystem',
    tutorial: [
      { id: 'save', advanceOn: 'save' },
      { id: 'search', advanceOn: 'search' },
    ],
  },
  {
    id: 'nivel-1',
    kind: 'level',
    canLose: true,
    diskBlocks: 24,
    columns: 6,
    operations: [
      { kind: 'save', fileId: 'A', sizeBlocks: 5 },
      { kind: 'save', fileId: 'B', sizeBlocks: 4 },
      { kind: 'save', fileId: 'C', sizeBlocks: 3 },
      { kind: 'delete', fileId: 'B' },
      { kind: 'save', fileId: 'D', sizeBlocks: 4 },
      { kind: 'save', fileId: 'E', sizeBlocks: 2 },
    ],
    reservedBlocks: [],
    deviceModes: ['hd'],
    hdSeekCostPerBlock: 0,
    baseCostPerBlock: 0,
    defragAvailable: false,
    requireDefrag: false,
    stars: { metric: 'opsLeft', thresholds: [0.34, 1] },
  },
  {
    id: 'nivel-2',
    kind: 'level',
    canLose: true,
    diskBlocks: 24,
    columns: 6,
    operations: [
      { kind: 'save', fileId: 'A', sizeBlocks: 6 },
      { kind: 'save', fileId: 'B', sizeBlocks: 4 },
      { kind: 'save', fileId: 'C', sizeBlocks: 5 },
      { kind: 'delete', fileId: 'A' },
      { kind: 'save', fileId: 'D', sizeBlocks: 3 },
      { kind: 'delete', fileId: 'B' },
    ],
    // Arquivos do sistema fixos espalhados: forçam ao menos 2 fragmentações
    // nas 6 operações (ver docs/design/storage.md).
    reservedBlocks: [3, 9, 15, 20],
    deviceModes: ['hd'],
    hdSeekCostPerBlock: 0,
    baseCostPerBlock: 0,
    defragAvailable: false,
    requireDefrag: false,
    stars: { metric: 'opsLeft', thresholds: [0.34, 1] },
    unlocksCard: 'fragmentation',
  },
  {
    id: 'nivel-3',
    kind: 'level',
    canLose: true,
    diskBlocks: 24,
    columns: 6,
    operations: [
      { kind: 'save', fileId: 'A', sizeBlocks: 4 },
      { kind: 'save', fileId: 'B', sizeBlocks: 3 },
      { kind: 'delete', fileId: 'A' },
      { kind: 'save', fileId: 'C', sizeBlocks: 5 },
      { kind: 'save', fileId: 'D', sizeBlocks: 2 },
      { kind: 'delete', fileId: 'C' },
    ],
    reservedBlocks: [],
    deviceModes: ['hd', 'ssd'],
    hdSeekCostPerBlock: 5,
    baseCostPerBlock: 1,
    maxTotalTime: 150,
    defragAvailable: false,
    requireDefrag: false,
    stars: { metric: 'timeLeft', thresholds: [0.2, 0.5] },
    unlocksCard: 'hd-ssd',
  },
  {
    id: 'nivel-4',
    kind: 'level',
    canLose: true,
    diskBlocks: 24,
    columns: 6,
    operations: [
      { kind: 'save', fileId: 'A', sizeBlocks: 4 },
      { kind: 'save', fileId: 'B', sizeBlocks: 4 },
      { kind: 'save', fileId: 'C', sizeBlocks: 4 },
      { kind: 'delete', fileId: 'B' },
      { kind: 'save', fileId: 'D', sizeBlocks: 8 },
      { kind: 'delete', fileId: 'A' },
    ],
    reservedBlocks: [],
    deviceModes: ['hd'],
    hdSeekCostPerBlock: 5,
    baseCostPerBlock: 1,
    maxTotalTime: 125,
    defragAvailable: true,
    requireDefrag: true,
    stars: { metric: 'timeLeft', thresholds: [0.2, 0.5] },
  },
] as const
