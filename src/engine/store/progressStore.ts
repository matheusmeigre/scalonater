import { create } from 'zustand'
import {
  emptyGameProgress,
  emptyProgress,
  getRepository,
  type GameProgress,
  type Progress,
} from '../persistence'
import type { StarCount } from '../scoring/scoring'

export interface RecordResult {
  /** Primeira vez que a fase foi vencida. */
  firstClear: boolean
  newBestScore: boolean
  /** Cards liberados agora. */
  newCards: string[]
  /** Esta vitória concluiu o jogo inteiro. */
  gameCompleted: boolean
}

interface ProgressStore {
  progress: Progress
  hydrated: boolean
  hydrate: () => Promise<void>
  markOpeningSeen: (gameId: string) => void
  recordPhaseWin: (args: {
    gameId: string
    phaseId: string
    stars: StarCount
    score: number
    cards: string[]
    allPhaseIds: readonly string[]
  }) => RecordResult
  markCardsSeen: (ids: readonly string[]) => void
  reset: () => Promise<void>
}

function game(p: Progress, id: string): GameProgress {
  return p.games[id] ?? emptyGameProgress()
}

export const useProgress = create<ProgressStore>((set, get) => {
  const commit = (progress: Progress) => {
    set({ progress })
    void getRepository().saveProgress(progress)
  }

  return {
    progress: emptyProgress(),
    hydrated: false,

    hydrate: async () => {
      const progress = await getRepository().loadProgress()
      set({ progress, hydrated: true })
    },

    markOpeningSeen: (gameId) => {
      const p = get().progress
      if (p.games[gameId]?.openingSeen) return
      commit({ ...p, games: { ...p.games, [gameId]: { ...game(p, gameId), openingSeen: true } } })
    },

    recordPhaseWin: ({ gameId, phaseId, stars, score, cards, allPhaseIds }) => {
      const p = get().progress
      const g = game(p, gameId)
      const prev = g.phases[phaseId]
      const now = new Date().toISOString()
      const phases = {
        ...g.phases,
        [phaseId]: {
          stars: Math.max(prev?.stars ?? 0, stars) as StarCount,
          bestScore: Math.max(prev?.bestScore ?? 0, score),
          completedAt: prev?.completedAt ?? now,
        },
      }
      const wasComplete = !!g.completedAt
      const complete = allPhaseIds.every((id) => phases[id])
      const newCards = cards.filter((c) => !p.cards.includes(c))
      commit({
        ...p,
        games: {
          ...p.games,
          [gameId]: {
            ...g,
            phases,
            ...(complete ? { completedAt: g.completedAt ?? now } : {}),
          },
        },
        cards: [...p.cards, ...newCards],
        unseenCards: [...p.unseenCards, ...newCards],
      })
      return {
        firstClear: !prev,
        newBestScore: !!prev && score > prev.bestScore,
        newCards,
        gameCompleted: complete && !wasComplete,
      }
    },

    markCardsSeen: (ids) => {
      const p = get().progress
      const unseen = p.unseenCards.filter((c) => !ids.includes(c))
      if (unseen.length !== p.unseenCards.length) commit({ ...p, unseenCards: unseen })
    },

    reset: async () => {
      await getRepository().saveProgress(emptyProgress())
      set({ progress: emptyProgress() })
    },
  }
})
