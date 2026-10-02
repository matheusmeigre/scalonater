import { Suspense, useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router'
import { SHELL } from '@/content/shell'
import { audio } from '@/engine/audio/audioEngine'
import { usePageHidden } from '@/engine/loop/useGameLoop'
import { isPhaseUnlocked } from '@/engine/phases/progression'
import { useProgress } from '@/engine/store/progressStore'
import { useSettings } from '@/engine/store/settingsStore'
import type { DifficultyId, GameModule, PhaseBase, PhaseOutcome } from '@/engine/types'
import { getGame } from '@/games/registry'
import { announce } from '@/ui/Announcer'
import { Button } from '@/ui/Button'
import { Kernel } from '@/ui/Kernel'
import { Modal } from '@/ui/Modal'
import { Card, Paper } from '@/ui/Panel'
import { RichText } from '@/ui/RichText'
import { fill } from '@/ui/format'
import { useSession } from '../session'
import { useMusic } from '../useMusic'

type Stage = 'intro' | 'playing' | 'lost'

/** Nome curto da fase: "Tutorial" ou "Fase N". */
export function phaseLabel(game: GameModule, phase: PhaseBase) {
  if (phase.kind === 'tutorial') return SHELL.hub.tutorial
  const n = game.phases.filter((p) => p.kind === 'level').indexOf(phase) + 1
  return fill(SHELL.hub.phaseN, { n })
}

/** Velocidade extra só para testes automatizados (?speed=4). */
function speedFrom(params: URLSearchParams) {
  const v = Number(params.get('speed'))
  return Number.isFinite(v) && v > 0 ? Math.min(20, Math.max(0.25, v)) : 1
}

function PhaseIntro({
  game,
  phase,
  difficulty,
  untimed,
  onPlay,
}: {
  game: GameModule
  phase: PhaseBase
  difficulty: DifficultyId
  untimed: boolean
  onPlay: () => void
}) {
  const pc = game.copy.phases[phase.id]!
  const values = game.goalValues(phase, { difficulty, untimed })
  const levels = game.phases.filter((p) => p.kind === 'level').length
  const n = game.phases.filter((p) => p.kind === 'level').indexOf(phase) + 1
  const goal =
    untimed && phase.kind !== 'tutorial' ? (pc.goalUntimed ?? SHELL.intro.goalUntimed) : pc.goal
  return (
    <Card>
      <p className="m-0 mb-2 text-[13px] font-bold tracking-[2px] text-muted uppercase">
        {phase.kind === 'tutorial'
          ? SHELL.intro.kickerTutorial
          : fill(SHELL.intro.kicker, {
              phase: fill(SHELL.hub.phaseN, { n }),
              total: levels,
              difficulty: SHELL.difficulty[difficulty].name,
            })}
      </p>
      <h2
        id="intro-title"
        className="m-0 mb-3.5 text-[clamp(26px,5vw,42px)] tracking-[1px] uppercase"
      >
        {pc.title}
      </h2>
      <div className="flex flex-col gap-3 text-[#DAD7F2]">
        {pc.intro.map((t) => (
          <RichText key={t} as="p" className="m-0" text={t} />
        ))}
      </div>
      <h3 className="mt-5 mb-2 text-[15px] tracking-[2px] text-cyan uppercase">
        {pc.bulletsTitle}
      </h3>
      <ul className="m-0 flex flex-col gap-1.5 pl-5 text-[#DAD7F2]">
        {pc.bullets.map((b) => (
          <RichText key={b} as="li" text={b} />
        ))}
      </ul>
      <RichText as="p" className="mt-4 mb-0 font-semibold" text={`**${fill(goal, values)}**`} />
      <Paper className="my-5 px-4 py-3.5 sm:px-5">
        <span className="mb-1 block font-display text-[13px] tracking-[2px] text-violet uppercase">
          {SHELL.intro.realWorld}
        </span>
        <RichText as="p" tone="paper" className="m-0" text={pc.real} />
      </Paper>
      <Button size="lg" icon="play" autoFocus onClick={onPlay} className="w-full sm:w-auto">
        {fill(SHELL.intro.playPhase, { phase: phaseLabel(game, phase) })}
      </Button>
    </Card>
  )
}

export function PlayScreen() {
  useMusic('game')
  const { gameId, phaseId } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const game = getGame(gameId)
  const phaseIndex = game ? game.phases.findIndex((p) => p.id === phaseId) : -1
  const phase = game?.phases[phaseIndex]
  const autoplay = params.get('auto') === '1' && !!game?.meta.hasAutoplay
  const speed = speedFrom(params)

  const gp = useProgress((s) => (game ? s.progress.games[game.meta.id] : undefined))
  const recordPhaseWin = useProgress((s) => s.recordPhaseWin)
  const difficultySetting = useSettings((s) => s.difficulty)
  const untimed = useSettings((s) => s.untimed)
  const setSetting = useSettings((s) => s.set)
  const difficulty: DifficultyId = game?.meta.hasDifficulty ? difficultySetting : 'normal'
  const setLastResult = useSession((s) => s.setLastResult)

  const [stage, setStage] = useState<Stage>(autoplay ? 'playing' : 'intro')
  const [paused, setPaused] = useState(false)
  const [runId, setRunId] = useState(0)
  const [lost, setLost] = useState<PhaseOutcome | null>(null)

  const playing = stage === 'playing'
  const setPause = (v: boolean) => {
    if (stage !== 'playing') return
    setPaused(v)
    audio.play(v ? 'pause' : 'resume')
  }

  usePageHidden(() => {
    if (stage === 'playing') setPaused(true)
  })

  // Esc ou P pausam (com um modal aberto, o Esc é dele).
  useEffect(() => {
    if (stage !== 'playing' || paused) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        e.preventDefault()
        setPaused(true)
        audio.play('pause')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [stage, paused])

  const restart = () => {
    setLost(null)
    setPaused(false)
    setStage('playing')
    setRunId((r) => r + 1)
  }

  const onFinish = (outcome: PhaseOutcome) => {
    if (!game || !phase) return
    if (!outcome.won) {
      audio.play('lose')
      announce(outcome.failTitle ?? '', 'assertive')
      setLost(outcome)
      setStage('lost')
      return
    }
    audio.play('win')
    announce(SHELL.result.title, 'assertive')
    const record = outcome.autoplay
      ? null
      : recordPhaseWin({
          gameId: game.meta.id,
          phaseId: phase.id,
          stars: outcome.stars,
          score: outcome.score,
          cards: phase.unlocksCard ? [phase.unlocksCard] : [],
          allPhaseIds: game.phases.map((p) => p.id),
        })
    setLastResult({ gameId: game.meta.id, phaseId: phase.id, outcome, record })
    navigate(`/jogo/${game.meta.id}/${phase.id}/resultado`, { replace: true })
  }

  if (!game || !phase) return <Navigate to="/" replace />
  if (!autoplay && !isPhaseUnlocked(game.phases, phaseIndex, gp))
    return <Navigate to={`/jogo/${game.meta.id}`} replace />

  const Scene = game.Scene
  const exit = () => navigate(`/jogo/${game.meta.id}`)
  const easier: DifficultyId | null = game.meta.hasDifficulty
    ? difficulty === 'hard'
      ? 'normal'
      : difficulty === 'normal'
        ? 'easy'
        : null
    : null

  return (
    <>
      <h1 data-screen-title className="sr-only">
        {`${game.copy.title}: ${game.copy.phases[phase.id]?.title ?? ''}`}
      </h1>
      <Suspense fallback={<p className="p-6 text-muted">{SHELL.common.loading}</p>}>
        <Scene
          phase={phase}
          difficulty={difficulty}
          untimed={untimed}
          paused={!playing || paused}
          speed={speed}
          autoplay={autoplay}
          runId={runId}
          onPauseChange={setPause}
          onRestart={restart}
          onFinish={onFinish}
        />
      </Suspense>

      <Modal open={stage === 'intro'} labelledBy="intro-title" onDismiss={exit}>
        <PhaseIntro
          game={game}
          phase={phase}
          difficulty={difficulty}
          untimed={untimed}
          onPlay={() => {
            setStage('playing')
            setRunId((r) => r + 1)
          }}
        />
      </Modal>

      <Modal open={playing && paused} labelledBy="pause-title" onDismiss={() => setPause(false)}>
        <Card className="mx-auto max-w-[460px] text-center">
          <h2
            id="pause-title"
            className="m-0 mb-3 text-[clamp(28px,5vw,44px)] tracking-[1px] uppercase"
          >
            {SHELL.pause.title}
          </h2>
          <p className="m-0 mb-5 text-[#DAD7F2]">{SHELL.pause.body}</p>
          <div className="flex flex-col items-stretch gap-3">
            <Button variant="cyan" size="lg" icon="play" autoFocus onClick={() => setPause(false)}>
              {SHELL.pause.resume}
            </Button>
            <Button variant="orange" icon="restart" onClick={restart}>
              {SHELL.pause.restart}
            </Button>
            <Button variant="ghost" icon="map" onClick={exit}>
              {SHELL.pause.exit}
            </Button>
          </div>
        </Card>
      </Modal>

      <Modal open={stage === 'lost'} labelledBy="lose-title" onDismiss={exit}>
        {lost && (
          <Card tone="lose">
            <p className="m-0 mb-2 text-[13px] font-bold tracking-[2px] text-muted uppercase">
              {fill(SHELL.lose.kicker, {
                phase: phaseLabel(game, phase),
                difficulty: SHELL.difficulty[difficulty].name,
              })}
            </p>
            <h2
              id="lose-title"
              className="m-0 mb-3 text-[clamp(28px,5vw,44px)] tracking-[1px] text-danger uppercase"
            >
              {lost.failTitle}
            </h2>
            <p className="m-0 mb-1 text-xl text-muted">
              {lost.stats.find((s) => s.id === 'tasks')?.value}
            </p>
            <p className="m-0 text-[#DAD7F2]">{lost.failReason}</p>
            <Paper className="my-5 flex items-center gap-3 px-4 py-3">
              <span className="flex size-12 flex-none items-center justify-center rounded-[12px] bg-paper-ink">
                <Kernel mood="think" className="size-9" />
              </span>
              <div>
                <span className="mb-0.5 block font-display text-[13px] tracking-[2px] text-violet uppercase">
                  {SHELL.lose.tipTitle}
                </span>
                <RichText
                  as="p"
                  tone="paper"
                  className="m-0"
                  text={game.copy.phases[phase.id]?.tip ?? ''}
                />
              </div>
            </Paper>
            <div className="flex flex-wrap gap-3">
              <Button variant="orange" size="lg" icon="restart" autoFocus onClick={restart}>
                {SHELL.lose.retry}
              </Button>
              {easier && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSetting('difficulty', easier)
                    restart()
                  }}
                >
                  {fill(SHELL.lose.easier, { difficulty: SHELL.difficulty[easier].name })}
                </Button>
              )}
              {!untimed && (
                <Button
                  variant="ghost"
                  icon="infinity"
                  onClick={() => {
                    setSetting('untimed', true)
                    restart()
                  }}
                >
                  {SHELL.lose.untimed}
                </Button>
              )}
              <Button variant="ghost" icon="arrow-left" onClick={exit}>
                {SHELL.lose.exit}
              </Button>
            </div>
          </Card>
        )}
      </Modal>
    </>
  )
}
