import { create } from 'zustand'
import { plain } from './format'

interface AnnouncerStore {
  polite: string
  assertive: string
  announce: (message: string, priority?: 'polite' | 'assertive') => void
}

/** Fila de anúncios para leitores de tela (eventos importantes: fase concluída, erro). */
export const useAnnouncer = create<AnnouncerStore>((set) => ({
  polite: '',
  assertive: '',
  announce: (message, priority = 'polite') => {
    const text = plain(message)
    // Limpa antes para o mesmo texto ser anunciado de novo.
    set({ [priority]: '' } as Partial<AnnouncerStore>)
    requestAnimationFrame(() => set({ [priority]: text } as Partial<AnnouncerStore>))
  },
}))

export const announce = (message: string, priority?: 'polite' | 'assertive') =>
  useAnnouncer.getState().announce(message, priority)

export function Announcer() {
  const polite = useAnnouncer((s) => s.polite)
  const assertive = useAnnouncer((s) => s.assertive)
  return (
    <>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {polite}
      </div>
      <div className="sr-only" role="alert" aria-live="assertive" aria-atomic="true">
        {assertive}
      </div>
    </>
  )
}
