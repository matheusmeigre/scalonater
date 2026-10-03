import { useEffect, useRef } from 'react'
import { SHELL } from '@/content/shell'
import type { PhaseOutcome, SceneProps } from '@/engine/types'
import { GameFrame } from '@/ui/GameFrame'
import { HeartsInline, HudPanel, LevelBadge, LivesStat, TimeStat } from '@/ui/Hud'
import { Icon } from '@/ui/icons'
import { Label } from '@/ui/Panel'
import { Track } from '@/ui/Meter'
import { DifficultyPill } from '@/ui/Pill'
import { cx } from '@/ui/format'
import { DEVICE_COPY, COPY, UI } from '../content'
import { isUrgent } from '../logic/model'
import { computeOutcome } from '../logic/outcome'
import { PHASES, type IoPhase } from '../phases'
import { useIoSession } from './useIoSession'
import './io.css'

export default function IoScene(props: SceneProps<IoPhase>) {
  const { phase, difficulty, untimed, paused, speed, runId, onPauseChange, onRestart, onFinish } =
    props
  const { game, narration, tutorialStep, config, actions } = useIoSession({
    phase,
    difficulty,
    untimed,
    paused,
    speed,
    runId,
  })

  const copy = COPY.phases[phase.id]!
  const levelNumber = PHASES.filter((p) => p.kind === 'level').indexOf(phase) + 1
  const highlight = phase.tutorial?.[tutorialStep]?.highlight ?? null

  const finishRef = useRef(onFinish)
  useEffect(() => {
    finishRef.current = onFinish
  })
  useEffect(() => {
    if (game.status === 'playing') return
    const o = computeOutcome(game)
    const fail = o.lostReason ? UI.fail[o.lostReason] : null
    const outcome: PhaseOutcome = {
      won: o.won,
      stars: o.stars,
      score: o.score,
      stats: [
        { id: 'score', label: UI.stats.score, value: String(o.score), tone: 'gold' },
        { id: 'progress', label: UI.stats.progress, value: `${o.progressPercent}%`, tone: 'cyan' },
        ...(config.canLose
          ? [
              {
                id: 'hearts',
                label: UI.stats.hearts,
                value: String(Math.max(0, o.hearts)),
                tone: 'orange' as const,
              },
            ]
          : []),
        ...(config.compareMode
          ? [
              {
                id: 'energy',
                label: UI.stats.energy,
                value: String(o.energyWasted),
                tone: 'mint' as const,
              },
            ]
          : []),
      ],
      ...(fail ? { failTitle: fail.title, failReason: fail.reason } : {}),
    }
    const t = window.setTimeout(() => finishRef.current(outcome), 600)
    return () => window.clearTimeout(t)
  }, [game, config])

  const guardDisabled = game.contextStack.length > 0 || game.ringQueue.length === 0

  return (
    <GameFrame
      layoutClassName="io-layout"
      rootProps={{ 'data-compare': config.compareMode, 'data-dma': config.dma }}
      paused={paused}
      onPauseChange={onPauseChange}
      onRestart={onRestart}
      narration={narration}
      speakerRole={UI.speakerRole}
      level={
        <>
          {phase.kind === 'tutorial' ? (
            <LevelBadge
              kicker={SHELL.hud.mode}
              value={<Icon name="book" className="size-5 roomy:size-8" />}
            />
          ) : (
            <LevelBadge kicker={SHELL.hud.phase} value={String(levelNumber)} />
          )}
          <div className="min-w-0">
            <h2 className="m-0 truncate text-[15px] tracking-[0.5px] roomy:text-[22px]">
              {copy.title}
            </h2>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted roomy:mt-1 roomy:text-sm">
              {phase.kind === 'tutorial' ? (
                <DifficultyPill difficulty="easy">{SHELL.hud.tutorial}</DifficultyPill>
              ) : (
                <DifficultyPill difficulty={difficulty}>
                  {SHELL.difficulty[difficulty].name}
                </DifficultyPill>
              )}
              {config.canLose && (
                <HeartsInline hearts={game.hearts} max={config.hearts} className="roomy:hidden" />
              )}
            </div>
          </div>
        </>
      }
      hud={
        <div className="grid min-w-0 grid-cols-2 gap-1.5 roomy:gap-3.5 side:grid-cols-3">
          {config.timed ? (
            <TimeStat remaining={game.timeLeft} total={config.duration} untimed={!config.timed} />
          ) : (
            <HudPanel>
              <Label>{UI.stats.progress}</Label>
              <b className="font-display text-xl leading-none roomy:text-[28px]">
                {config.compareMode
                  ? Math.round(game.pollingProgress * 100)
                  : Math.round(game.mainProgress * 100)}
                %
              </b>
            </HudPanel>
          )}
          {config.compareMode ? (
            <HudPanel>
              <Label>{UI.energyWasted}</Label>
              <b className="font-display text-xl leading-none roomy:text-[28px]">
                {game.energyWasted}
              </b>
            </HudPanel>
          ) : (
            config.canLose && (
              <LivesStat hearts={game.hearts} max={config.hearts} className="compact:hidden" />
            )
          )}
        </div>
      }
    >
      {config.compareMode ? (
        <div className="io-compare" data-compare-field>
          <section className="io-track" aria-labelledby="polling-title">
            <Label id="polling-title">{UI.pollingTrack}</Label>
            <Track value={game.pollingProgress} tone="gold" />
            <button
              type="button"
              data-check
              className="io-btn io-btn-gold"
              onClick={actions.checkNow}
            >
              {UI.check}
            </button>
          </section>
          <section className="io-track" aria-labelledby="interrupt-title">
            <Label id="interrupt-title">{UI.interruptTrack}</Label>
            <Track value={game.interruptProgress} tone="mint" />
          </section>
        </div>
      ) : config.dma ? (
        <div className="io-dma" data-dma-field>
          <Label>{UI.dmaTrack}</Label>
          <Track value={game.dmaProgress} tone="cyan" />
          <div className="flex flex-wrap gap-2">
            {!game.dmaStarted && (
              <button
                type="button"
                data-dma-start
                className="io-btn io-btn-gold"
                onClick={actions.startDma}
              >
                {UI.start}
              </button>
            )}
            {game.dmaStarted && !game.dmaDone && (
              <button
                type="button"
                data-dma-chunk
                className="io-btn io-btn-ghost"
                onClick={actions.attendDmaChunk}
              >
                {UI.attendChunk}
              </button>
            )}
            {game.dmaDone && !game.dmaCollected && (
              <button
                type="button"
                data-dma-collect
                className="io-btn io-btn-gold"
                onClick={actions.collectDma}
              >
                {UI.collect}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="io-field">
          <section className="io-task" data-task aria-labelledby="task-title">
            <Label id="task-title">{UI.task}</Label>
            <Track
              value={game.mainProgress}
              tone={game.contextStack.length > 0 ? 'gold' : 'cyan'}
            />
            <p className="m-0 text-xs text-muted">{UI.taskHint}</p>
          </section>

          <section
            className="io-stack"
            data-stack
            data-depth={game.contextStack.length}
            aria-labelledby="stack-title"
            data-highlight={highlight === 'stack'}
          >
            <Label id="stack-title">{UI.stack}</Label>
            {game.contextStack.length > 0 ? (
              <div className="io-chip" role="status">
                {Math.round(game.contextStack[0]! * 100)}%
              </div>
            ) : (
              <p className="m-0 text-sm text-muted">{UI.stackEmpty}</p>
            )}
            <button
              type="button"
              data-guard-button
              className="io-btn io-btn-gold"
              disabled={guardDisabled}
              onClick={actions.pushContext}
            >
              {UI.guardButton}
            </button>
          </section>

          <section
            className="io-devices"
            data-devices
            aria-labelledby="devices-title"
            data-highlight={highlight === 'devices'}
          >
            <Label id="devices-title">{UI.devices}</Label>
            <div className="io-device-grid">
              {config.devices.map((d) => {
                const entry = game.ringQueue.find((r) => r.device === d)
                const ringing = !!entry
                const urgent = config.priority && isUrgent(d)
                const dc = DEVICE_COPY[d]
                return (
                  <button
                    key={d}
                    type="button"
                    data-device={d}
                    data-ringing={ringing}
                    className={cx('io-device', ringing && 'io-device-ringing')}
                    disabled={!ringing}
                    onClick={() => actions.attendDevice(d)}
                    aria-label={ringing ? `${dc.name}: ${UI.ringing}` : dc.name}
                  >
                    <Icon
                      name={dc.icon}
                      label={ringing ? `${dc.name}: ${UI.ringing}` : dc.name}
                      className="size-6 roomy:size-8"
                    />
                    <span className="io-device-name">{dc.name}</span>
                    {ringing && urgent && (
                      <Track value={entry.patience} tone="danger" className="io-device-patience" />
                    )}
                  </button>
                )
              })}
            </div>
          </section>
        </div>
      )}
    </GameFrame>
  )
}
