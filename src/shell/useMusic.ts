import { useEffect } from 'react'
import { audio, type MusicTrack } from '@/engine/audio/audioEngine'

/** Pede a trilha da tela atual. A troca entre telas é feita com fade. */
export function useMusic(track: MusicTrack | null) {
  useEffect(() => {
    audio.music(track)
  }, [track])
}
