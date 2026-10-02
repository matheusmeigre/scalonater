import { sanitizeProgress, sanitizeSettings } from './progress'
import type { ProgressRepository } from './repository'

const KEYS = { progress: 'scalonater:progress', settings: 'scalonater:settings' } as const

/** Navegador em modo privado ou com armazenamento bloqueado: segue sem salvar. */
function safeStorage(): Storage | null {
  try {
    const s = window.localStorage
    const probe = '__scalonater__'
    s.setItem(probe, '1')
    s.removeItem(probe)
    return s
  } catch {
    return null
  }
}

function read(storage: Storage | null, key: string): unknown {
  if (!storage) return null
  try {
    const raw = storage.getItem(key)
    return raw ? (JSON.parse(raw) as unknown) : null
  } catch {
    return null
  }
}

function write(storage: Storage | null, key: string, value: unknown) {
  if (!storage) return
  try {
    storage.setItem(key, JSON.stringify(value))
  } catch {
    /* cota cheia ou bloqueado: o jogo continua, só não salva */
  }
}

export function createLocalStorageRepository(
  storage: Storage | null = safeStorage(),
): ProgressRepository {
  return {
    loadProgress: async () => sanitizeProgress(read(storage, KEYS.progress)),
    saveProgress: async (p) => write(storage, KEYS.progress, p),
    loadSettings: async () => sanitizeSettings(read(storage, KEYS.settings)),
    saveSettings: async (s) => write(storage, KEYS.settings, s),
    clear: async () => {
      storage?.removeItem(KEYS.progress)
      storage?.removeItem(KEYS.settings)
    },
  }
}
