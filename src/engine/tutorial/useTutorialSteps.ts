import { useCallback, useState } from 'react'

/** Uma etapa do tutorial guiado: o que a faz avançar para a próxima. */
export interface TutorialStepDef<Trigger extends string = string> {
  advanceOn: Trigger
}

/**
 * Regra de "pular adiante" do tutorial guiado: dado o gatilho de um evento do
 * jogo, acha a primeira etapa a partir da atual (inclusive) cujo `advanceOn`
 * combina, e avança para a etapa seguinte a ela. Se o jogador adiantar uma
 * etapa (ex.: já soltou a peça antes de selecioná-la), o tutorial pula direto
 * para a etapa certa em vez de travar esperando o gatilho da etapa atual.
 * Sem combinação, devolve o índice atual (nenhum avanço).
 */
export function advanceTutorialStep<Trigger extends string>(
  steps: readonly TutorialStepDef<Trigger>[],
  current: number,
  trigger: Trigger | null,
): number {
  if (trigger === null || current >= steps.length) return current
  const j = steps.findIndex((s, k) => k >= current && s.advanceOn === trigger)
  return j === -1 ? current : j + 1
}

export interface UseTutorialStepsResult {
  /** Índice da etapa atual (`steps.length` quando o tutorial terminou). */
  step: number
  /** Etapa atual, ou `undefined` quando o tutorial já terminou. */
  current: TutorialStepDef | undefined
  done: boolean
  /** Processa o gatilho de um evento do jogo, avançando se for o caso. */
  advance: (trigger: string | null) => void
  reset: () => void
}

/** Estável entre renders: evita o "pular adiante" reiniciar em loop quando o
 * chamador passa `undefined` (ex.: `phase.tutorial`, fase sem tutorial). */
const NO_STEPS: readonly TutorialStepDef<string>[] = []

/**
 * Tutorial guiado como dado: cada jogo descreve os passos (`steps`) e chama
 * `advance(trigger)` a cada evento relevante da própria lógica. Jogos que já
 * guardam o progresso do tutorial no próprio estado (como o Núcleos, numa
 * store Zustand) podem usar só `advanceTutorialStep` diretamente; este hook é
 * para o caso comum em que o React mesmo basta.
 *
 * `steps` pode ser `undefined` (fase sem tutorial guiado) sem risco de loop:
 * internamente cai numa lista vazia estável. Se o chamador mesmo passar uma
 * lista definida, ela deve manter a mesma referência entre renders enquanto
 * representar a mesma fase (ex.: vinda direto de `phases.ts`, não recriada
 * inline a cada render).
 */
export function useTutorialSteps<Trigger extends string>(
  steps: readonly TutorialStepDef<Trigger>[] | undefined,
): UseTutorialStepsResult {
  const effectiveSteps = steps ?? (NO_STEPS as readonly TutorialStepDef<Trigger>[])
  const [step, setStep] = useState(0)
  // Reinicia quando a lista de etapas muda (nova fase, novo recomeço). Ajustar o
  // estado durante a renderização evita um re-render extra de um useEffect.
  const [seenSteps, setSeenSteps] = useState(effectiveSteps)
  if (seenSteps !== effectiveSteps) {
    setSeenSteps(effectiveSteps)
    setStep(0)
  }

  const advance = useCallback(
    (trigger: string | null) => {
      setStep((s) => advanceTutorialStep(effectiveSteps, s, trigger as Trigger | null))
    },
    [effectiveSteps],
  )
  const reset = useCallback(() => setStep(0), [])

  return { step, current: effectiveSteps[step], done: step >= effectiveSteps.length, advance, reset }
}
