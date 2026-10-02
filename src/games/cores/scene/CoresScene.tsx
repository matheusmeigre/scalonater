import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useStore } from 'zustand'
import { SHELL } from '@/content/shell'
import { audio } from '@/engine/audio/audioEngine'
import type { PhaseOutcome, SceneProps } from '@/engine/types'
import {
  buildDndAnnouncements,
  liftAboveFinger,
  magnetCollision,
  useDragClickGuard,
} from '@/ui/dnd'
import { GameFrame } from '@/ui/GameFrame'
import { HeartsInline, LevelBadge, LivesStat, ScoreStat, TasksStat, TimeStat } from '@/ui/Hud'
import { Icon } from '@/ui/icons'
import { DifficultyPill } from '@/ui/Pill'
import { cx, fill } from '@/ui/format'
import { APPS_COPY, COPY, UI } from '../content'
import type { CoresState } from '../logic/model'
import { computeOutcome } from '../logic/outcome'
import {
  canDrop,
  coreHasHotThread,
  coreLoad,
  coreStalled,
  type DragSource,
  type DropTarget,
} from '../logic/rules'
import { PHASES, type CoresPhase } from '../phases'
import { Processor, type CoreModel } from './Processor'
import { ThreadCard, viewOf } from './ThreadCard'
import { IoZone, QueueZone } from './Zones'
import { useCoresSession } from './useCoresSession'
import './cores.css'

/** Ímã: perto do processador, a thread vai para o espaço livre mais próximo do dedo. */
const collision = magnetCollision('die', (id) => id.startsWith('slot:'), 40)

function buildCores(g: CoresState): CoreModel[] {
  return Array.from({ length: g.config.cores }, (_, c) => {
    const load = coreLoad(g, c)
    const state: CoreModel['state'] = coreStalled(g, c)
      ? 'stalled'
      : load >= 2
        ? 'shared'
        : load === 1
          ? 'run'
          : 'free'
    return {
      index: c,
      state,
      hotWaiting: coreHasHotThread(g, c),
      slots: g.slots
        .map((sl, i) => ({ sl, i }))
        .filter(({ sl }) => sl.core === c)
        .map(({ sl, i }) => {
          const t = sl.threadId === null ? null : g.threads[sl.threadId]
          return {
            index: i,
            core: c,
            thread: t ? viewOf(t, false) : null,
            hot: !!t && g.config.affinity && t.lastCore === c && !t.blocked,
          }
        }),
    }
  })
}

