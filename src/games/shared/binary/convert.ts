/**
 * Conversões binárias puras, compartilhadas por qualquer estação que precise
 * de números binários (Bits, e no futuro Memória e ULA). Sem dependência de
 * React: só matemática. Nunca usa operadores bit a bit (`<<`/`>>`), que em
 * JavaScript truncam em 32 bits — `toBits`/`fromBits` funcionam para qualquer
 * `bitCount`, incluindo os 64 bits da grade de imagem da Fase 5 do Bits.
 */

/** Converte um inteiro não-negativo para um array de bits (MSB primeiro). */
export function toBits(value: number, bitCount: number): readonly (0 | 1)[] {
  const bits: (0 | 1)[] = new Array(bitCount)
  let v = Math.max(0, Math.floor(value))
  for (let i = bitCount - 1; i >= 0; i--) {
    bits[i] = (v % 2 === 1 ? 1 : 0) as 0 | 1
    v = Math.floor(v / 2)
  }
  return bits
}

/** Converte um array de bits (MSB primeiro) para o inteiro que ele representa. */
export function fromBits(bits: readonly (0 | 1)[]): number {
  return bits.reduce((acc: number, b) => acc * 2 + b, 0)
}

/** Valor decimal da casa `index` (0 = bit mais significativo) numa fileira de `bitCount` bits. */
export function placeValue(index: number, bitCount: number): number {
  return 2 ** (bitCount - 1 - index)
}

/** Formata um número em binário com espaçamento a cada 4 bits ("1011 0110"). */
export function formatBinary(value: number, bitCount: number): string {
  const digits = toBits(value, bitCount).join('')
  // Agrupa de 4 em 4 a partir da esquerda (bitCount é sempre múltiplo de 4
  // nos jogos que usam esta função: 4, 8… bits).
  const groups: string[] = []
  for (let i = 0; i < digits.length; i += 4) groups.push(digits.slice(i, i + 4))
  return groups.join(' ')
}

/** Quantas posições diferem entre dois arrays de bits do mesmo tamanho. */
export function hammingDistance(
  a: readonly (0 | 1)[],
  b: readonly (0 | 1)[],
): number {
  let n = 0
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++
  return n
}

/** Quantos bits estão ligados (população de 1s). */
export function popCount(bits: readonly (0 | 1)[]): number {
  return bits.reduce((acc: number, b) => acc + b, 0)
}
