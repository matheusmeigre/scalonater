import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createStore, useStore } from 'zustand'
import { audio, type SfxName } from '@/engine/audio/audioEngine'
import { useGameLoop } from '@/engine/loop/useGameLoop'
import { randomSeed } from '@/engine/random'
import type { DifficultyId } from '@/engine/types'
import { announce } from '@/ui/Announcer'
import type { KernelMood } from '@/ui/Kernel'
import { fill } from '@/ui/format'
import { APPS_COPY, KERNEL, TUTORIAL_STEPS, UI } from '../content'
import { resolveConfig, type CoresEvent, type CoresState } from '../logic/model'
import {
  createGame,
  dropThread,
  selectThread,
  step,
  tapSlot,
  type DragSource,
  type DropTarget,
} from '../logic/rules'
import { UNTIMED_SPEED, type CoresPhase, type TutorialTrigger } from '../phases'

export interface Narration {
  text: string
  mood: KernelMood
}

interface SessionState {
  game: CoresState
  narration: Narration
  /** Etapa atual do tutorial (índice em phase.tutorial). */
  tutorialStep: number
  /** Tempo de jogo em que a fala volta para a instrução do tutorial. */
  revertAt: number | null
  /** Thread sendo arrastada agora. */
  dragging: DragSource | null
}

export interface SessionOptions {
  phase: CoresPhase
  difficulty: DifficultyId
  untimed: boolean
  autoplay: boolean
  paused: boolean
  speed: number
  runId: number
}

const TRANSIENT_SECONDS = 4

/** Som de cada evento da lógica. */
function soundFor(e: CoresEvent): SfxName | null {
  switch (e.type) {
    case 'spawn':
      return 'spawn'
    case 'select':
      return 'select'
    case 'deselect':
      return 'deselect'
    case 'place':
      return e.hot ? 'hot' : e.wasteful ? 'shared' : 'place'
    case 'unplace':
      return e.to === 'io' ? 'io' : 'back'
    case 'ioReturn':
      return 'ioBack'
    case 'blocked':
      return 'blocked'
    case 'done':
      return 'done'
    case 'lowPatience':
      return 'low'
    case 'appFroze':
      return 'lost'
    case 'tick':
      return 'tick'
    case 'invalid':
      return 'invalid'
    default:
      return null
  }
}

/** Gatilho do tutorial que um evento dispara. */
function triggerFor(e: CoresEvent): TutorialTrigger | null {
  if (e.type === 'select') return 'select'
  if (e.type === 'place' && !e.moved) return 'place'
  if (e.type === 'allBusy') return 'allBusy'
  if (e.type === 'done') return 'done'
  if (e.type === 'won') return 'goal'
  return null
}

