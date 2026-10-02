import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { audio, installAudioUnlock } from '@/engine/audio/audioEngine'
import { useProgress } from '@/engine/store/progressStore'
import { useSettings } from '@/engine/store/settingsStore'
import { App } from '@/shell/App'
import { installPwaPromptCapture } from '@/shell/session'
import './styles.css'

async function boot() {
  installPwaPromptCapture()
  installAudioUnlock()
  await Promise.all([useProgress.getState().hydrate(), useSettings.getState().hydrate()])

  // Ajustes → áudio e animações (agora e a cada mudança).
  const applySettings = () => {
    const s = useSettings.getState()
    audio.setPrefs({ muted: s.muted, music: s.music, sfx: s.sfx })
    document.documentElement.classList.toggle('reduce-motion', s.reduceMotion)
  }
  applySettings()
  useSettings.subscribe(applySettings)

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void boot()
