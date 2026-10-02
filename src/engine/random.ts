/**
 * Gerador pseudoaleatório com semente (mulberry32). A lógica dos jogos guarda
 * só o número de estado, então continua pura e reproduzível nos testes.
 */
export interface Rng {
  readonly state: number
}

export function createRng(seed: number): Rng {
  return { state: seed >>> 0 }
}

/** Retorna [valor em 0..1, próximo estado]. */
export function nextRandom(rng: Rng): [number, Rng] {
  let t = (rng.state + 0x6d2b79f5) >>> 0
  const state = t
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296
  return [value, { state }]
}

/**
 * Versão "mutável" para usar dentro de um reducer que trabalha numa cópia do estado:
 * `const roll = roller(state)` e depois `roll()` quantas vezes precisar.
 */
export function roller(holder: { rng: Rng }): () => number {
  return () => {
    const [value, next] = nextRandom(holder.rng)
    holder.rng = next
    return value
  }
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 32)
}
