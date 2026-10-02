import { describe, expect, it, vi } from 'vitest'
import { recipeFor, registerSfx } from './sfx'

describe('recipeFor', () => {
  it('acha uma receita embutida', () => {
    expect(recipeFor('click')).toBeTypeOf('function')
  })

  it('não acha uma receita desconhecida', () => {
    expect(recipeFor('minigame-exemplo-xyz')).toBeUndefined()
  })

  it('acha uma receita extra depois de registrada', () => {
    const recipe = vi.fn()
    registerSfx({ 'minigame-exemplo-xyz': recipe })
    expect(recipeFor('minigame-exemplo-xyz')).toBe(recipe)
  })
})
