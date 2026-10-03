import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { audio, type SfxName } from '@/engine/audio/audioEngine'
import { useGameLoop } from '@/engine/loop/useGameLoop'
import { maybeRevertNarration, say as sayNarration } from '@/engine/narration/useNarration'
import { randomSeed } from '@/engine/random'
import { advanceTutorialStep } from '@/engine/tutorial/useTutorialSteps'
import type { DifficultyId } from '@/engine/types'
import { announce } from '@/ui/Announcer'
import type { KernelMood } from '@/ui/Kernel'
import { fill } from '@/ui/format'
import { DEVICE_COPY, KERNEL, TUTORIAL_STEPS, UI } from '../content'
import type { IoEvent, IoState } from '../logic/model'
import { resolveConfig } from '../logic/model'
import {
  attendDevice,
  attendDmaChunk,
  checkNow,
  collectDma,
  createGame,
  pushContext,
  startDma,
  step,
} from '../logic/rules'
import { UNTIMED_SPEED, type IoDeviceId, type IoPhase, type IoTutorialTrigger } from '../phases'

export interface Narration {
  text: string
  mood: KernelMood
}

interface SessionState {
  game: IoState
  narration: Narration
  tutorialStep: number
  revertAt: number | null
}

export interface SessionOptions {
  phase: IoPhase
  difficulty: DifficultyId
  untimed: boolean
  paused: boolean
  speed: number
  runId: number
}

const TRANSIENT_SECONDS = 4

function soundFor(e: IoEvent): SfxName | null {
  switch (e.type) {
    case 'ring':
      return 'spawn'
    case 'contextSaved':
      return 'select'
    case 'attended':
      return 'done'
    case 'contextLost':
      return 'lost'
    case 'resumed':
      return 'back'
    case 'queueOverflow':
      return 'invalid'
    case 'missedDeadline':
      return 'blocked'
    case 'checked':
      return e.hit ? 'hot' : 'invalid'
    case 'dmaStarted':
      return 'place'
    case 'dmaDone':
      return 'done'
    case 'dmaCollected':
      return 'hot'
    case 'dmaManualTouch':
      return 'invalid'
    case 'tick':
      return 'tick'
    default:
      return null
  }
}

function triggerFor(e: IoEvent): IoTutorialTrigger | null {
  switch (e.type) {
    case 'ring':
      return 'ring'
    case 'contextSaved':
      return 'guard'
    case 'attended':
      return 'attend'
    case 'resumed':
      return 'resume'
    case 'won':
      return 'goal'
    default:
      return null
  }
}

export function useIoSession(o: SessionOptions) {
  const { phase, difficulty, untimed, paused, speed, runId } = o
  const config = useMemo(
    () => resolveConfig(phase, { difficulty, untimed }),
    [phase, difficulty, untimed],
  )
  const steps = useMemo(() => phase.tutorial ?? [], [phase])
  const stepText = useCallback(
    (i: number) => {
      const st = steps[i]
      return st ? fill(TUTORIAL_STEPS[st.id] ?? '', { goal: config.goal }) : null
    },
    [steps, config.goal],
  )

  const initialNarration = useCallback(
    (): Narration => ({ text: stepText(0) ?? KERNEL.start, mood: 'neutral' }),
    [stepText],
  )

  const newSession = useCallback(
    (): SessionState => ({
      game: createGame(config, randomSeed()),
      narration: initialNarration(),
      tutorialStep: 0,
      revertAt: null,
    }),
    [config, initialNarration],
  )

  const [state, setState] = useState<SessionState>(newSession)

  // Nova partida a cada recomeço (fase, dificuldade ou runId mudam):
  // ajustar o estado durante a renderização evita um re-render extra de um
  // efeito (mesmo padrão de `_template/scene/TemplateScene.tsx`).
  const [seenKey, setSeenKey] = useState({ config, runId })
  if (seenKey.config !== config || seenKey.runId !== runId) {
    setSeenKey({ config, runId })
    setState(newSession())
  }

  const ctx = useRef({ steps, stepText, config })
  useLayoutEffect(() => {
    ctx.current = { steps, stepText, config }
  })

  const apply = useCallback((next: IoState) => {
    setState((prev) => {
      if (next === prev.game) return prev
      const { steps, stepText } = ctx.current
      let narration = prev.narration
      let tutorialStep = prev.tutorialStep
      let revertAt = prev.revertAt
      const say = (text: string, mood: KernelMood = 'neutral') => {
        const r = sayNarration(text, mood, next.elapsed, steps.length > 0, TRANSIENT_SECONDS)
        narration = r.narration
        revertAt = r.revertAt
      }
      const deviceName = (d: IoDeviceId) => DEVICE_COPY[d].name

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
          case 'ring':
            say(fill(KERNEL.ring, { device: deviceName(e.device) }), 'think')
            announce(fill(UI.announce.ring, { device: deviceName(e.device) }))
            break
          case 'contextSaved':
            say(KERNEL.guarded, 'neutral')
            announce(UI.announce.guarded)
            break
          case 'attended':
            say(KERNEL.attended, 'happy')
            announce(fill(UI.announce.attended, { device: deviceName(e.device) }))
            break
          case 'contextLost':
            say(KERNEL.contextLost, 'sad')
            announce(UI.announce.contextLost, 'assertive')
            break
          case 'resumed':
            announce(UI.announce.resumed)
            break
          case 'queueOverflow':
            say(KERNEL.queueOverflow, 'sad')
            break
          case 'missedDeadline':
            say(fill(KERNEL.missedDeadline, { device: deviceName(e.device) }), 'sad')
            announce(
              fill(UI.announce.missedDeadline, { device: deviceName(e.device) }),
              'assertive',
            )
            break
          case 'dmaStarted':
            say(KERNEL.dmaStarted, 'happy')
            break
          case 'dmaDone':
            say(KERNEL.dmaDone, 'happy')
            break
          case 'dmaManualTouch':
            say(KERNEL.dmaManual, 'think')
            break
        }
      }

      const reverted = maybeRevertNarration(
        { narration, revertAt },
        next.elapsed,
        ctx.current.stepText(tutorialStep),
      )
      narration = reverted.narration
      revertAt = reverted.revertAt

      return { game: next, narration, tutorialStep, revertAt }
    })
  }, [])

  const status = state.game.status
  const effectiveSpeed = speed * (config.timed || phase.kind === 'tutorial' ? 1 : UNTIMED_SPEED)
  useGameLoop((dt) => apply(step(state.game, dt)), {
    running: !paused && status === 'playing',
    speed: effectiveSpeed,
  })

  const actions = useMemo(
    () => ({
      pushContext: () => apply(pushContext(state.game)),
      attendDevice: (device: IoDeviceId) => apply(attendDevice(state.game, device)),
      checkNow: () => apply(checkNow(state.game)),
      startDma: () => apply(startDma(state.game)),
      attendDmaChunk: () => apply(attendDmaChunk(state.game)),
      collectDma: () => apply(collectDma(state.game)),
    }),
    [apply, state.game],
  )

  return {
    game: state.game,
    narration: state.narration,
    tutorialStep: state.tutorialStep,
    config,
    actions,
  }
}

export type IoSession = ReturnType<typeof useIoSession>
