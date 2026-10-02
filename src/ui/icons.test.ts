import { describe, expect, it } from 'vitest'
import { isIconName, registerIcons } from './icons'

describe('registerIcons', () => {
  it('ícones embutidos já são reconhecidos', () => {
    expect(isIconName('check')).toBe(true)
    expect(isIconName('heart')).toBe(true)
  })

  it('ícone desconhecido não é reconhecido antes de registrado', () => {
    expect(isIconName('minigame-exemplo-xyz')).toBe(false)
  })

  it('ícone extra passa a ser reconhecido depois de registrado', () => {
    registerIcons({ 'minigame-exemplo-xyz': { node: null, filled: true } })
    expect(isIconName('minigame-exemplo-xyz')).toBe(true)
  })
})
