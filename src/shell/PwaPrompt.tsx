import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { SHELL } from '@/content/shell'
import { announce } from '@/ui/Announcer'
import { Button } from '@/ui/Button'

/**
 * Registra o service worker. Quando há versão nova, pergunta antes de recarregar
 * (nunca no meio de uma partida sem o jogador pedir).
 */
export function PwaPrompt() {
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({ immediate: true })

  useEffect(() => {
    if (!offlineReady) return
    announce(SHELL.settings.offlineReady)
    const t = window.setTimeout(() => setOfflineReady(false), 4000)
    return () => window.clearTimeout(t)
  }, [offlineReady, setOfflineReady])

  if (!needRefresh) return null
  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md items-center gap-3 rounded-lg border-2 border-cyan bg-panel p-3 shadow-card-cyan"
    >
      <p className="m-0 flex-1 text-[15px]">{SHELL.update.ready}</p>
      <Button variant="cyan" size="sm" onClick={() => void updateServiceWorker(true)}>
        {SHELL.update.reload}
      </Button>
    </div>
  )
}
