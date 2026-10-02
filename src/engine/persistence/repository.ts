import type { Progress, Settings } from './progress'

/**
 * Camada de persistência. Os jogos e o shell só conhecem esta interface, então
 * dá para trocar o localStorage por Supabase (contas, ranking) sem mexer neles.
 * É assíncrona de propósito: um backend remoto também cabe aqui.
 */
export interface ProgressRepository {
  loadProgress(): Promise<Progress>
  saveProgress(progress: Progress): Promise<void>
  loadSettings(): Promise<Settings>
  saveSettings(settings: Settings): Promise<void>
  clear(): Promise<void>
}
