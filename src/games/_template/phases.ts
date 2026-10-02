import type { PhaseBase } from '@/engine/types'

/**
 * Fases como dados (README, passo 3). Cada fase estende `PhaseBase` com os
 * parâmetros do seu jogo — aqui, só uma meta (`goal`) de exemplo. A primeira
 * fase é sempre o tutorial, sem derrota. Para adicionar uma fase depois,
 * acrescente um objeto aqui e o texto dela em `content.ts`.
 */
export interface TemplatePhase extends PhaseBase {
  /** Quantos toques certos terminam a fase. */
  goal: number
}

export const PHASES: readonly TemplatePhase[] = [
  { id: 'tutorial', kind: 'tutorial', canLose: false, goal: 3 },
  { id: 'nivel-1', kind: 'level', canLose: true, goal: 5, unlocksCard: 'exemplo' },
  { id: 'nivel-2', kind: 'level', canLose: true, goal: 8 },
  { id: 'nivel-3', kind: 'level', canLose: true, goal: 12 },
] as const
