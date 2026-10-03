import type { ComboState } from '@/engine/scoring/scoring'
import type { StorageDevice, StoragePhase } from '../phases'

/** Marca de bloco reservado por um "arquivo do sistema" fixo, não removível. */
export const SYSTEM_FILE = '__system__'

export interface FileEntry {
  id: string
  sizeBlocks: number
  /** Blocos ocupados, na ordem em que foram escolhidos (pode ser fragmentado). */
  blocks: number[]
}

export type StorageEvent =
  | { type: 'allocated'; fileId: string }
  | { type: 'fragmented'; fileId: string; chunks: number[][] }
  | { type: 'no-space'; fileId: string }
  | { type: 'freed'; fileId: string }
  | { type: 'defragmented' }
  | { type: 'won' }
  | { type: 'lost'; reason: 'space' | 'time' }

export interface StorageState {
  phase: StoragePhase
  diskBlocks: number
  /** `null` = livre; `SYSTEM_FILE` = arquivo de sistema fixo; senão, o id do arquivo. */
  disk: (string | null)[]
  files: Record<string, FileEntry>
  /** Ordem de criação dos arquivos ainda ativos (para a desfragmentação). */
  createdOrder: string[]
  /** Próxima operação a cumprir, em `phase.operations`. */
  opIndex: number
  device: StorageDevice
  totalTime: number
  defragUsed: number
  noSpaceCount: number
  scoring: ComboState
  status: 'playing' | 'won' | 'lost'
  lostReason: 'space' | 'time' | null
  /** Eventos gerados pela última ação. A cena consome e descarta. */
  events: StorageEvent[]
}
