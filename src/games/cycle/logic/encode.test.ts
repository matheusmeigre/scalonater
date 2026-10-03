import { describe, expect, it } from 'vitest'
import {
  CYCLE_OPS,
  decodeCellValue,
  decodeInstruction,
  encodeInstruction,
  formatInstruction,
} from './encode'

describe('encodeInstruction/decodeInstruction', () => {
  it('ida e volta sem perda para as 5 operações e endereços 0-99', () => {
    for (const op of CYCLE_OPS) {
      for (const address of [0, 1, 42, 99]) {
        const code = encodeInstruction({ op, address })
        expect(decodeInstruction(code)).toEqual({ op, address })
      }
    }
  })

  it('segue opcode*100+endereço (SOMA 01 → 201, do design doc)', () => {
    expect(encodeInstruction({ op: 'SOMA', address: 1 })).toBe(201)
  })
})

describe('decodeCellValue', () => {
  it('devolve null para gaveta vazia', () => {
    expect(decodeCellValue(null)).toBeNull()
  })

  it('devolve null para dado puro (abaixo de 100)', () => {
    expect(decodeCellValue(0)).toBeNull()
    expect(decodeCellValue(42)).toBeNull()
    expect(decodeCellValue(99)).toBeNull()
  })

  it('decodifica uma instrução válida', () => {
    expect(decodeCellValue(201)).toEqual({ op: 'SOMA', address: 1 })
  })
})

describe('formatInstruction', () => {
  it('formata com endereço de 2 dígitos', () => {
    expect(formatInstruction({ op: 'SOMA', address: 1 })).toBe('SOMA 01')
    expect(formatInstruction({ op: 'PULA', address: 12 })).toBe('PULA 12')
  })
})
