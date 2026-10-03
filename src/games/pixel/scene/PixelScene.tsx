import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useGameLoop } from '@/engine/loop/useGameLoop'
import { useNarration } from '@/engine/narration/useNarration'
import { randomSeed } from '@/engine/random'
import { useTutorialSteps } from '@/engine/tutorial/useTutorialSteps'
import type { PhaseOutcome, SceneProps } from '@/engine/types'
import { OpSelector } from '@/games/alu/scene/OpSelector'
import { CacheSlots } from '@/games/cache/scene/CacheSlots'
import type { CacheFlash } from '@/games/cache/scene/useCacheSession'
import { ProcessorPreview } from '@/games/cores/scene/ProcessorPreview'
import type { CoreModel } from '@/games/cores/scene/Processor'
import { Registers } from '@/games/cycle/scene/Registers'
import { IoDevicePreview } from '@/games/io/scene/IoDevicePreview'
import { BitSwitch } from '@/games/shared/binary'
import { DiskGrid, type DiskBlockView } from '@/games/storage/scene/DiskGrid'
import { Button } from '@/ui/Button'
import { GameFrame } from '@/ui/GameFrame'
import { LevelBadge, TasksStat, TimeStat } from '@/ui/Hud'
import { Label } from '@/ui/Panel'
import { cx, fill } from '@/ui/format'
import { COPY, UI } from '../content'
import type { PixelPhase } from '../phases'
import {
  CACHE_ADDRESS,
  completeTutorial,
  computeOutcome,
  createGame,
  loseGame,
  readDiskBlocks,
  resolveCacheStep,
  runCycleStep,
  scheduleThread,
  selectAluOp,
  togglePixelBit,
  type PixelState,
} from '../logic/rules'
// CSS das estações de origem reaproveitadas (`CacheSlots`/`DiskGrid` não a
// importam sozinhas — ver DECISIONS.md, Etapa 11).
import '@/games/cache/scene/cache.css'
import '@/games/storage/scene/storage.css'
import './pixel.css'

interface Session {
  game: PixelState
  elapsed: number
}

// Referência estável: `useTutorialSteps` compara `steps` por referência para
// saber quando reiniciar o tutorial (nova fase/recomeço). Um `?? []` inline
// criaria um array novo a cada render nas fases sem `phase.tutorial`
// (nivel-1 a nivel-3), disparando um loop infinito de renderização.
const NO_TUTORIAL_STEPS: readonly { id: string; advanceOn: 'select' | 'done' }[] = []

function newSession(phase: PixelPhase): Session {
  return { game: createGame(phase, randomSeed()), elapsed: 0 }
}

/** Painel de passo: destaca o atual, esmaece o que já passou. */
function StepShell({
  title,
  status,
  children,
}: {
  title: string
  status: 'done' | 'current' | 'pending'
  children: ReactNode
}) {
  return (
    <div className={cx('pixel-step', `is-${status}`)} data-step-status={status}>
      <Label>{title}</Label>
      {status !== 'pending' && children}
    </div>
  )
}

/**
 * Cena de "Do clique ao pixel": 4 capítulos, cada um reaproveitando a
 * versão mini de uma ou mais estações já jogadas (design doc
 * `docs/design/clique-ao-pixel.md`). Usa `GameFrame`, `useTutorialSteps` e
 * `useNarration` como as demais estações.
 */
