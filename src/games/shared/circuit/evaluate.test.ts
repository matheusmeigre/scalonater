import { describe, expect, it } from 'vitest'
import type { Circuit } from './types'
import { evaluateCircuit, evaluateGate, truthTable, validateCircuit } from './evaluate'

describe('evaluateGate', () => {
  it('AND bate com a tabela-verdade conhecida', () => {
    expect(evaluateGate('AND', [false, false])).toBe(false)
    expect(evaluateGate('AND', [false, true])).toBe(false)
    expect(evaluateGate('AND', [true, false])).toBe(false)
    expect(evaluateGate('AND', [true, true])).toBe(true)
  })

  it('OR bate com a tabela-verdade conhecida', () => {
    expect(evaluateGate('OR', [false, false])).toBe(false)
    expect(evaluateGate('OR', [false, true])).toBe(true)
    expect(evaluateGate('OR', [true, false])).toBe(true)
    expect(evaluateGate('OR', [true, true])).toBe(true)
  })

  it('NOT inverte a única entrada', () => {
    expect(evaluateGate('NOT', [false])).toBe(true)
    expect(evaluateGate('NOT', [true])).toBe(false)
  })

  it('XOR acende quando as entradas são diferentes', () => {
    expect(evaluateGate('XOR', [false, false])).toBe(false)
    expect(evaluateGate('XOR', [false, true])).toBe(true)
    expect(evaluateGate('XOR', [true, false])).toBe(true)
    expect(evaluateGate('XOR', [true, true])).toBe(false)
  })

  it('NAND é o inverso do AND', () => {
    expect(evaluateGate('NAND', [false, false])).toBe(true)
    expect(evaluateGate('NAND', [false, true])).toBe(true)
    expect(evaluateGate('NAND', [true, false])).toBe(true)
    expect(evaluateGate('NAND', [true, true])).toBe(false)
  })

  it('NOR é o inverso do OR', () => {
    expect(evaluateGate('NOR', [false, false])).toBe(true)
    expect(evaluateGate('NOR', [false, true])).toBe(false)
    expect(evaluateGate('NOR', [true, false])).toBe(false)
    expect(evaluateGate('NOR', [true, true])).toBe(false)
  })
})

describe('evaluateCircuit', () => {
  it('avalia um AND de duas entradas', () => {
    const circuit: Circuit = [
      { kind: 'input', id: 'A', label: 'A' },
      { kind: 'input', id: 'B', label: 'B' },
      { kind: 'gate', id: 'g1', gate: 'AND', inputs: ['A', 'B'] },
      { kind: 'output', id: 'out', label: 'lâmpada', input: 'g1' },
    ]
    expect(evaluateCircuit(circuit, { A: true, B: true })).toMatchObject({ out: true })
    expect(evaluateCircuit(circuit, { A: true, B: false })).toMatchObject({ out: false })
  })

  it('lança erro para um circuito com ciclo (referência posterior)', () => {
    const circuit: Circuit = [
      { kind: 'input', id: 'A', label: 'A' },
      // g1 referencia g2, que só é declarado depois: referência "posterior".
      { kind: 'gate', id: 'g1', gate: 'NOT', inputs: ['g2'] },
      { kind: 'gate', id: 'g2', gate: 'NOT', inputs: ['g1'] },
    ]
    expect(() => evaluateCircuit(circuit, { A: true })).toThrow()
  })

  it('lança erro para referência a um nó inexistente', () => {
    const circuit: Circuit = [
      { kind: 'input', id: 'A', label: 'A' },
      { kind: 'gate', id: 'g1', gate: 'NOT', inputs: ['nao-existe'] },
    ]
    expect(() => evaluateCircuit(circuit, { A: true })).toThrow()
  })
})

describe('validateCircuit', () => {
  it('true para um circuito válido', () => {
    const circuit: Circuit = [
      { kind: 'input', id: 'A', label: 'A' },
      { kind: 'input', id: 'B', label: 'B' },
      { kind: 'gate', id: 'g1', gate: 'OR', inputs: ['A', 'B'] },
      { kind: 'output', id: 'out', label: 'lâmpada', input: 'g1' },
    ]
    expect(validateCircuit(circuit)).toBe(true)
  })

  it('false para um circuito com ciclo', () => {
    const circuit: Circuit = [
      { kind: 'input', id: 'A', label: 'A' },
      { kind: 'gate', id: 'g1', gate: 'NOT', inputs: ['g2'] },
      { kind: 'gate', id: 'g2', gate: 'NOT', inputs: ['g1'] },
    ]
    expect(validateCircuit(circuit)).toBe(false)
  })

  it('false para referência a nó inexistente', () => {
    const circuit: Circuit = [{ kind: 'gate', id: 'g1', gate: 'NOT', inputs: ['nada'] }]
    expect(validateCircuit(circuit)).toBe(false)
  })
})

describe('truthTable', () => {
  it('de "(A OR B) AND NOT(A AND B)" é idêntica à tabela do XOR, célula a célula', () => {
    const circuit: Circuit = [
      { kind: 'input', id: 'A', label: 'A' },
      { kind: 'input', id: 'B', label: 'B' },
      { kind: 'gate', id: 'orAB', gate: 'OR', inputs: ['A', 'B'] },
      { kind: 'gate', id: 'andAB', gate: 'AND', inputs: ['A', 'B'] },
      { kind: 'gate', id: 'notAnd', gate: 'NOT', inputs: ['andAB'] },
      { kind: 'gate', id: 'final', gate: 'AND', inputs: ['orAB', 'notAnd'] },
      { kind: 'output', id: 'out', label: 'lâmpada', input: 'final' },
    ]
    const rows = truthTable(circuit)
    const outputs = rows.map((r) => r[r.length - 1])
    const xor = [false, true, true, false]
    expect(outputs).toEqual(xor)
  })

  it('gera as 2^n combinações em ordem binária crescente', () => {
    const circuit: Circuit = [
      { kind: 'input', id: 'A', label: 'A' },
      { kind: 'input', id: 'B', label: 'B' },
      { kind: 'gate', id: 'g1', gate: 'AND', inputs: ['A', 'B'] },
      { kind: 'output', id: 'out', label: 'lâmpada', input: 'g1' },
    ]
    const rows = truthTable(circuit)
    expect(rows.map((r) => [r[0], r[1]])).toEqual([
      [false, false],
      [false, true],
      [true, false],
      [true, true],
    ])
  })
})
