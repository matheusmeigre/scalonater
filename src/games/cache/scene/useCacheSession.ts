import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { audio, type SfxName } from '@/engine/audio/audioEngine'
import { useGameLoop } from '@/engine/loop/useGameLoop'
import { maybeRevertNarration, say as sayNarration } from '@/engine/narration/useNarration'
import { randomSeed } from '@/engine/random'
import { advanceTutorialStep } from '@/engine/tutorial/useTutorialSteps'
import type { KernelMood } from '@/ui/Kernel'
import { KERNEL, TUTORIAL_STEPS } from '../content'
import { resolveConfig } from '../logic/model'
import { createGame, evict, step, type CacheEvent, type GameState } from '../logic/rules'
import { UNTIMED_SPEED, type CachePhase, type CacheTutorialTrigger } from '../phases'

export interface Narration {
  text: string
  mood: KernelMood
}

export type CacheFlashKind = 'hit' | 'l2-hit' | 'miss' | 'evicted' | 'arrived'
export interface CacheFlash {
  address: number
  kind: CacheFlashKind
}

interface SessionState {
  game: GameState
  narration: Narration
  tutorialStep: number
  revertAt: number | null
  flash: CacheFlash | null
  flashUntil: number
}

export interface SessionOptions {
  phase: CachePhase
  untimed: boolean
  paused: boolean
  speed: number
  runId: number
}

const TRANSIENT_SECONDS = 4
const FLASH_SECONDS = 0.6

function soundFor(e: CacheEvent): SfxName | null {
  switch (e.type) {
    case 'hit':
      return 'hot'
    case 'l2-hit':
      return 'select'
    case 'miss':
      return 'spawn'
    case 'need-eviction':
      return 'blocked'
    case 'evicted':
      return 'place'
    case 'won':
      return 'done'
    case 'lost':
      return 'lost'
    default:
      return null
  }
}

function triggerFor(e: CacheEvent): CacheTutorialTrigger | null {
  switch (e.type) {
    case 'miss':
      return 'select'
    case 'hit':
      return 'done'
    default:
      return null
  }
}

export function useCacheSession(o: SessionOptions) {
  const { phase, untimed, paused, speed, runId } = o
  const config = useMemo(() => resolveConfig(phase), [phase])
  const steps = useMemo(() => phase.tutorial ?? [], [phase])
  const stepText = useCallback((i: number) => TUTORIAL_STEPS[steps[i]?.id ?? ''] ?? null, [steps])

  const initialNarration = useCallback(
    (): Narration => ({ text: stepText(0) ?? KERNEL.miss, mood: 'neutral' }),
    [stepText],
  )

  const newSession = useCallback(
    (): SessionState => ({
      game: createGame(config, randomSeed()),
      narration: initialNarration(),
      tutorialStep: 0,
      revertAt: null,
      flash: null,
      flashUntil: 0,
    }),
    [config, initialNarration],
  )

  const [state, setState] = useState<SessionState>(newSession)

  // Nova partida a cada recomeço (fase ou runId mudam): ajustar o estado
  // durante a renderização evita um re-render extra de um efeito.
  const [seenKey, setSeenKey] = useState({ config, runId })
  if (seenKey.config !== config || seenKey.runId !== runId) {
    setSeenKey({ config, runId })
    setState(newSession())
  }

  const ctx = useRef({ steps, stepText })
  useLayoutEffect(() => {
    ctx.current = { steps, stepText }
  })

  const apply = useCallback((next: GameState) => {
    setState((prev) => {
      if (next === prev.game) return prev
      const { steps, stepText } = ctx.current
      let narration = prev.narration
      let tutorialStep = prev.tutorialStep
      let revertAt = prev.revertAt
      let flash = prev.flash
      let flashUntil = prev.flashUntil
      const say = (text: string, mood: KernelMood = 'neutral') => {
        const r = sayNarration(text, mood, next.elapsed, steps.length > 0, TRANSIENT_SECONDS)
        narration = r.narration
        revertAt = r.revertAt
      }

      for (const e of next.events) {
        const sfx = soundFor(e)
        if (sfx) audio.play(sfx)

        const trig = triggerFor(e)
        if (trig && tutorialStep < steps.length) {
          const advanced = advanceTutorialStep(steps, tutorialStep, trig)
          if (advanced !== tutorialStep) {
            tutorialStep = advanced
            const text = stepText(tutorialStep)
            if (text) {
              narration = { text, mood: 'happy' }
              revertAt = null
            }
          }
        }

        switch (e.type) {
          case 'hit':
            say(KERNEL.hit, 'happy')
            break
          case 'l2-hit':
            say(KERNEL.l2Hit, 'happy')
            break
          case 'miss':
            say(KERNEL.miss, 'think')
            break
          case 'need-eviction':
            say(KERNEL.needEviction, 'think')
            break
          case 'evicted':
            say(KERNEL.evicted, 'neutral')
            break
          case 'won':
            say(KERNEL.won, 'happy')
            break
          case 'lost':
            say(KERNEL.lost, 'sad')
            break
        }

        if (e.type === 'hit' || e.type === 'l2-hit' || e.type === 'miss' || e.type === 'evicted') {
          flash = { address: e.address, kind: e.type }
          flashUntil = next.elapsed + FLASH_SECONDS
        }
      }

      if (flash && next.elapsed >= flashUntil) flash = null

      const reverted = maybeRevertNarration(
        { narration, revertAt },
        next.elapsed,
        ctx.current.stepText(tutorialStep),
      )
      narration = reverted.narration
      revertAt = reverted.revertAt

      return { game: next, narration, tutorialStep, revertAt, flash, flashUntil }
    })
  }, [])

  const status = state.game.cache.status
  const effectiveSpeed = speed * (phase.kind === 'tutorial' || !untimed ? 1 : UNTIMED_SPEED)
  useGameLoop((dt) => apply(step(state.game, dt)), {
    running: !paused && status === 'playing',
    speed: effectiveSpeed,
  })

  const actions = useMemo(
    () => ({
      evict: (address: number) => apply(evict(state.game, address)),
    }),
    [apply, state.game],
  )

  return {
    game: state.game,
    narration: state.narration,
    tutorialStep: state.tutorialStep,
    flash: state.flash,
    config,
    actions,
  }
}

export type CacheSession = ReturnType<typeof useCacheSession>
