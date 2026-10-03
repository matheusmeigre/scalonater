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
import { KERNEL, TUTORIAL_STEPS, UI } from '../content'
import { resolveConfig, type NetworkEvent, type NetworkState } from '../logic/model'
import { createGame, forwardPacket, resolveDns, selectPacket, step } from '../logic/rules'
import type { NetworkPhase, NetworkTutorialTrigger } from '../phases'

export interface Narration {
  text: string
  mood: KernelMood
}

interface SessionState {
  game: NetworkState
  narration: Narration
  tutorialStep: number
  revertAt: number | null
}

export interface SessionOptions {
  phase: NetworkPhase
  difficulty: DifficultyId
  untimed: boolean
  paused: boolean
  speed: number
  runId: number
}

const TRANSIENT_SECONDS = 4
/** Modo sem tempo a 75% da velocidade (mesma proporção usada no Núcleos). */
const UNTIMED_SPEED = 0.75

function soundFor(e: NetworkEvent): SfxName | null {
  switch (e.type) {
    case 'selected':
      return 'select'
    case 'sent':
      return 'place'
    case 'arrived':
      return 'tick'
    case 'delivered':
      return 'done'
    case 'messageAssembled':
      return 'hot'
    case 'dropped':
      return 'blocked'
    case 'lost':
      return 'lost'
    case 'wrongAddress':
      return 'invalid'
    case 'resent':
      return 'back'
    case 'dnsResolved':
      return e.correct ? 'done' : 'invalid'
    case 'won':
      return 'win'
    case 'lostGame':
      return 'lose'
    default:
      return null
  }
}

function triggerFor(e: NetworkEvent): NetworkTutorialTrigger | null {
  switch (e.type) {
    case 'selected':
      return 'select'
    case 'sent':
      return 'send'
    case 'arrived':
      return 'arrived'
    case 'delivered':
      return 'delivered'
    default:
      return null
  }
}

export function useNetworkSession(o: SessionOptions) {
  const { phase, difficulty, untimed, paused, speed, runId } = o
  const config = useMemo(
    () => resolveConfig(phase, { difficulty, untimed }),
    [phase, difficulty, untimed],
  )
  const steps = useMemo(() => phase.tutorial ?? [], [phase])
  const stepText = useCallback(
    (i: number) => {
      const st = steps[i]
      return st ? (TUTORIAL_STEPS[st.advanceOn] ?? null) : null
    },
    [steps],
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

  // Nova partida a cada recomeço (fase ou runId mudam): ajustar o estado
  // durante a renderização evita um re-render extra de um efeito (mesmo
  // padrão de `_template/scene/TemplateScene.tsx` e `games/io`).
  const [seenKey, setSeenKey] = useState({ config, runId })
  if (seenKey.config !== config || seenKey.runId !== runId) {
    setSeenKey({ config, runId })
    setState(newSession())
  }

  const ctx = useRef({ steps, stepText })
  useLayoutEffect(() => {
    ctx.current = { steps, stepText }
  })

  const apply = useCallback((next: NetworkState) => {
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
          case 'dropped':
            say(KERNEL.dropped, 'sad')
            announce(UI.announce.dropped, 'assertive')
            break
          case 'lost':
            say(KERNEL.lost, 'sad')
            announce(UI.announce.lost, 'assertive')
            break
          case 'resent':
            say(KERNEL.resent, 'think')
            announce(UI.announce.resent)
            break
          case 'wrongAddress':
            say(KERNEL.wrongAddress, 'sad')
            announce(UI.announce.wrongAddress, 'assertive')
            break
          case 'messageAssembled':
            say(KERNEL.assembled, 'happy')
            announce(UI.announce.assembled)
            break
          case 'dnsResolved':
            say(
              e.correct
                ? KERNEL.dnsCorrect
                : fill(KERNEL.dnsWrong, { name: next.config.dnsName ?? '' }),
              e.correct ? 'happy' : 'sad',
            )
            break
          case 'blocked':
            if (e.reason === 'dns-not-resolved') say(KERNEL.needsDns, 'think')
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
      select: (packetId: string) => apply(selectPacket(state.game, packetId)),
      deselect: () => apply(selectPacket(state.game, null)),
      forward: (nodeId: string) => {
        if (!state.game.selected) return
        apply(forwardPacket(state.game, state.game.selected, nodeId))
      },
      resolveDns: (address: string) => apply(resolveDns(state.game, address)),
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

export type NetworkSession = ReturnType<typeof useNetworkSession>
