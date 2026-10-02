import { beforeEach, describe, expect, it } from 'vitest'
import { setRepository } from '../persistence'
import { createMemoryRepository } from '../persistence/memoryRepository'
import { useProgress } from './progressStore'

const ids = ['tutorial', 'p1'] as const

describe('progressStore', () => {
  let repo: ReturnType<typeof createMemoryRepository>

  beforeEach(async () => {
    repo = createMemoryRepository()
    setRepository(repo)
    await useProgress.getState().hydrate()
  })

  it('registra vitória, cards novos e conclusão do jogo, e salva no repositório', async () => {
    const s = useProgress.getState()
    const r1 = s.recordPhaseWin({
      gameId: 'cores',
      phaseId: 'tutorial',
      stars: 2,
      score: 100,
      cards: ['thread'],
      allPhaseIds: ids,
    })
    expect(r1).toEqual({
      firstClear: true,
      newBestScore: false,
      newCards: ['thread'],
      gameCompleted: false,
    })

    const r2 = useProgress.getState().recordPhaseWin({
      gameId: 'cores',
      phaseId: 'p1',
      stars: 3,
      score: 50,
      cards: ['thread', 'io'],
      allPhaseIds: ids,
    })
    expect(r2.newCards).toEqual(['io'])
    expect(r2.gameCompleted).toBe(true)

    const saved = repo.snapshot().progress
    expect(saved.cards).toEqual(['thread', 'io'])
    expect(saved.unseenCards).toEqual(['thread', 'io'])
    expect(saved.games.cores?.completedAt).toBeTruthy()
  })

  it('guarda o melhor resultado sem piorar as estrelas', () => {
    const args = { gameId: 'cores', phaseId: 'tutorial', cards: [], allPhaseIds: ids }
    useProgress.getState().recordPhaseWin({ ...args, stars: 3, score: 100 })
    const r = useProgress.getState().recordPhaseWin({ ...args, stars: 1, score: 300 })
    expect(r.newBestScore).toBe(true)
    expect(useProgress.getState().progress.games.cores?.phases.tutorial).toMatchObject({
      stars: 3,
      bestScore: 300,
    })
  })

  it('marca cards como vistos', () => {
    useProgress.getState().recordPhaseWin({
      gameId: 'cores',
      phaseId: 'tutorial',
      stars: 1,
      score: 0,
      cards: ['a', 'b'],
      allPhaseIds: ids,
    })
    useProgress.getState().markCardsSeen(['a'])
    expect(useProgress.getState().progress.unseenCards).toEqual(['b'])
  })
})
