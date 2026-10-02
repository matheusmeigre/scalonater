import { defaultSettings, emptyProgress, type Progress, type Settings } from './progress'
import type { ProgressRepository } from './repository'

/** Repositório em memória, para testes. */
export function createMemoryRepository(): ProgressRepository & {
  snapshot(): { progress: Progress; settings: Settings }
} {
  let progress = emptyProgress()
  let settings = defaultSettings()
  return {
    loadProgress: async () => structuredClone(progress),
    saveProgress: async (p) => void (progress = structuredClone(p)),
    loadSettings: async () => structuredClone(settings),
    saveSettings: async (s) => void (settings = structuredClone(s)),
    clear: async () => {
      progress = emptyProgress()
      settings = defaultSettings()
    },
    snapshot: () => ({ progress, settings }),
  }
}
