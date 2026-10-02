import { describe, expect, it } from 'vitest'
import { maybeRevertNarration, say } from './useNarration'

describe('say', () => {
  it('marca o retorno à instrução quando existe uma', () => {
    const s = say('Oba!', 'happy', 10, true, 4)
    expect(s.narration).toEqual({ text: 'Oba!', mood: 'happy' })
    expect(s.revertAt).toBe(14)
  })

  it('não marca retorno fora do tutorial (sem instrução)', () => {
    const s = say('Oba!', 'happy', 10, false)
    expect(s.revertAt).toBeNull()
  })
})

describe('maybeRevertNarration', () => {
  it('mantém a fala passageira antes da hora', () => {
    const s = say('Oba!', 'happy', 10, true, 4)
    expect(maybeRevertNarration(s, 13, 'Instrução')).toBe(s)
  })

  it('volta para a instrução na hora certa', () => {
    const s = say('Oba!', 'happy', 10, true, 4)
    const r = maybeRevertNarration(s, 14, 'Instrução')
    expect(r.narration).toEqual({ text: 'Instrução', mood: 'neutral' })
    expect(r.revertAt).toBeNull()
  })

  it('sem instrução para voltar, só limpa o revertAt', () => {
    const s = say('Oba!', 'happy', 10, true, 4)
    const r = maybeRevertNarration(s, 14, null)
    expect(r.narration).toEqual(s.narration)
    expect(r.revertAt).toBeNull()
  })
})
