import { useEffect, useRef, useSyncExternalStore } from 'react'
import { useStore } from 'zustand'
import type { PhaseOutcome, SceneProps } from '@/engine/types'
import { GameFrame } from '@/ui/GameFrame'
import { HudPanel, LevelBadge, ScoreStat, TasksStat } from '@/ui/Hud'
import { Label } from '@/ui/Panel'
import { Icon } from '@/ui/icons'
import { cx } from '@/ui/format'
import { MemoryShelf, MemoryTrip } from '@/games/shared/memory'
import { COPY, UI } from '../content'
import { PHASES, type CyclePhase, type TutorialHighlight } from '../phases'
import { computeOutcome } from '../logic/outcome'
import { CYCLE_OPS, decodeCellValue, formatInstruction } from '../logic/encode'
import { Registers } from './Registers'
import { useCycleSession } from './useCycleSession'
import './cycle.css'

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

export default function CycleScene({
  phase,
  untimed,
  paused,
  speed,
  runId,
  onPauseChange,
  onRestart,
  onFinish,
}: SceneProps<CyclePhase>) {
  const { store, config, actions } = useCycleSession({ phase, untimed, paused, speed, runId })
  const game = useStore(store, (s) => s.game)
  const narration = useStore(store, (s) => s.narration)
  const shelfPulse = useStore(store, (s) => s.shelfPulse)
  const registerPulse = useStore(store, (s) => s.registerPulse)
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
          id: 'tasks',
          label: UI.stats.executions,
          value: `${o.executedCount}/${o.totalExecutions}`,
          tone: 'ink',
        },
        { id: 'mistakes', label: UI.stats.mistakes, value: String(o.mistakes), tone: 'orange' },
      ],
      ...(o.won ? {} : { failTitle: UI.fail.title, failReason: UI.fail.reason }),
    }
    const t = window.setTimeout(() => finishRef.current(outcome), 600)
    return () => window.clearTimeout(t)
  }, [game])

  const shelfWrapRef = useRef<HTMLDivElement>(null)
  const fetchBoxRef = useRef<HTMLDivElement>(null)
  const tripFromRef = useRef<HTMLElement | null>(null)
  const tripToRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (!shelfPulse) {
      tripFromRef.current = null
      tripToRef.current = null
      return
    }
    const drawer =
      shelfWrapRef.current?.querySelector<HTMLElement>(`[data-address="${shelfPulse.address}"]`) ??
      null
    if (shelfPulse.kind === 'read') {
      tripFromRef.current = drawer
      tripToRef.current = fetchBoxRef.current
    } else {
      tripFromRef.current = fetchBoxRef.current
      tripToRef.current = drawer
    }
  }, [shelfPulse])

  const { stage, fetched, pc, acc } = game

  const fetchLabel = fetched ? formatInstruction(fetched) : '—'
  const registerPulseKind = registerPulse

  return (
    <GameFrame
      layoutClassName="cycle-layout"
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
          <TasksStat done={game.executedCount} goal={config.totalExecutions} />
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
      <div className="cycle-regs-wrap">
        <Registers pc={pc} acc={acc} pulse={registerPulseKind} />
      </div>

      <div className="cycle-stations" role="group" aria-label="Estações do ciclo da CPU">
        <div
          ref={fetchBoxRef}
          className={cx('cycle-station', stage === 'fetch' && 'is-current')}
          data-highlight={highlight === 'pc'}
          role="group"
          aria-label={`${UI.stations.fetch}: ${stage === 'fetch' ? 'pronta para buscar' : `instrução buscada, ${fetchLabel}`}`}
        >
          <span className="cycle-station-head">
            {stage === 'fetch' ? (
              <Icon name="clock" className="size-4" />
            ) : (
              <Icon name="check" className="size-4" />
            )}
            {UI.stations.fetch}
          </span>
          <span className="cycle-station-content">{fetchLabel}</span>
        </div>

        <div
          className={cx('cycle-station', stage === 'decode' && 'is-current')}
          data-highlight={highlight === 'palette'}
        >
          <span className="cycle-station-head">
            {stage === 'decode' ? (
              <Icon name="clock" className="size-4" />
            ) : stage === 'execute' ? (
              <Icon name="check" className="size-4" />
            ) : null}
            {UI.stations.decode}
          </span>
          <div className="cycle-palette" role="group" aria-label="Peças de instrução">
            {CYCLE_OPS.map((op) => (
              <button
                key={op}
                type="button"
                className="cycle-op-btn"
                disabled={stage !== 'decode'}
                onClick={() => actions.decode(op)}
              >
                {op}
              </button>
            ))}
          </div>
        </div>

        <div
          className={cx('cycle-station', stage === 'execute' && 'is-current')}
          data-highlight={highlight === 'execute-btn'}
        >
          <span className="cycle-station-head">{UI.stations.execute}</span>
          <button
            type="button"
            className="cycle-execute-btn"
            disabled={stage !== 'execute'}
            onClick={() => actions.execute()}
          >
            {UI.executeButton}
          </button>
        </div>
      </div>

      <div className="cycle-shelf-wrap" ref={shelfWrapRef}>
        <MemoryShelf
          cells={game.memory.cells}
          columns={columns}
          addressFormat="decimal"
          highlightAddress={stage === 'fetch' ? pc : null}
          pulse={shelfPulse}
          onSelect={(address) => {
            if (stage === 'fetch' && address === pc) actions.fetch()
          }}
          labelFor={(cell) => {
            const instr = decodeCellValue(cell.value)
            const content =
              cell.value === null ? 'vazia' : instr ? formatInstruction(instr) : String(cell.value)
            const pcNote = cell.address === pc ? ', ' + UI.aria.pcHighlight : ''
            return `Gaveta ${cell.address}, ${content}${pcNote}`
          }}
          renderValue={(value) => {
            if (value === null) return 'vazia'
            const instr = decodeCellValue(value)
            return instr ? formatInstruction(instr) : String(value)
          }}
        />
      </div>

      <MemoryTrip
        from={tripFromRef}
        to={tripToRef}
        tripKey={tripKey}
        durationMs={350}
        label={shelfPulse?.kind === 'read' ? fetchLabel : acc}
      />
    </GameFrame>
  )
}
