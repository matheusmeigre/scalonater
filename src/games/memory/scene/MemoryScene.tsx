import { useEffect, useRef, useSyncExternalStore } from 'react'
import { useStore } from 'zustand'
import type { PhaseOutcome, SceneProps } from '@/engine/types'
import { GameFrame } from '@/ui/GameFrame'
import { HudPanel, LevelBadge, ScoreStat, TasksStat } from '@/ui/Hud'
import { Track } from '@/ui/Meter'
import { Label } from '@/ui/Panel'
import { Icon } from '@/ui/icons'
import { fill } from '@/ui/format'
import { MemoryShelf, MemoryTrip } from '@/games/shared/memory'
import { COPY, UI } from '../content'
import { PHASES, type MemoryPhase, type TutorialHighlight } from '../phases'
import { computeOutcome } from '../logic/outcome'
import { useMemorySession } from './useMemorySession'
import './memory.css'

const COMPACT_QUERY = '(max-width: 759.98px), (orientation: landscape) and (max-height: 520px)'

function useCompact(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(COMPACT_QUERY)
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    () => window.matchMedia(COMPACT_QUERY).matches,
    () => false,
  )
}

export default function MemoryScene({
  phase,
  untimed,
  paused,
  speed,
  runId,
  onPauseChange,
  onRestart,
  onFinish,
}: SceneProps<MemoryPhase>) {
  const { store, config, actions } = useMemorySession({ phase, untimed, paused, speed, runId })
  const game = useStore(store, (s) => s.game)
  const narration = useStore(store, (s) => s.narration)
  const pulse = useStore(store, (s) => s.pulse)
  const tripKey = useStore(store, (s) => s.tripKey)
  const tutorialStep = useStore(store, (s) => s.tutorialStep)

  const compact = useCompact()
  const columns = Math.max(2, compact ? Math.floor(phase.columns / 2) : phase.columns)

  const copy = COPY.phases[phase.id]!
  const levelNumber = PHASES.filter((p) => p.kind === 'level').indexOf(phase) + 1
  const highlight: TutorialHighlight | null = phase.tutorial?.[tutorialStep]?.highlight ?? null

  const finishRef = useRef(onFinish)
  useEffect(() => {
    finishRef.current = onFinish
  })
  useEffect(() => {
    if (game.status === 'playing') return
    const o = computeOutcome(game)
    const outcome: PhaseOutcome = {
      won: o.won,
      stars: o.stars,
      score: o.score,
      stats: [
        { id: 'score', label: UI.stats.score, value: String(o.score), tone: 'gold' },
        {
          // id "tasks": a tela de derrota do shell (PlayScreen) procura esse
          // id para mostrar "{done} de {goal}" — convenção herdada do Núcleos.
          id: 'tasks',
          label: UI.stats.requests,
          value: `${o.requestsDone}/${o.requestsGoal}`,
          tone: 'ink',
        },
        { id: 'mistakes', label: UI.stats.mistakes, value: String(o.mistakes), tone: 'orange' },
      ],
      ...(o.won ? {} : { failTitle: UI.fail.title, failReason: UI.fail.reason }),
    }
    const t = window.setTimeout(() => finishRef.current(outcome), 600)
    return () => window.clearTimeout(t)
  }, [game])

  const ticketRef = useRef<HTMLButtonElement>(null)
  const shelfRef = useRef<HTMLDivElement>(null)
  // Ref estável: aponta para a gaveta do último pulso, atualizada fora da
  // renderização (efeito) para o `MemoryTrip` ler em `to.current`.
  const tripTargetRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    tripTargetRef.current = pulse
      ? (shelfRef.current?.querySelector<HTMLElement>(`[data-address="${pulse.address}"]`) ?? null)
      : null
  }, [pulse])

  const req = game.request

  const onTicketTap = () => {
    if (!req) return
    actions.submit({ type: 'select' })
  }
  const onDrawerTap = (address: number) => {
    actions.submit({ type: 'tap', address })
  }

  const ticketText = req
    ? req.kind === 'write'
      ? fill(UI.ticketWrite, { value: req.value, address: req.address })
      : fill(UI.ticketRead, { address: req.address })
    : ''

  return (
    <GameFrame
      layoutClassName="memory-layout"
      paused={paused}
      onPauseChange={onPauseChange}
      onRestart={onRestart}
      narration={narration}
      speakerRole={UI.speakerRole}
      level={
        <>
          {phase.kind === 'tutorial' ? (
            <LevelBadge
              kicker={UI.modeKicker}
              value={<Icon name="book" className="size-5 roomy:size-8" />}
            />
          ) : (
            <LevelBadge kicker={UI.phaseKicker} value={String(levelNumber)} />
          )}
          <div className="min-w-0">
            <h2 className="m-0 truncate text-[15px] tracking-[0.5px] roomy:text-[22px]">
              {copy.title}
            </h2>
          </div>
        </>
      }
      hud={
        <div className="grid grid-cols-3 gap-1.5 roomy:gap-3.5">
          <TasksStat done={game.requestsDone} goal={config.requestsGoal} />
          <ScoreStat score={game.scoring.score} combo={game.scoring.combo} />
          <HudPanel>
            <div className="flex items-center justify-between gap-2">
              <Label>{UI.stats.mistakes}</Label>
              <b className="font-display text-xl leading-none roomy:text-[28px]">
                {game.mistakes}
                {config.maxMistakes > 0 && (
                  <i className="text-xs text-muted not-italic roomy:text-lg">
                    /{config.maxMistakes}
                  </i>
                )}
              </b>
            </div>
          </HudPanel>
        </div>
      }
    >
      <button
        ref={ticketRef}
        type="button"
        className="memory-ticket"
        data-ticket
        data-highlight={highlight === 'ticket'}
        aria-pressed={game.selected}
        aria-label={
          req
            ? game.selected
              ? fill(UI.aria.ticketArmed, { address: req.address })
              : ticketText
            : UI.ticket
        }
        onClick={onTicketTap}
        disabled={!req}
      >
        <span className="memory-ticket-kind">{UI.ticket}</span>
        <span className="memory-ticket-value">{ticketText}</span>
        {req?.overwrite && (
          <span className="memory-ticket-badge">
            <Icon name="info" className="size-3.5" />
            {UI.ticketOverwriteBadge}
          </span>
        )}
        {config.timed && req && req.totalSeconds > 0 && (
          <Track value={req.secondsLeft / req.totalSeconds} tone="cyan" />
        )}
      </button>

      <div className="memory-shelf-wrap" ref={shelfRef} data-highlight={highlight === 'shelf'}>
        <MemoryShelf
          cells={game.memory.cells}
          columns={columns}
          addressFormat={config.addressFormat}
          highlightAddress={req && game.selected ? req.address : null}
          pulse={pulse}
          onSelect={onDrawerTap}
          labelFor={(cell) =>
            `Gaveta ${cell.address}, ${cell.value === null ? UI.aria.drawerEmpty : `conteúdo ${cell.value}`}`
          }
        />
      </div>

      <MemoryTrip
        from={ticketRef}
        to={tripTargetRef}
        tripKey={tripKey}
        durationMs={350}
        label={pulse ? (pulse.kind === 'write' ? pulse.value : pulse.address) : ''}
      />
    </GameFrame>
  )
}
