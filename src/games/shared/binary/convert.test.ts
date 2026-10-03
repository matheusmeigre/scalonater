import { describe, expect, it } from 'vitest'
import { formatBinary, fromBits, hammingDistance, placeValue, popCount, toBits } from './convert'

describe('toBits / fromBits', () => {
  it('são inversas para valores fixos (8 bits)', () => {
    for (const v of [0, 1, 170, 255]) {
      expect(fromBits(toBits(v, 8))).toBe(v)
    }
  })

  it('são inversas para todo valor de 0 a 15 (4 bits)', () => {
    for (let v = 0; v <= 15; v++) {
      expect(fromBits(toBits(v, 4))).toBe(v)
    }
  })

  it('MSB primeiro', () => {
    expect(toBits(8, 4)).toEqual([1, 0, 0, 0])
    expect(toBits(1, 4)).toEqual([0, 0, 0, 1])
  })
})

describe('placeValue', () => {
  it('casa 0 (mais significativa) de 8 bits vale 128', () => {
    expect(placeValue(0, 8)).toBe(128)
  })
  it('casa 7 (menos significativa) de 8 bits vale 1', () => {
    expect(placeValue(7, 8)).toBe(1)
  })
})

describe('formatBinary', () => {
  it('agrupa de 4 em 4 bits', () => {
    expect(formatBinary(182, 8)).toBe('1011 0110')
  })
})

describe('hammingDistance', () => {
  it('conta as posições diferentes', () => {
    expect(hammingDistance([0, 0, 0, 0], [1, 0, 1, 0])).toBe(2)
    expect(hammingDistance([1, 1], [1, 1])).toBe(0)
  })
})

describe('popCount', () => {
  it('conta os bits ligados', () => {
    expect(popCount([1, 0, 1, 1])).toBe(3)
    expect(popCount([0, 0, 0, 0])).toBe(0)
  })
})
