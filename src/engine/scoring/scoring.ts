/** Regras de pontuação compartilhadas: pontos, combo e estrelas. */

export type StarCount = 0 | 1 | 2 | 3

export interface ComboState {
  score: number
  combo: number
  maxCombo: number
}

export function emptyCombo(): ComboState {
  return { score: 0, combo: 0, maxCombo: 0 }
}

/** Soma pontos sem mexer no combo. */
export function addPoints(s: ComboState, points: number): ComboState {
  return { ...s, score: s.score + Math.max(0, Math.round(points)) }
}

/**
 * Registra um acerto que conta para o combo. O bônus cresce com a sequência:
 * `base + (combo > 1 ? combo * perStep : 0)`.
 */
export function registerHit(s: ComboState, base: number, perStep: number): ComboState {
  const combo = s.combo + 1
  const bonus = combo > 1 ? combo * perStep : 0
  return { score: s.score + base + bonus, combo, maxCombo: Math.max(s.maxCombo, combo) }
}

export function breakCombo(s: ComboState): ComboState {
  return s.combo === 0 ? s : { ...s, combo: 0 }
}

/**
 * Converte uma métrica normalizada (0..1, quanto maior melhor) em estrelas.
 * `thresholds` = [mínimo para 2 estrelas, mínimo para 3 estrelas].
 * Quem vence sempre leva pelo menos 1 estrela.
 */
export function starsFor(value: number, thresholds: readonly [number, number]): StarCount {
  const [two, three] = thresholds
  if (value >= three) return 3
  if (value >= two) return 2
  return 1
}

export function formatScore(score: number, digits = 5): string {
  return String(Math.max(0, Math.round(score))).padStart(digits, '0')
}
