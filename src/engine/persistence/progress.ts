import { DIFFICULTY_IDS, type DifficultyId } from '../types'
import type { StarCount } from '../scoring/scoring'

export interface PhaseRecord {
  stars: StarCount
  bestScore: number
  completedAt: string
}

export interface GameProgress {
  openingSeen: boolean
  phases: Record<string, PhaseRecord>
  completedAt?: string
}

export interface Progress {
  version: 1
  games: Record<string, GameProgress>
  /** Cards de conceito liberados, na ordem em que foram ganhos. */
  cards: string[]
  /** Cards ganhos que o jogador ainda não abriu no Manual. */
  unseenCards: string[]
}

export interface Settings {
  version: 1
  /** Mudo geral (música e efeitos). */
  muted: boolean
  music: boolean
  sfx: boolean
  /** Modo sem tempo: sem relógio e partida mais lenta. */
  untimed: boolean
  difficulty: DifficultyId
  /** Reduz animações mesmo que o sistema não peça. */
  reduceMotion: boolean
}

export const emptyProgress = (): Progress => ({ version: 1, games: {}, cards: [], unseenCards: [] })
export const emptyGameProgress = (): GameProgress => ({ openingSeen: false, phases: {} })
export const defaultSettings = (): Settings => ({
  version: 1,
  muted: false,
  music: true,
  sfx: true,
  untimed: false,
  difficulty: 'normal',
  reduceMotion: false,
})

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const strArray = (v: unknown) =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string'))] : []
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d)

function sanitizePhase(v: unknown): PhaseRecord | null {
  if (!isObj(v)) return null
  const stars = Number(v.stars)
  const bestScore = Number(v.bestScore)
  return {
    stars: (stars >= 0 && stars <= 3 ? Math.round(stars) : 1) as StarCount,
    bestScore: Number.isFinite(bestScore) ? Math.max(0, Math.round(bestScore)) : 0,
    completedAt: typeof v.completedAt === 'string' ? v.completedAt : new Date(0).toISOString(),
  }
}

/** Lê qualquer coisa (inclusive dado corrompido) e devolve um progresso válido. */
export function sanitizeProgress(raw: unknown): Progress {
  const out = emptyProgress()
  if (!isObj(raw)) return out
  if (isObj(raw.games)) {
    for (const [id, g] of Object.entries(raw.games)) {
      if (!isObj(g)) continue
      const phases: Record<string, PhaseRecord> = {}
      if (isObj(g.phases))
        for (const [pid, p] of Object.entries(g.phases)) {
          const rec = sanitizePhase(p)
          if (rec) phases[pid] = rec
        }
      out.games[id] = {
        openingSeen: bool(g.openingSeen, false),
        phases,
        ...(typeof g.completedAt === 'string' ? { completedAt: g.completedAt } : {}),
      }
    }
  }
  out.cards = strArray(raw.cards)
  out.unseenCards = strArray(raw.unseenCards).filter((c) => out.cards.includes(c))
  return out
}

export function sanitizeSettings(raw: unknown): Settings {
  const d = defaultSettings()
  if (!isObj(raw)) return d
  return {
    version: 1,
    muted: bool(raw.muted, d.muted),
    music: bool(raw.music, d.music),
    sfx: bool(raw.sfx, d.sfx),
    untimed: bool(raw.untimed, d.untimed),
    difficulty: (DIFFICULTY_IDS as readonly unknown[]).includes(raw.difficulty)
      ? (raw.difficulty as DifficultyId)
      : d.difficulty,
    reduceMotion: bool(raw.reduceMotion, d.reduceMotion),
  }
}
