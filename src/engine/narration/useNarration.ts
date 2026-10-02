import { useCallback, useState } from 'react'
import type { KernelMood } from '@/ui/Kernel'
import { announce } from '@/ui/Announcer'

type AriaPoliteness = 'polite' | 'assertive'

export interface Narration {
  text: string
  mood: KernelMood
}

/** Segundos que uma fala passageira (reação a um evento) fica antes de voltar à instrução. */
export const DEFAULT_TRANSIENT_SECONDS = 4

export interface NarrationState {
  narration: Narration
  /** Tempo de jogo (`elapsed`) em que a fala volta à instrução do tutorial. `null` = não volta. */
  revertAt: number | null
}

/**
 * Fala passageira: reage a um evento por alguns segundos e depois volta para
 * `instruction` (a fala "parada", geralmente a etapa atual do tutorial).
 * `hasInstruction` decide se existe algo para voltar (fora do tutorial, a
 * fala simplesmente fica).
 */
export function say(
  text: string,
  mood: KernelMood,
  elapsed: number,
  hasInstruction: boolean,
  transientSeconds = DEFAULT_TRANSIENT_SECONDS,
): NarrationState {
  return {
    narration: { text, mood },
    revertAt: hasInstruction ? elapsed + transientSeconds : null,
  }
}

/** Se chegou a hora, volta a fala para a instrução. Senão, devolve o estado como está. */
export function maybeRevertNarration(
  state: NarrationState,
  elapsed: number,
  instruction: string | null,
): NarrationState {
  if (state.revertAt === null || elapsed < state.revertAt) return state
  if (!instruction) return { ...state, revertAt: null }
  return { narration: { text: instruction, mood: 'neutral' }, revertAt: null }
}

/**
 * Hook simples para jogos que guardam a narração no próprio estado do React
 * (sem uma store separada). Expõe `say` (fala passageira, com anúncio
 * opcional para leitor de tela) e `setInstruction` (fala "parada").
 */
export function useNarration(initial: Narration) {
  const [narration, setNarration] = useState<Narration>(initial)

  const sayNow = useCallback(
    (text: string, mood: KernelMood = 'neutral', politeness?: AriaPoliteness) => {
      setNarration({ text, mood })
      if (politeness) announce(text, politeness)
    },
    [],
  )

  return { narration, say: sayNow, setInstruction: setNarration }
}
