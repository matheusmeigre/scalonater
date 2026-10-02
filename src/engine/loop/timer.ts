/** Contagem regressiva pura. */
export interface CountdownStep {
  remaining: number
  /** Segundo inteiro que acabou de ser cruzado (para o "tic" final), ou null. */
  crossedSecond: number | null
}

export function countdown(remaining: number, dt: number): CountdownStep {
  const before = Math.ceil(remaining)
  const next = Math.max(0, remaining - dt)
  const after = Math.ceil(next)
  return { remaining: next, crossedSecond: after < before ? after : null }
}

/** Formata segundos restantes para o HUD (ex.: 45, 9). */
export function displaySeconds(remaining: number): number {
  return Math.max(0, Math.ceil(remaining))
}