export default function CoresScene(props: SceneProps<CoresPhase>) {
  const {
    phase,
    difficulty,
    untimed,
    paused,
    speed,
    autoplay,
    runId,
    onPauseChange,
    onRestart,
    onFinish,
  } = props
  const { store, config, actions } = useCoresSession({
    phase,
    difficulty,
    untimed,
    autoplay,
    paused,
    speed,
    runId,
  })
  const game = useStore(store, (s) => s.game)
  const narration = useStore(store, (s) => s.narration)
  const dragging = useStore(store, (s) => s.dragging)
  const tutorialStep = useStore(store, (s) => s.tutorialStep)

  const copy = COPY.phases[phase.id]!
  const levelNumber = PHASES.filter((p) => p.kind === 'level').indexOf(phase) + 1
  const highlight = phase.tutorial?.[tutorialStep]?.highlight ?? null

  // Fim de partida: avisa o shell depois de um respiro para a última animação.
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
      autoplay,
      stats: [
        { id: 'score', label: UI.stats.score, value: String(o.score), tone: 'gold' },
        { id: 'tasks', label: UI.stats.tasks, value: `${o.done}/${o.goal}`, tone: 'ink' },
        {
          id: 'combo',
          label: UI.stats.combo,
          value: fill(SHELL.hud.comboValue, { n: o.maxCombo }),
          tone: 'orange',
        },
        { id: 'cpu', label: UI.stats.cpu, value: `${o.cpuPercent}%`, tone: 'mint' },
      ],
      ...(fail ? { failTitle: fail.title, failReason: fail.reason } : {}),
    }
    const t = window.setTimeout(() => finishRef.current(outcome), 700)
    return () => window.clearTimeout(t)
  }, [game, autoplay])

  // Clique que chega logo depois de um arraste não conta como toque.
  const { markDragEnd, wasRecentDrag } = useDragClickGuard()
  const onTapSlot = useCallback(
    (i: number) => {
      if (!wasRecentDrag()) actions.tapSlot(i)
    },
    [actions, wasRecentDrag],
  )
  const onTapThread = useCallback(
    (id: number) => {
      if (!wasRecentDrag()) actions.select(id)
    },
    [actions, wasRecentDrag],
  )

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const sourceOf = (e: DragStartEvent | DragEndEvent) =>
    e.active.data.current?.source as DragSource | undefined
  const onDragStart = (e: DragStartEvent) => {
    const src = sourceOf(e)
    if (!src) return
    actions.setDragging(src)
    audio.play('pick')
  }
  const onDragEnd = (e: DragEndEvent) => {
    markDragEnd()
    const src = sourceOf(e)
    actions.setDragging(null)
    const target = e.over?.data.current?.target as DropTarget | undefined
    if (src && target && canDrop(store.getState().game, src, target)) actions.drop(src, target)
    else audio.play('cancel')
  }
  const onDragCancel = () => {
    markDragEnd()
    actions.setDragging(null)
  }

  const queueViews = useMemo(
    () => game.queue.map((id) => viewOf(game.threads[id]!, config.affinity)),
    [game, config.affinity],
  )
  const ioViews = useMemo(() => game.io.map((id) => viewOf(game.threads[id]!, false)), [game])
  const cores = useMemo(() => buildCores(game), [game])

  const ghost = useMemo(() => {
    if (!dragging) return null
    const g = store.getState().game
    const id = dragging.kind === 'queue' ? dragging.threadId : g.slots[dragging.slot]?.threadId
    const t = id == null ? null : g.threads[id]
    return t ? viewOf(t, config.affinity) : null
  }, [dragging, store, config.affinity])

  const announcements = useMemo(() => {
    const appName = (data: Record<string, unknown> | undefined) => {
      const src = data?.source as DragSource | undefined
      const g = store.getState().game
      const id = src?.kind === 'queue' ? src.threadId : src ? g.slots[src.slot]?.threadId : null
      const t = id == null ? null : g.threads[id]
      return t ? APPS_COPY[t.app].name : ''
    }
    const targetName = (data: Record<string, unknown> | undefined) => {
      const t = data?.target as DropTarget | undefined
      if (!t) return ''
      if (t.kind === 'slot')
        return fill(UI.dnd.targetSlot, { n: (store.getState().game.slots[t.slot]?.core ?? 0) + 1 })
      return t.kind === 'queue' ? UI.dnd.targetQueue : UI.dnd.targetIo
    }
    return buildDndAnnouncements(
      {
        start: UI.dnd.start,
        over: UI.dnd.over,
        end: UI.dnd.end,
        endNowhere: UI.dnd.endNowhere,
        cancel: UI.dnd.cancel,
      },
      appName,
      targetName,
    )
  }, [store])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
      autoScroll={false}
      accessibility={{
        announcements,
        screenReaderInstructions: { draggable: UI.dnd.instructions },
      }}
    >
      <GameFrame
        layoutClassName="cores-layout"
        rootProps={{ 'data-io': config.io }}
        paused={paused}
        onPauseChange={onPauseChange}
        onRestart={onRestart}
        narration={narration}
        speakerRole={UI.speakerRole}
        level={
          <>
            {autoplay ? (
              <LevelBadge kicker={SHELL.hud.mode} value={SHELL.hud.auto} />
            ) : phase.kind === 'tutorial' ? (
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
                {config.patience && (
                  <HeartsInline hearts={game.hearts} max={config.hearts} className="roomy:hidden" />
                )}
                <span className="hidden side:inline">
                  {fill(config.slotsPerCore > 1 ? UI.cpuInfoSmt : UI.cpuInfo, {
                    cores: config.cores,
                  })}
                </span>
              </div>
            </div>
          </>
        }
        hud={
          <div
            className={cx(
              'grid min-w-0 gap-1.5 roomy:gap-3.5',
              config.patience ? 'grid-cols-3 roomy:grid-cols-4' : 'grid-cols-3',
              'side:grid-cols-[1fr_1fr_minmax(0,230px)_auto]',
            )}
            data-highlight={highlight === 'hud'}
          >
            <TimeStat remaining={game.timeLeft} total={config.duration} untimed={!config.timed} />
            <TasksStat done={game.done} goal={config.goal} />
            <ScoreStat score={game.scoring.score} combo={game.scoring.combo} />
            {config.patience && (
              <LivesStat hearts={game.hearts} max={config.hearts} className="compact:hidden" />
            )}
          </div>
        }
      >
        <Processor
          cores={cores}
          smt={config.slotsPerCore > 1}
          armed={game.selected !== null}
          dragging={dragging}
          queueEmpty={game.queue.length === 0}
          autoplay={autoplay}
          highlight={highlight === 'cpu' || highlight === 'slots' ? highlight : null}
          onTap={onTapSlot}
        />

        <QueueZone
          threads={queueViews}
          selected={game.selected}
          showPatience={config.patience}
          dragging={dragging}
          autoplay={autoplay}
          highlight={highlight === 'queue'}
          onTap={onTapThread}
        />

        {config.io && <IoZone threads={ioViews} dragging={dragging} />}
      </GameFrame>

      <DragOverlay dropAnimation={null} modifiers={[liftAboveFinger()]}>
        {ghost && (
          <div className="pointer-events-none h-[60px] w-[84px] roomy:h-[70px] roomy:w-[220px]">
            <ThreadCard view={ghost} showPatience={config.patience} variant="ghost" />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
