import { create } from 'zustand'
import type { RecordResult } from '@/engine/store/progressStore'
import type { PhaseOutcome, StationId } from '@/engine/types'

export interface LastResult {
  gameId: string
  phaseId: string
  outcome: PhaseOutcome
  record: RecordResult | null
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** Estado passageiro do shell (não é salvo). */
interface SessionStore {
  lastResult: LastResult | null
  settingsOpen: boolean
  /** Estação que acabou de acender: o mapa comemora ao voltar. */
  justLit: StationId | null
  installPrompt: BeforeInstallPromptEvent | null
  setLastResult: (r: LastResult | null) => void
  setSettingsOpen: (open: boolean) => void
  setJustLit: (id: StationId | null) => void
}

export const useSession = create<SessionStore>((set) => ({
  lastResult: null,
  settingsOpen: false,
  justLit: null,
  installPrompt: null,
  setLastResult: (lastResult) => set({ lastResult }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setJustLit: (justLit) => set({ justLit }),
}))

/** Guarda o convite de instalação do PWA para oferecer nos Ajustes. */
export function installPwaPromptCapture() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    useSession.setState({ installPrompt: e as BeforeInstallPromptEvent })
  })
  window.addEventListener('appinstalled', () => useSession.setState({ installPrompt: null }))
}
