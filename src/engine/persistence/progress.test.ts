import { describe, expect, it } from 'vitest'
import { createLocalStorageRepository } from './localStorageRepository'
import { defaultSettings, emptyProgress, sanitizeProgress, sanitizeSettings } from './progress'

class FakeStorage implements Storage {
  private m = new Map<string, string>()
  get length() {
    return this.m.size
  }
  clear() {
    this.m.clear()
  }
  getItem(k: string) {
    return this.m.get(k) ?? null
  }
  key(i: number) {
    return [...this.m.keys()][i] ?? null
  }
  removeItem(k: string) {
    this.m.delete(k)
  }
  setItem(k: string, v: string) {
    this.m.set(k, v)
  }
}

describe('sanitizeProgress', () => {
  it('devolve progresso vazio para lixo', () => {
    expect(sanitizeProgress('x')).toEqual(emptyProgress())
    expect(sanitizeProgress(null)).toEqual(emptyProgress())
  })

  it('mantém o que é válido e corrige o resto', () => {
    const p = sanitizeProgress({
      games: {
        cores: { openingSeen: true, phases: { a: { stars: 9, bestScore: 'x' }, b: 3 } },
        bad: 4,
      },
      cards: ['c1', 'c1', 2],
      unseenCards: ['c1', 'c9'],
    })
    expect(p.games.cores?.openingSeen).toBe(true)
    expect(p.games.cores?.phases.a?.stars).toBe(1)
    expect(p.games.cores?.phases.a?.bestScore).toBe(0)
    expect(p.games.cores?.phases.b).toBeUndefined()
    expect(p.games.bad).toBeUndefined()
    expect(p.cards).toEqual(['c1'])
    expect(p.unseenCards).toEqual(['c1'])
  })
})

describe('sanitizeSettings', () => {
  it('usa os padrões para campos inválidos', () => {
    expect(sanitizeSettings({ muted: true, difficulty: 'impossível' })).toEqual({
      ...defaultSettings(),
      muted: true,
    })
  })
})

describe('localStorage repository', () => {
  it('salva e lê de volta', async () => {
    const repo = createLocalStorageRepository(new FakeStorage())
    const p = emptyProgress()
    p.cards.push('thread')
    await repo.saveProgress(p)
    expect((await repo.loadProgress()).cards).toEqual(['thread'])
    await repo.clear()
    expect(await repo.loadProgress()).toEqual(emptyProgress())
  })

  it('funciona sem armazenamento disponível', async () => {
    const repo = createLocalStorageRepository(null)
    await repo.saveSettings({ ...defaultSettings(), muted: true })
    expect(await repo.loadSettings()).toEqual(defaultSettings())
  })
})
