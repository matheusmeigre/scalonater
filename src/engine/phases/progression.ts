import type { GameModule, PhaseBase, StationId } from '../types'
import type { GameProgress, Progress } from '../persistence/progress'

export type StationStatus = 'complete' | 'available' | 'locked' | 'soon'

export function isPhaseComplete(game: GameProgress | undefined, phaseId: string): boolean {
  return !!game?.phases[phaseId]
}

/** A primeira fase está sempre liberada; as outras exigem a anterior. */
export function isPhaseUnlocked(
  phases: readonly PhaseBase[],
  index: number,
  game: GameProgress | undefined,
): boolean {
  if (index <= 0) return true
  const prev = phases[index - 1]
  return !!prev && isPhaseComplete(game, prev.id)
}

/** Primeira fase ainda não vencida (ou a última, se todas foram). */
export function nextPhaseIndex(phases: readonly PhaseBase[], game: GameProgress | undefined) {
  const i = phases.findIndex((p) => !isPhaseComplete(game, p.id))
  return i === -1 ? phases.length - 1 : i
}

export function isGameComplete(phases: readonly PhaseBase[], game: GameProgress | undefined) {
  return phases.length > 0 && phases.every((p) => isPhaseComplete(game, p.id))
}

/**
 * Pré-requisitos efetivos de uma estação. Sem lista explícita, a estação exige
 * todas as anteriores da trilha. Pré-requisitos que ainda não existem como jogo
 * são ignorados ("linear, com exceção"), então novas estações entram sem quebrar
 * o progresso de ninguém.
 */
export function effectivePrerequisites(
  stationId: StationId,
  trail: readonly StationId[],
  implemented: ReadonlySet<StationId>,
  explicit?: readonly StationId[],
): StationId[] {
  const base = explicit ?? trail.slice(0, Math.max(0, trail.indexOf(stationId)))
  return base.filter((id) => implemented.has(id))
}

export function stationStatus(
  stationId: StationId,
  trail: readonly StationId[],
  games: ReadonlyMap<StationId, GameModule>,
  progress: Progress,
): StationStatus {
  const game = games.get(stationId)
  if (!game) return 'soon'
  if (isGameComplete(game.phases, progress.games[stationId])) return 'complete'
  const implemented = new Set(games.keys())
  const prereqs = effectivePrerequisites(stationId, trail, implemented, game.meta.prerequisites)
  const ready = prereqs.every((id) => {
    const g = games.get(id)
    return !!g && isGameComplete(g.phases, progress.games[id])
  })
  return ready ? 'available' : 'locked'
}