export function useCoresSession(o: SessionOptions) {
  const { phase, difficulty, untimed, autoplay, paused, speed, runId } = o
  const config = useMemo(
    () => resolveConfig(phase, { difficulty, untimed, autoplay }),
    [phase, difficulty, untimed, autoplay],
  )
  const steps = useMemo(() => (autoplay ? [] : (phase.tutorial ?? [])), [phase, autoplay])
  const stepText = useCallback(
    (i: number) => {
      const s = steps[i]
      return s ? fill(TUTORIAL_STEPS[s.id] ?? '', { goal: config.goal }) : null
    },
    [steps, config.goal],
  )
  const initialNarration = useCallback(
    (): Narration => ({
      text: stepText(0) ?? (autoplay ? KERNEL.startAuto : KERNEL.start),
      mood: 'neutral',
    }),
    [stepText, autoplay],
  )

  const [store] = useState(() =>
    createStore<SessionState>(() => ({
      game: createGame(config, 1),
      narration: initialNarration(),
      tutorialStep: 0,
      revertAt: null,
      dragging: null,
    })),
  )

  // Nova partida a cada recomeço (e semente nova, para variar a fila).
  useEffect(() => {
    store.setState({
      game: createGame(config, randomSeed()),
      narration: initialNarration(),
      tutorialStep: 0,
      revertAt: null,
      dragging: null,
    })
  }, [store, config, runId, initialNarration])

  const lastLowAt = useRef(-99)
  const ctx = useRef({ steps, stepText, autoplay, phase, config })
  useLayoutEffect(() => {
    ctx.current = { steps, stepText, autoplay, phase, config }
  })

  /** Aplica um novo estado e reage aos eventos que ele trouxe. */
  const apply = useCallback(
    (next: CoresState) => {
      const prev = store.getState()
      if (next === prev.game) return
      const { steps, stepText, autoplay, phase, config } = ctx.current
      let narration = prev.narration
      let tutorialStep = prev.tutorialStep
      let revertAt = prev.revertAt
      const say = (text: string, mood: KernelMood = 'neutral') => {
        narration = { text, mood }
        revertAt = steps.length ? next.elapsed + TRANSIENT_SECONDS : null
      }

      for (const e of next.events) {
        const sfx = soundFor(e)
        if (sfx) audio.play(sfx)

        const trig = triggerFor(e)
        if (trig && tutorialStep < steps.length) {
          const j = steps.findIndex((s, k) => k >= tutorialStep && s.advanceOn === trig)
          if (j !== -1) {
            tutorialStep = j + 1
            const text = stepText(tutorialStep)
            if (text) {
              narration = { text, mood: 'happy' }
              revertAt = null
            }
          }
        }
        if (autoplay) continue

        switch (e.type) {
          case 'place':
            if (e.hot) say(KERNEL.hot, 'happy')
            else if (e.wasteful) say(KERNEL.wasteful, 'think')
            break
          case 'unplace':
            if (e.to === 'io') say(KERNEL.toIo, 'happy')
            else say(config.patience ? KERNEL.backTimeSlice : KERNEL.back)
            break
          case 'blocked':
            announce(UI.announce.blocked)
            if (phase.id === 'io-wait') say(KERNEL.blocked, 'think')
            break
          case 'appFroze': {
            const app = APPS_COPY[e.app].name
            say(fill(KERNEL.appFroze, { app }), 'sad')
            announce(
              fill(UI.announce.froze, { app, hearts: Math.max(0, next.hearts) }),
              'assertive',
            )
            break
          }
          case 'lowPatience':
            if (next.elapsed - lastLowAt.current > 8) {
              lastLowAt.current = next.elapsed
              say(KERNEL.lowPatience, 'think')
            }
            break
          case 'idleWarning':
            say(KERNEL.idle, 'think')
            break
          case 'invalid':
            if (e.reason === 'emptyQueue') say(KERNEL.emptyQueue)
            break
          case 'done':
            announce(fill(UI.announce.done, { done: next.done, goal: config.goal }))
            if (e.combo >= 3 && e.combo % 3 === 0) say(fill(KERNEL.combo, { n: e.combo }), 'happy')
            break
        }
      }

      // No tutorial, falas passageiras voltam para a instrução da etapa.
      if (revertAt !== null && next.elapsed >= revertAt) {
        const text = stepText(tutorialStep)
        if (text) narration = { text, mood: 'neutral' }
        revertAt = null
      }

      store.setState({ game: next, narration, tutorialStep, revertAt })
    },
    [store],
  )

  const status = useStore(store, (s) => s.game.status)
  const effectiveSpeed =
    speed * (config.timed || phase.kind === 'tutorial' || autoplay ? 1 : UNTIMED_SPEED)
  useGameLoop((dt) => apply(step(store.getState().game, dt)), {
    running: !paused && status === 'playing',
    speed: effectiveSpeed,
  })

  const actions = useMemo(
    () => ({
      select: (id: number) => apply(selectThread(store.getState().game, id)),
      tapSlot: (slot: number) => apply(tapSlot(store.getState().game, slot)),
      drop: (source: DragSource, target: DropTarget) =>
        apply(dropThread(store.getState().game, source, target)),
      setDragging: (dragging: DragSource | null) => store.setState({ dragging }),
      say: (text: string, mood: KernelMood = 'neutral') =>
        store.setState({ narration: { text, mood } }),
    }),
    [apply, store],
  )

  return { store, config, actions }
}

export type CoresSession = ReturnType<typeof useCoresSession>
