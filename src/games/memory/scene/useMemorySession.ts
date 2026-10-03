import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createStore, useStore } from 'zustand'
import { audio, type SfxName } from '@/engine/audio/audioEngine'
import { useGameLoop } from '@/engine/loop/useGameLoop'
import {
  maybeRevertNarration,
  say as sayNarration,
  type Narration,
} from '@/engine/narration/useNarration'
import { randomSeed } from '@/engine/random'
import { advanceTutorialStep } from '@/engine/tutorial/useTutorialSteps'
import { announce } from '@/ui/Announcer'
import type { KernelMood } from '@/ui/Kernel'
import { fill } from '@/ui/format'
import { KERNEL, TUTORIAL_STEPS, UI } from '../content'
import { resolveConfig, type MemoryGameEvent, type MemoryGameState } from '../logic/model'
import { createGame, submitRequest, tick, type SubmitAction } from '../logic/rules'
import { UNTIMED_SPEED, type MemoryPhase, type TutorialTrigger } from '../phases'

export interface Pulse {
  address: number
  kind: 'read' | 'write'
  value: number
}

interface SessionState {
  game: MemoryGameState
  narration: Narration
  tutorialStep: number
  revertAt: number | null
  /** Última gaveta lida/escrita, para a animação do `Drawer`/`MemoryTrip`. */
  pulse: Pulse | null
  /** Incrementa a cada acerto: dispara a viagem do `MemoryTrip`. */
  tripKey: number
}

export interface SessionOptions {
  phase: MemoryPhase
  untimed: boolean
  paused: boolean
  speed: number
  runId: number
}

const TRANSIENT_SECONDS = 4
const PULSE_MS = 420

/** Som de cada evento da lógica. */
function soundFor(e: MemoryGameEvent): SfxName | null {
  switch (e.type) {
    case 'select':
      return 'select'
    case 'hit':
      return e.kind === 'write' ? 'place' : 'done'
    case 'mistake':
      return 'invalid'
    case 'power-loss':
      return 'power'
    default:
      return null
  }
}

/** Gatilho do tutorial que um evento dispara. */
function triggerFor(e: MemoryGameEvent): TutorialTrigger | null {
  if (e.type === 'select') return 'select'
  if (e.type === 'hit') return 'place'
  return null
}

export function useMemorySession(o: SessionOptions) {
  const { phase, untimed, paused, speed, runId } = o
  const config = useMemo(() => resolveConfig(phase, { untimed }), [phase, untimed])
  const steps = useMemo(() => phase.tutorial ?? [], [phase])
  const stepText = useCallback((i: number) => TUTORIAL_STEPS[steps[i]?.id ?? ''] ?? null, [steps])
  const initialNarration = useCallback(
    (): Narration => ({ text: stepText(0) ?? KERNEL.start, mood: 'neutral' }),
    [stepText],
  )

  const [store] = useState(() =>
    createStore<SessionState>(() => ({
      game: createGame(phase, config, 1),
      narration: initialNarration(),
      tutorialStep: 0,
      revertAt: null,
      pulse: null,
      tripKey: 0,
    })),
  )

  // Nova partida a cada recomeço (e semente nova, para variar os pedidos).
  useEffect(() => {
    store.setState({
      game: createGame(phase, config, randomSeed()),
      narration: initialNarration(),
      tutorialStep: 0,
      revertAt: null,
      pulse: null,
      tripKey: 0,
    })
  }, [store, phase, config, runId, initialNarration])

  const ctx = useRef({ steps, stepText, config })
  useLayoutEffect(() => {
    ctx.current = { steps, stepText, config }
  })

  /** Aplica um novo estado e reage aos eventos que ele trouxe. */
  const apply = useCallback(
    (next: MemoryGameState) => {
      const prev = store.getState()
      if (next === prev.game) return
      const { steps, stepText } = ctx.current
      let narration = prev.narration
      let tutorialStep = prev.tutorialStep
      let revertAt = prev.revertAt
      let pulse = prev.pulse
      let tripKey = prev.tripKey
      const say = (text: string, mood: KernelMood = 'neutral') => {
        const s = sayNarration(text, mood, next.elapsed, steps.length > 0, TRANSIENT_SECONDS)
        narration = s.narration
        revertAt = s.revertAt
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
            pulse = { address: e.address, kind: e.kind, value: e.value }
            tripKey += 1
            announce(
              fill(UI.announce.hit, { done: next.requestsDone, goal: next.config.requestsGoal }),
            )
            if (next.scoring.combo >= 3 && next.scoring.combo % 3 === 0) {
              say(fill(KERNEL.combo, { n: next.scoring.combo }), 'happy')
            }
            break
          case 'mistake':
            announce(UI.announce.mistake, 'assertive')
            if (e.reason === 'wrong') say(KERNEL.mistakeWrong, 'think')
            else if (e.reason === 'not-selected') say(KERNEL.mistakeNotSelected, 'think')
            else say(KERNEL.mistakeExpired, 'sad')
            break
          case 'power-loss':
            announce(UI.announce.powerLoss, 'assertive')
            say(KERNEL.powerLoss, 'sad')
            break
          default:
            break
        }
      }

      const reverted = maybeRevertNarration(
        { narration, revertAt },
        next.elapsed,
        stepText(tutorialStep),
      )
      narration = reverted.narration
      revertAt = reverted.revertAt

      store.setState({ game: next, narration, tutorialStep, revertAt, pulse, tripKey })
    },
    [store],
  )

  const status = useStore(store, (s) => s.game.status)
  const effectiveSpeed = speed * (config.timed ? 1 : UNTIMED_SPEED)
  useGameLoop((dt) => apply(tick(store.getState().game, dt)), {
    running: !paused && status === 'playing',
    speed: effectiveSpeed,
  })

  const actions = useMemo(
    () => ({
      submit: (action: SubmitAction) => apply(submitRequest(store.getState().game, action)),
    }),
    [apply, store],
  )

  // Limpa o pulso de animação da gaveta depois de ~420ms (fora de um efeito
  // React: só agenda um timer e escreve direto no store, sem reagir a state).
  const pulseTimer = useRef<number | undefined>(undefined)
  const schedulePulseClear = useCallback(() => {
    window.clearTimeout(pulseTimer.current)
    pulseTimer.current = window.setTimeout(() => {
      if (store.getState().pulse) store.setState({ pulse: null })
    }, PULSE_MS)
  }, [store])
  const pulse = useStore(store, (s) => s.pulse)
  useLayoutEffect(() => {
    if (pulse) schedulePulseClear()
  }, [pulse, schedulePulseClear])

  return { store, config, actions }
}

export type MemorySession = ReturnType<typeof useMemorySession>
