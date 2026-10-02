import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type Modifier,
} from '@dnd-kit/core'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useStore } from 'zustand'
import { SHELL } from '@/content/shell'
import { audio } from '@/engine/audio/audioEngine'
import { useSettings } from '@/engine/store/settingsStore'
import type { PhaseOutcome, SceneProps } from '@/engine/types'
import { buttonClass } from '@/ui/Button'
import { HeartsInline, LevelBadge, LivesStat, ScoreStat, TasksStat, TimeStat } from '@/ui/Hud'
import { Icon } from '@/ui/icons'
import { Narrator } from '@/ui/Narrator'
import { Panel } from '@/ui/Panel'
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
const MAGNET_PX = 40

const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args).filter((c) => c.id !== 'die')
  if (hits.length) return hits
  const p = args.pointerCoordinates
  const die = args.droppableRects.get('die')
  if (!p || !die) return []
  if (
    p.x < die.left - MAGNET_PX ||
    p.x > die.right + MAGNET_PX ||
    p.y < die.top - MAGNET_PX ||
    p.y > die.bottom + MAGNET_PX
  )
    return []
  let best: { id: string | number; d: number } | null = null
  for (const c of args.droppableContainers) {
    if (!String(c.id).startsWith('slot:')) continue
    const r = args.droppableRects.get(c.id)
    if (!r) continue
    const dx = Math.max(r.left - p.x, 0, p.x - r.right)
    const dy = Math.max(r.top - p.y, 0, p.y - r.bottom)
    const d = Math.hypot(dx, dy)
    if (!best || d < best.d) best = { id: c.id, d }
  }
  return best
    ? [
        {
          id: best.id,
          data: {
            droppableContainer: args.droppableContainers.find((c) => c.id === best.id),
            value: best.d,
          },
        },
      ]
    : []
}

/** No toque, a thread arrastada fica acima do dedo para não esconder o destino. */
const liftAboveFinger: Modifier = ({ transform, activatorEvent, draggingNodeRect }) => {
  const touch =
    activatorEvent &&
    'pointerType' in activatorEvent &&
    (activatorEvent as PointerEvent).pointerType === 'touch'
  if (!touch || !draggingNodeRect) return transform
  return { ...transform, y: transform.y - draggingNodeRect.height * 0.6 - 14 }
}

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
  const muted = useSettings((s) => s.muted)
  const toggleMute = useSettings((s) => s.toggle)

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
  const lastDragEnd = useRef(0)
  const recentlyDragged = () => performance.now() - lastDragEnd.current < 250
  const onTapSlot = useCallback(
    (i: number) => {
      if (!recentlyDragged()) actions.tapSlot(i)
    },
    [actions],
  )
  const onTapThread = useCallback(
    (id: number) => {
      if (!recentlyDragged()) actions.select(id)
    },
    [actions],
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
    lastDragEnd.current = performance.now()
    const src = sourceOf(e)
    actions.setDragging(null)
    const target = e.over?.data.current?.target as DropTarget | undefined
    if (src && target && canDrop(store.getState().game, src, target)) actions.drop(src, target)
    else audio.play('cancel')
  }
  const onDragCancel = () => {
    lastDragEnd.current = performance.now()
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

  const announcements = useMemo<Announcements>(() => {
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
    return {
      onDragStart: ({ active }) => fill(UI.dnd.start, { app: appName(active.data.current) }),
      onDragOver: ({ over }) =>
        over ? fill(UI.dnd.over, { target: targetName(over.data.current) }) : undefined,
      onDragEnd: ({ over }) =>
        over ? fill(UI.dnd.end, { target: targetName(over.data.current) }) : UI.dnd.endNowhere,
      onDragCancel: () => UI.dnd.cancel,
    }
  }, [store])

  const controlBtn =
    'roomy:h-[60px] roomy:min-w-[60px] roomy:rounded-lg roomy:px-6 roomy:text-[17px] roomy:[--d:6px] roomy:[&_svg]:size-6'

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
      <div className="cores-layout safe-pt safe-px safe-pb" data-io={config.io} data-game-active>
        {/* fase */}
        <Panel className="flex min-w-0 items-center gap-2.5 rounded-[12px] py-[5px] pr-2.5 pl-[5px] [grid-area:level] roomy:gap-3.5 roomy:rounded-lg roomy:py-2 roomy:pr-5 roomy:pl-3">
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
        </Panel>

        {/* HUD */}
        <div
          className={cx(
            'grid min-w-0 gap-1.5 [grid-area:stats] roomy:gap-3.5',
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

        {/* controles */}
        <div className="flex items-center justify-end gap-2 [grid-area:ctrl] roomy:gap-3">
          <button
            type="button"
            className={buttonClass('ghost', 'sm', controlBtn)}
            aria-label={muted ? SHELL.a11y.muteOn : SHELL.a11y.muteOff}
            aria-pressed={muted}
            onClick={() => toggleMute('muted')}
          >
            <Icon name={muted ? 'sound-off' : 'sound-on'} />
          </button>
          <button
            type="button"
            className={buttonClass('cyan', 'sm', controlBtn)}
            aria-label={SHELL.a11y.pause}
            onClick={() => onPauseChange(!paused)}
          >
            <Icon name="pause" />
            <span className="hidden side:inline">{SHELL.controls.pause}</span>
          </button>
          <button
            type="button"
            className={buttonClass('orange', 'sm', controlBtn)}
            aria-label={SHELL.a11y.restart}
            onClick={() => {
              audio.play('click')
              onRestart()
            }}
          >
            <Icon name="restart" />
            <span className="hidden side:inline">{SHELL.controls.restart}</span>
          </button>
        </div>

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

        <Narrator
          className="[grid-area:nar]"
          message={narration.text}
          mood={narration.mood}
          speaker={SHELL.opening.speaker}
          role={UI.speakerRole}
        />
      </div>

      <DragOverlay dropAnimation={null} modifiers={[liftAboveFinger]}>
        {ghost && (
          <div className="pointer-events-none h-[60px] w-[84px] roomy:h-[70px] roomy:w-[220px]">
            <ThreadCard view={ghost} showPatience={config.patience} variant="ghost" />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
