import { describe, expect, it } from 'vitest'
import { emptyProgress, type Progress } from '../persistence/progress'
import { STATION_IDS, type GameModule, type StationId } from '../types'
import {
  effectivePrerequisites,
  isGameComplete,
  isPhaseUnlocked,
  nextPhaseIndex,
  stationStatus,
} from './progression'

const phases = [
  { id: 'tutorial', kind: 'tutorial', canLose: false },
  { id: 'p1', kind: 'level', canLose: true },
  { id: 'p2', kind: 'level', canLose: true },
] as const

const fakeGame = (id: StationId): GameModule =>
  ({ meta: { id, icon: 'x', hasDifficulty: false, hasAutoplay: false }, phases }) as never

const done = { stars: 3 as const, bestScore: 1, completedAt: '' }

describe('fases', () => {
  it('libera a primeira e exige a anterior para as outras', () => {
    const g = { openingSeen: true, phases: { tutorial: done } }
    expect(isPhaseUnlocked(phases, 0, undefined)).toBe(true)
    expect(isPhaseUnlocked(phases, 1, undefined)).toBe(false)
    expect(isPhaseUnlocked(phases, 1, g)).toBe(true)
    expect(isPhaseUnlocked(phases, 2, g)).toBe(false)
    expect(nextPhaseIndex(phases, g)).toBe(1)
  })

  it('o jogo termina quando todas as fases foram vencidas', () => {
    const all = { openingSeen: true, phases: { tutorial: done, p1: done, p2: done } }
    expect(isGameComplete(phases, all)).toBe(true)
    expect(nextPhaseIndex(phases, all)).toBe(2)
  })
})

describe('estações', () => {
  const trail = STATION_IDS

  it('ignora pré-requisitos que ainda não existem', () => {
    expect(effectivePrerequisites('cores', trail, new Set(['cores']))).toEqual([])
    expect(effectivePrerequisites('cores', trail, new Set(['bits', 'cores']))).toEqual(['bits'])
  })

  it('só o Núcleos existe: ele fica liberado e o resto "em construção"', () => {
    const games = new Map<StationId, GameModule>([['cores', fakeGame('cores')]])
    const p = emptyProgress()
    expect(stationStatus('cores', trail, games, p)).toBe('available')
    expect(stationStatus('bits', trail, games, p)).toBe('soon')
  })

  it('bloqueia até a estação anterior existente ser concluída', () => {
    const games = new Map<StationId, GameModule>([
      ['bits', fakeGame('bits')],
      ['cores', fakeGame('cores')],
    ])
    const p: Progress = emptyProgress()
    expect(stationStatus('cores', trail, games, p)).toBe('locked')
    p.games.bits = { openingSeen: true, phases: { tutorial: done, p1: done, p2: done } }
    expect(stationStatus('bits', trail, games, p)).toBe('complete')
    expect(stationStatus('cores', trail, games, p)).toBe('available')
  })
})
