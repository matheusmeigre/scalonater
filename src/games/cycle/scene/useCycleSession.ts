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
import {
  resolveConfig,
  type CycleEvent,
  type CycleGameState,
  type CycleInstruction,
} from '../logic/model'
import { createGame, decodeStation, executeStation, fetchInstruction, tick } from '../logic/rules'
import { UNTIMED_SPEED, type CyclePhase, type TutorialTrigger } from '../phases'

export interface ShelfPulse {
  address: number
  kind: 'read' | 'write'
}

interface SessionState {
  game: CycleGameState
  narration: Narration
  tutorialStep: number
  revertAt: number | null
  /** Última gaveta lida/escrita, para a animação do `Drawer`/`MemoryTrip`. */
  shelfPulse: ShelfPulse | null
  /** Registrador que acabou de mudar (ACC ou PC), para o "pulso" em `Registers`. */
  registerPulse: 'pc' | 'acc' | null
  /** Incrementa a cada viagem (busca ou execução que afeta a memória). */
  tripKey: number
}

export interface SessionOptions {
  phase: CyclePhase
  untimed: boolean
  paused: boolean
  speed: number
  runId: number
}

const TRANSIENT_SECONDS = 4
const PULSE_MS = 420

function soundFor(e: CycleEvent): SfxName | null {
  switch (e.type) {
    case 'fetched':
      return 'select'
    case 'decoded':
      return e.correct ? 'place' : 'invalid'
    case 'executed':
      return 'done'
    case 'mistake':
      return 'invalid'
    default:
      return null
  }
}

function triggerFor(e: CycleEvent): TutorialTrigger | null {
  if (e.type === 'fetched') return 'fetch'
  if (e.type === 'decoded' && e.correct) return 'decode'
  if (e.type === 'executed') return 'execute'
  return null
}

export function useCycleSession(o: SessionOptions) {
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
      shelfPulse: null,
      registerPulse: null,
      tripKey: 0,
    })),
  )

  // Nova partida a cada recomeço.
  useEffect(() => {
    store.setState({
      game: createGame(phase, config, randomSeed()),
      narration: initialNarration(),
      tutorialStep: 0,
      revertAt: null,
      shelfPulse: null,
      registerPulse: null,
      tripKey: 0,
    })
  }, [store, phase, config, runId, initialNarration])

  const ctx = useRef({ steps, stepText, config })
  useLayoutEffect(() => {
    ctx.current = { steps, stepText, config }
  })

  const apply = useCallback(
    (next: CycleGameState) => {
      const prev = store.getState()
      if (next === prev.game) return
      const { steps, stepText } = ctx.current
      let narration = prev.narration
      let tutorialStep = prev.tutorialStep
      let revertAt = prev.revertAt
      let shelfPulse = prev.shelfPulse
      let registerPulse = prev.registerPulse
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
          case 'fetched':
            shelfPulse = { address: e.address, kind: 'read' }
            tripKey += 1
            announce(fill(UI.announce.fetched, { instruction: e.instruction.op }))
            break
          case 'decoded':
            if (!e.correct) announce(UI.announce.mistake, 'assertive')
            else announce(UI.announce.decoded)
            break
          case 'executed':
            if (e.target.kind === 'acc') registerPulse = 'acc'
            else if (e.target.kind === 'pc') registerPulse = 'pc'
            else shelfPulse = { address: e.target.address, kind: 'write' }
            tripKey += 1
            announce(UI.announce.executed)
            if (next.scoring.combo >= 3 && next.scoring.combo % 3 === 0) {
              say(fill(KERNEL.combo, { n: next.scoring.combo }), 'happy')
            }
            break
          case 'mistake':
            announce(UI.announce.mistake, 'assertive')
            say(e.reason === 'decode' ? KERNEL.decodedWrong : KERNEL.expired, 'think')
            break
          case 'looped-too-much':
            say(KERNEL.loopedTooMuch, 'sad')
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

      store.setState({
        game: next,
        narration,
        tutorialStep,
        revertAt,
        shelfPulse,
        registerPulse,
        tripKey,
      })
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
      fetch: () => apply(fetchInstruction(store.getState().game)),
      decode: (op: CycleInstruction['op']) => apply(decodeStation(store.getState().game, op)),
      execute: () => apply(executeStation(store.getState().game)),
    }),
    [apply, store],
  )

  // Limpa os pulsos de animação depois de ~420ms, fora de um efeito React:
  // só agenda um timer e escreve direto no store.
  const pulseTimer = useRef<number | undefined>(undefined)
  const schedulePulseClear = useCallback(() => {
    window.clearTimeout(pulseTimer.current)
    pulseTimer.current = window.setTimeout(() => {
      const s = store.getState()
      if (s.shelfPulse || s.registerPulse) store.setState({ shelfPulse: null, registerPulse: null })
    }, PULSE_MS)
  }, [store])
  const shelfPulse = useStore(store, (s) => s.shelfPulse)
  const registerPulse = useStore(store, (s) => s.registerPulse)
  useLayoutEffect(() => {
    if (shelfPulse || registerPulse) schedulePulseClear()
  }, [shelfPulse, registerPulse, schedulePulseClear])
  useEffect(() => () => window.clearTimeout(pulseTimer.current), [])

  return { store, config, actions }
}

export type CycleSession = ReturnType<typeof useCycleSession>
