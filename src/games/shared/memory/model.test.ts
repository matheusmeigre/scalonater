import { describe, expect, it } from 'vitest'
import { createMemory, eraseAll, isValidAddress, readMemory, writeMemory } from './model'

describe('createMemory', () => {
  it('começa toda vazia, com o tamanho pedido', () => {
    const s = createMemory(4)
    expect(s.size).toBe(4)
    expect(s.cells).toHaveLength(4)
    expect(s.cells.every((c) => c.value === null)).toBe(true)
    expect(s.cells.map((c) => c.address)).toEqual([0, 1, 2, 3])
  })
})

describe('isValidAddress', () => {
  const s = createMemory(4)
  it('aceita endereços dentro da faixa', () => {
    expect(isValidAddress(s, 0)).toBe(true)
    expect(isValidAddress(s, 3)).toBe(true)
  })
  it('rejeita fora da faixa ou não inteiro', () => {
    expect(isValidAddress(s, -1)).toBe(false)
    expect(isValidAddress(s, 4)).toBe(false)
    expect(isValidAddress(s, 1.5)).toBe(false)
  })
})

describe('writeMemory + readMemory', () => {
  it('escrever e depois ler devolve o valor escrito', () => {
    const s0 = createMemory(4)
    const { state: s1, event: writeEvent } = writeMemory(s0, 2, 42)
    expect(writeEvent).toEqual({ type: 'write', address: 2, value: 42, overwritten: null })
    const { event: readEvent } = readMemory(s1, 2)
    expect(readEvent).toEqual({ type: 'read', address: 2, value: 42 })
  })

  it('escrever numa gaveta ocupada reporta o valor antigo em overwritten', () => {
    const s0 = createMemory(4)
    const { state: s1 } = writeMemory(s0, 1, 7)
    const { event } = writeMemory(s1, 1, 9)
    expect(event).toEqual({ type: 'write', address: 1, value: 9, overwritten: 7 })
  })

  it('não altera o estado e não lança erro com endereço inválido', () => {
    const s0 = createMemory(4)
    const writeResult = writeMemory(s0, 99, 1)
    expect(writeResult.state).toBe(s0)
    expect(writeResult.event).toEqual({ type: 'write', address: 99, value: 1, overwritten: null })

    const readResult = readMemory(s0, -1)
    expect(readResult.state).toBe(s0)
    expect(readResult.event).toEqual({ type: 'read', address: -1, value: null })
  })
})

describe('eraseAll', () => {
  it('zera todas as células e preserva size', () => {
    let s = createMemory(4)
    s = writeMemory(s, 0, 1).state
    s = writeMemory(s, 1, 2).state
    s = writeMemory(s, 3, 3).state
    const { state: erased, event } = eraseAll(s)
    expect(event).toEqual({ type: 'erase-all' })
    expect(erased.size).toBe(4)
    expect(erased.cells.every((c) => c.value === null)).toBe(true)
  })
})
