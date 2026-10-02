import { describe, expect, it } from 'vitest'
import { STATION_IDS } from '@/engine/types'
import { ALL_GAMES } from './registry'

/** Junta toda string de um valor aninhado (copy, cards…), para checar que nenhuma está vazia. */
function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value)
  else if (Array.isArray(value)) for (const v of value) collectStrings(v, out)
  else if (value && typeof value === 'object')
    for (const v of Object.values(value)) collectStrings(v, out)
  return out
}

describe('registro de jogos', () => {
  it('todo id de jogo existe em STATION_IDS', () => {
    for (const game of ALL_GAMES) {
      expect(STATION_IDS, `${game.meta.id} não está em STATION_IDS`).toContain(game.meta.id)
    }
  })

  it('não há ids duplicados', () => {
    const ids = ALL_GAMES.map((g) => g.meta.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

/**
 * Contrato que todo módulo de jogo precisa cumprir (seção 3, Onda 1, item 8
 * do planejamento). Roda para todos os jogos registrados, liberados ou não.
 */
describe.each(ALL_GAMES.map((g) => [g.meta.id, g] as const))('contrato do jogo: %s', (_id, game) => {
  it('toda fase tem texto em copy.phases', () => {
    for (const phase of game.phases) {
      expect(game.copy.phases[phase.id], `fase "${phase.id}" sem copy`).toBeDefined()
    }
  })

  it('a abertura do Kernel tem no máximo 3 falas', () => {
    expect(game.copy.opening.length).toBeLessThanOrEqual(3)
    expect(game.copy.opening.length).toBeGreaterThan(0)
  })

  it('unlocksCard aponta para um card que existe', () => {
    const cardIds = new Set(game.cards.map((c) => c.id))
    for (const phase of game.phases) {
      if (phase.unlocksCard) {
        expect(cardIds, `fase "${phase.id}" aponta para card inexistente`).toContain(
          phase.unlocksCard,
        )
      }
    }
  })

  it('a primeira fase é o tutorial, sem derrota', () => {
    const first = game.phases[0]
    expect(first, 'jogo sem nenhuma fase').toBeDefined()
    expect(first?.kind).toBe('tutorial')
    expect(first?.canLose).toBe(false)
  })

  it('tem de 3 a 5 fases além do tutorial', () => {
    const levels = game.phases.filter((p) => p.kind === 'level').length
    expect(levels).toBeGreaterThanOrEqual(3)
    expect(levels).toBeLessThanOrEqual(5)
  })

  it('toda string do copy é não vazia', () => {
    const empties = collectStrings(game.copy).filter((s) => s.trim() === '')
    expect(empties.length).toBe(0)
  })

  it('tem ao menos um card de conceito', () => {
    expect(game.cards.length).toBeGreaterThan(0)
  })
})
