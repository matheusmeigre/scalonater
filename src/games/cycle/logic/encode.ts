/**
 * Codificação das instruções (design doc, "Conjunto de instruções"):
 * `opcode*100 + endereço`, endereço de 0 a 99. O opcode é a posição (1-based)
 * do mnemônico em `CYCLE_OPS` — por isso `SOMA 01` é `201` (opcode 2).
 */
import type { CycleInstruction } from './model'

export const CYCLE_OPS = ['CARREGA', 'SOMA', 'GUARDA', 'PULA', 'PULASZ'] as const
export type CycleOp = (typeof CYCLE_OPS)[number]

export function encodeInstruction(instr: CycleInstruction): number {
  const opcode = CYCLE_OPS.indexOf(instr.op) + 1
  return opcode * 100 + instr.address
}

/** Decodifica um número conhecido por já vir de `encodeInstruction`. */
export function decodeInstruction(code: number): CycleInstruction {
  const opcode = Math.floor(code / 100)
  const address = code % 100
  const op = CYCLE_OPS[opcode - 1]
  if (!op) throw new Error(`Código de instrução inválido: ${code}`)
  return { op, address }
}

/**
 * Decodifica o conteúdo de uma gaveta só se ele for uma instrução válida.
 * Dados puros (não instruções) guardados pelo próprio programa — contadores,
 * operandos — ficam sempre abaixo de 100 (opcode 0, fora do intervalo
 * 1..`CYCLE_OPS.length`), então nunca são confundidos com uma instrução.
 * Usado pelo `renderValue` da estante e por `fetchInstruction`.
 */
export function decodeCellValue(value: number | null): CycleInstruction | null {
  if (value === null) return null
  const opcode = Math.floor(value / 100)
  if (opcode < 1 || opcode > CYCLE_OPS.length) return null
  return decodeInstruction(value)
}

/** `"SOMA 01"` — como o design doc pede para `renderValue`. */
export function formatInstruction(instr: CycleInstruction): string {
  return `${instr.op} ${String(instr.address).padStart(2, '0')}`
}