export default function PixelScene({
  phase,
  untimed,
  paused,
  speed,
  runId,
  onPauseChange,
  onRestart,
  onFinish,
}: SceneProps<PixelPhase>) {
  const [session, setSession] = useState<Session>(() => newSession(phase))
  const [threadPicked, setThreadPicked] = useState(false)

  const [seenRunId, setSeenRunId] = useState(runId)
  if (seenRunId !== runId) {
    setSeenRunId(runId)
    setSession(newSession(phase))
    setThreadPicked(false)
  }

  const tutorial = useTutorialSteps(phase.tutorial ?? NO_TUTORIAL_STEPS)
  const { narration, setInstruction } = useNarration({
    text: COPY.phases[phase.id]?.intro[0] ?? '',
    mood: 'neutral',
  })

  const { game, elapsed } = session

  // Instrução "parada" conforme o capítulo/passo atual avança.
  useEffect(() => {
    if (phase.chapter === 'entrada') {
      const stepId = phase.tutorial?.[tutorial.step]?.id
      const text = stepId
        ? UI.tutorialStep[stepId as keyof typeof UI.tutorialStep]
        : COPY.phases.tutorial?.intro[0]
      setInstruction({ text: text ?? '', mood: 'neutral' })
      return
    }
    const step = phase.steps[game.stepIndex]
    const text = step ? UI.step[step.id as keyof typeof UI.step]?.hint : COPY.phases[phase.id]?.intro[0]
    setInstruction({ text: text ?? '', mood: 'neutral' })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só muda com o passo/etapa do tutorial
  }, [phase, game.stepIndex, tutorial.step])

  const speedWithUntimed = untimed ? speed * 0.75 : speed
  const running = !paused && game.status === 'playing' && phase.secondsLimit > 0

  useGameLoop(
    (dt) => {
      if (untimed) return
      setSession((s) => {
        if (s.game.status !== 'playing') return s
        const elapsedNext = s.elapsed + dt
        if (phase.secondsLimit > 0 && elapsedNext >= phase.secondsLimit) {
          return { ...s, elapsed: elapsedNext, game: loseGame(s.game) }
        }
        return { ...s, elapsed: elapsedNext }
      })
    },
    { running, speed: speedWithUntimed },
  )

  const finishRef = useRef(onFinish)
  useEffect(() => {
    finishRef.current = onFinish
  })
  useEffect(() => {
    if (game.status === 'playing') return
    const o = computeOutcome(game, elapsed)
    const outcome: PhaseOutcome = {
      won: o.won,
      stars: o.stars,
      score: o.score,
      stats: [{ id: 'score', label: 'Pontos', value: String(o.score), tone: 'gold' }],
      ...(o.won ? {} : { failTitle: 'Tempo esgotado', failReason: 'Tente de novo.' }),
    }
    const t = window.setTimeout(() => finishRef.current(outcome), 500)
    return () => window.clearTimeout(t)
  }, [game, elapsed])

  function updateGame(fn: (g: PixelState) => PixelState) {
    setSession((s) => ({ ...s, game: fn(s.game) }))
  }

  function finishTutorial() {
    updateGame((g) => completeTutorial(g))
  }

  const goal = phase.steps.length || 64
  const done =
    phase.chapter === 'saida'
      ? game.bits.filter((b, i) => b === phase.targetImage?.[i]).length
      : game.stepIndex

  return (
    <GameFrame
      layoutClassName="pixel-layout"
      paused={paused}
      onPauseChange={onPauseChange}
      onRestart={onRestart}
      narration={narration}
      speakerRole={UI.speakerRole}
      level={
        <LevelBadge
          kicker={UI.chapterLabel[phase.chapter]}
          value={COPY.phases[phase.id]?.title ?? phase.id}
        />
      }
      hud={
        <div className="grid grid-cols-2 gap-2">
          {phase.secondsLimit > 0 && (
            <TimeStat
              remaining={Math.max(0, phase.secondsLimit - elapsed)}
              total={phase.secondsLimit}
              untimed={untimed}
            />
          )}
          {phase.chapter !== 'entrada' && <TasksStat done={Math.max(0, done)} goal={goal} />}
        </div>
      }
    >
      <div className="pixel-field">
        {phase.chapter === 'entrada' && (
          <StepShell title={UI.step.io.from} status="current">
            <div className="pixel-tutorial-field">
              {tutorial.step === 0 && (
                <Button
                  variant="cyan"
                  size="lg"
                  icon="io-mouse"
                  data-click-mouse
                  onClick={() => tutorial.advance('select')}
                >
                  {UI.mouseDevice}
                </Button>
              )}
              {tutorial.step >= 1 && tutorial.step < 2 && (
                <IoDevicePreview
                  device="mouse"
                  ringing
                  guarded={false}
                  guardLabel={UI.guardButton}
                  onGuard={() => {
                    tutorial.advance('select')
                  }}
                />
              )}
              {tutorial.step >= 2 && (
                <div className="pixel-tutorial-done">
                  <p>{UI.tutorialStep.resume}</p>
                  <Button
                    variant="gold"
                    size="md"
                    onClick={() => {
                      tutorial.advance('done')
                      finishTutorial()
                    }}
                  >
                    {UI.continueLabel}
                  </Button>
                </div>
              )}
            </div>
          </StepShell>
        )}

        {phase.chapter === 'decisao' && (
          <div className="pixel-steps">
            <StepShell
              title={UI.step.schedule.from}
              status={game.stepIndex > 0 ? 'done' : 'current'}
            >
              <div className="pixel-core-field">
                <Button
                  variant={threadPicked ? 'cyan' : 'ghost'}
                  size="md"
                  aria-pressed={threadPicked}
                  disabled={game.threadScheduled}
                  onClick={() => setThreadPicked(true)}
                >
                  {UI.core.occupied}
                </Button>
                <ProcessorPreview
                  cores={[coreModelFor(game.threadScheduled)]}
                  onTap={() => {
                    if (!threadPicked || game.threadScheduled) return
                    updateGame((g) => scheduleThread(g))
                  }}
                  className="pixel-core-grid"
                />
              </div>
            </StepShell>

            <StepShell
              title={UI.step.cycle.from}
              status={game.stepIndex > 1 ? 'done' : game.stepIndex === 1 ? 'current' : 'pending'}
            >
              {game.stepIndex >= 1 && (
                <div className="pixel-cycle-field">
                  <Registers
                    pc={0}
                    acc={game.cyclePulse === 'execute' ? 8 : 0}
                    pulse={game.cyclePulse === 'execute' ? 'acc' : null}
                  />
                  <p className="pixel-cycle-label">
                    {game.cyclePulse ? UI.cycle[game.cyclePulse] : UI.cycle.fetch}
                  </p>
                  <Button
                    variant="mint"
                    size="md"
                    onClick={() => updateGame((g) => runCycleStep(g))}
                  >
                    {UI.cycle.execute}
                  </Button>
                </div>
              )}
            </StepShell>

            <StepShell
              title={UI.step.alu.from}
              status={game.stepIndex > 2 ? 'done' : game.stepIndex === 2 ? 'current' : 'pending'}
            >
              {game.stepIndex >= 2 && (
                <OpSelector
                  value={game.aluOp}
                  onChange={(op) => updateGame((g) => selectAluOp(g, op))}
                  result={game.aluResult != null ? String(game.aluResult) : null}
                />
              )}
            </StepShell>
          </div>
        )}

        {phase.chapter === 'dados' && (
          <div className="pixel-steps">
            <StepShell
              title={UI.step.cache.from}
              status={game.stepIndex > 0 ? 'done' : 'current'}
            >
              <CacheSlots
                label={UI.cache.title}
                slots={[game.cacheRequests.length > 0 ? [CACHE_ADDRESS] : null]}
                awaitingEviction={false}
                flash={cacheFlash(game)}
              />
              {game.stepIndex === 0 && (
                <Button
                  variant="cyan"
                  size="md"
                  onClick={() => updateGame((g) => resolveCacheStep(g, CACHE_ADDRESS))}
                >
                  {fill(UI.cache.address, { n: CACHE_ADDRESS })}
                </Button>
              )}
            </StepShell>

            <StepShell
              title={UI.step.disk.from}
              status={game.stepIndex > 1 ? 'done' : game.stepIndex === 1 ? 'current' : 'pending'}
            >
              {game.stepIndex >= 1 && (
                <DiskGrid
                  blocks={diskBlocks(game, phase)}
                  columns={4}
                  onBlockClick={(i) => updateGame((g) => readDiskBlocks(g, i))}
                />
              )}
            </StepShell>
          </div>
        )}

        {phase.chapter === 'saida' && (
          <div className="pixel-grid-scroll">
            <div className="pixel-grid" role="group" aria-label={UI.pixels.title}>
              {game.bits.map((bit, i) => (
                <BitSwitch
                  key={i}
                  value={bit}
                  disabled={i < (phase.prefilledCount ?? 0)}
                  label={fill(UI.pixels.bitLabel, {
                    n: i + 1,
                    state: bit === 1 ? UI.pixels.on : UI.pixels.off,
                  })}
                  onToggle={() => updateGame((g) => togglePixelBit(g, i))}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </GameFrame>
  )
}

function coreModelFor(scheduled: boolean): CoreModel {
  return {
    index: 0,
    state: scheduled ? 'run' : 'free',
    hotWaiting: false,
    slots: [
      {
        index: 0,
        core: 0,
        thread: scheduled
          ? {
              id: 1,
              app: 'browser',
              task: 0,
              patience: 50,
              progress: 0,
              blocks: 0,
              blocked: false,
              preferred: -1,
            }
          : null,
        hot: false,
      },
    ],
  }
}

function cacheFlash(game: PixelState): CacheFlash | null {
  if (!game.lastCacheOutcome) return null
  return { address: CACHE_ADDRESS, kind: game.lastCacheOutcome }
}

function diskBlocks(game: PixelState, phase: PixelPhase): DiskBlockView[] {
  const seq = phase.diskSequence ?? []
  return Array.from({ length: 8 }, (_, i) => {
    const order = seq.indexOf(i)
    const isRead = order !== -1 && order < game.diskReadCount
    const isNext = seq[game.diskReadCount] === i
    const label =
      fill(UI.disk.blockLabel, { n: i + 1 }) +
      (isRead ? ', lido' : isNext ? ', toque para ler' : '')
    return {
      index: i,
      state: isRead ? 'occupied' : isNext ? 'highlighted' : 'free',
      label,
    }
  })
}
