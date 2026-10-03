import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { advanceTutorialStep } from '@/engine/tutorial/useTutorialSteps'
import { useNarration } from '@/engine/narration/useNarration'
import type { PhaseOutcome, SceneProps } from '@/engine/types'
import { Button } from '@/ui/Button'
import { GameFrame } from '@/ui/GameFrame'
import { HudPanel, LevelBadge, TasksStat, TimeStat } from '@/ui/Hud'
import { Icon } from '@/ui/icons'
import { Label } from '@/ui/Panel'
import { cx, fill } from '@/ui/format'
import { KERNEL, TUTORIAL_STEPS, UI } from '../content'
import { SYSTEM_FILE, type StorageEvent, type StorageState } from '../logic/model'
import { computeOutcome } from '../logic/outcome'
import { applyOperation, chunksOf, createGame, defragment } from '../logic/rules'
import type { StorageDevice, StoragePhase, StorageTutorialTrigger } from '../phases'
import './storage.css'

function stepTextFor(phase: StoragePhase, index: number): string | null {
  const step = phase.tutorial?.[index]
  if (!step) return null
  const first = phase.operations[0]
  return fill(TUTORIAL_STEPS[step.id] ?? '', { goal: first?.sizeBlocks ?? 0 })
}

function describeEvents(
  events: readonly StorageEvent[],
): { text: string; mood: 'happy' | 'think' | 'sad' } | null {
  for (const e of events) {
    if (e.type === 'fragmented') {
      const secondChunk = e.chunks[1]
      const n = secondChunk?.[0] !== undefined ? secondChunk[0] + 1 : 0
      return { text: fill(KERNEL.fragmented, { n }), mood: 'think' }
    }
    if (e.type === 'no-space') return { text: KERNEL.noSpace, mood: 'sad' }
    if (e.type === 'defragmented') return { text: KERNEL.defragUsed, mood: 'happy' }
  }
  return null
}

export default function StorageScene({
  phase,
  paused,
  runId,
  onPauseChange,
  onRestart,
  onFinish,
}: SceneProps<StoragePhase>) {
  const steps = phase.tutorial ?? []
  const [game, setGame] = useState<StorageState>(() => createGame(phase))
  const [device, setDevice] = useState<StorageDevice>(phase.deviceModes[0] ?? 'hd')
  const [selected, setSelected] = useState<number[]>([])
  const [highlight, setHighlight] = useState<string | null>(null)
  const [armedDelete, setArmedDelete] = useState<string | null>(null)
  const [tutorialStep, setTutorialStep] = useState(0)
  const narration = useNarration({
    text: stepTextFor(phase, 0) ?? KERNEL.start,
    mood: 'neutral',
  })

  // Nova partida a cada recomeço: ajustar o estado durante a renderização
  // evita um re-render extra de um efeito (ver engine/tutorial).
  const [seenRunId, setSeenRunId] = useState(runId)
  if (seenRunId !== runId) {
    setSeenRunId(runId)
    setGame(createGame(phase))
    setDevice(phase.deviceModes[0] ?? 'hd')
    setSelected([])
    setHighlight(null)
    setArmedDelete(null)
    setTutorialStep(0)
    narration.setInstruction({ text: stepTextFor(phase, 0) ?? KERNEL.start, mood: 'neutral' })
  }

  const currentOp = phase.operations[game.opIndex]
  const tutorialDone = steps.length === 0 || tutorialStep >= steps.length

  function afterAction(next: StorageState, trigger: StorageTutorialTrigger | null) {
    setGame(next)
    let nextStep = tutorialStep
    if (trigger) {
      nextStep = advanceTutorialStep(steps, tutorialStep, trigger)
      setTutorialStep(nextStep)
    }
    if (steps.length > 0 && nextStep < steps.length) {
      const text = stepTextFor(phase, nextStep)
      if (text) {
        narration.say(text, 'happy')
        return
      }
    }
    const described = describeEvents(next.events)
    if (described) narration.say(described.text, described.mood, 'polite')
  }

  function onBlockClick(i: number) {
    if (game.status !== 'playing') return
    const owner = game.disk[i] ?? null
    if (currentOp?.kind === 'save' && owner === null) {
      const already = selected.includes(i)
      const nextSel = already ? selected.filter((b) => b !== i) : [...selected, i]
      if (nextSel.length === (currentOp.sizeBlocks ?? 0)) {
        const next = applyOperation(game, currentOp, device, nextSel)
        setSelected([])
        afterAction(next, 'save')
      } else {
        setSelected(nextSel)
      }
      return
    }
    if (owner && owner !== SYSTEM_FILE) {
      setHighlight(owner)
      if (steps.length > 0 && tutorialStep < steps.length) {
        const nextStep = advanceTutorialStep(steps, tutorialStep, 'search')
        setTutorialStep(nextStep)
        const text = stepTextFor(phase, nextStep)
        if (text) narration.say(text, 'happy')
      }
    }
  }

  function onFileRowClick(id: string) {
    setHighlight(id)
    if (currentOp?.kind === 'delete' && currentOp.fileId === id) setArmedDelete(id)
    if (steps.length > 0 && tutorialStep < steps.length) {
      const nextStep = advanceTutorialStep(steps, tutorialStep, 'search')
      setTutorialStep(nextStep)
      const text = stepTextFor(phase, nextStep)
      if (text) narration.say(text, 'happy')
    }
  }

  function confirmDelete() {
    if (!currentOp || currentOp.kind !== 'delete') return
    const next = applyOperation(game, currentOp, device)
    setArmedDelete(null)
    afterAction(next, null)
  }

  function onDefrag() {
    if (game.status !== 'playing') return
    const next = defragment(game)
    setGame(next)
    narration.say(KERNEL.defragUsed, 'happy', 'polite')
  }

  const finishRef = useRef(onFinish)
  useEffect(() => {
    finishRef.current = onFinish
  })
  useEffect(() => {
    if (game.status === 'playing') return
    if (!tutorialDone) return
    const o = computeOutcome(game)
    const fail = o.lostReason ? UI.fail[o.lostReason] : null
    const outcome: PhaseOutcome = {
      won: o.won,
      stars: o.stars,
      score: o.score,
      stats: [
        { id: 'tasks', label: UI.stats.ops, value: `${o.opsDone}/${o.opsGoal}`, tone: 'gold' },
        ...(phase.maxTotalTime
          ? [
              {
                id: 'time',
                label: UI.stats.time,
                value: `${o.totalTime}/${o.maxTotalTime}`,
                tone: 'cyan' as const,
              },
            ]
          : [
              {
                id: 'noSpace',
                label: UI.stats.noSpace,
                value: `${o.noSpaceCount}/3`,
                tone: 'orange' as const,
              },
            ]),
      ],
      ...(fail ? { failTitle: fail.title, failReason: fail.reason } : {}),
    }
    const t = window.setTimeout(() => finishRef.current(outcome), 500)
    return () => window.clearTimeout(t)
  }, [game, tutorialDone, phase])

  const pendingText = currentOp
    ? currentOp.kind === 'save'
      ? fill(UI.pending.save, { file: currentOp.fileId, size: currentOp.sizeBlocks ?? 0 })
      : fill(UI.pending.delete, { file: currentOp.fileId })
    : UI.pending.none

  const files = Object.values(game.files)

  return (
    <GameFrame
      layoutClassName="storage-layout"
      paused={paused}
      onPauseChange={onPauseChange}
      onRestart={onRestart}
      narration={narration.narration}
      speakerRole={UI.speakerRole}
      level={
        <>
          {phase.kind === 'tutorial' ? (
            <LevelBadge
              kicker="Fase"
              value={<Icon name="book" className="size-5 roomy:size-8" />}
            />
          ) : (
            <LevelBadge kicker="Fase" value={String(phase.id.replace('nivel-', ''))} />
          )}
          <div className="min-w-0 flex-1">
            <h2 className="m-0 truncate text-[15px] tracking-[0.5px] roomy:text-[22px]">
              {pendingText}
            </h2>
          </div>
        </>
      }
      extraControls={
        phase.deviceModes.length > 1 ? (
          <div role="radiogroup" aria-label={UI.device.label} className="flex gap-1.5">
            {phase.deviceModes.map((d) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={device === d}
                data-device={d}
                onClick={() => setDevice(d)}
                className={cx(
                  'h-11 min-w-11 rounded-[12px] border-2 px-3 text-[13px] font-bold uppercase',
                  device === d
                    ? 'border-cyan bg-tint-cyan text-cyan'
                    : 'border-line bg-panel text-muted',
                )}
              >
                {UI.device[d]}
              </button>
            ))}
          </div>
        ) : undefined
      }
      hud={
        <div className="grid min-w-0 grid-cols-2 gap-1.5 roomy:gap-3.5">
          <TasksStat done={game.opIndex} goal={phase.operations.length} />
          {phase.maxTotalTime ? (
            <TimeStat
              remaining={Math.max(0, phase.maxTotalTime - game.totalTime)}
              total={phase.maxTotalTime}
              untimed={false}
            />
          ) : (
            <HudPanel>
              <div className="flex items-center justify-between gap-2">
                <Label>{UI.stats.noSpace}</Label>
                <span className="text-xs font-bold tracking-[1px] text-gold roomy:text-sm">
                  {`${game.noSpaceCount}/3`}
                </span>
              </div>
            </HudPanel>
          )}
        </div>
      }
    >
      <div className="storage-table" data-file-table>
        <Label className="mb-1.5 block">{UI.table.title}</Label>
        {files.length === 0 ? (
          <p className="m-0 text-sm text-muted">{UI.table.empty}</p>
        ) : (
          <ul className="m-0 flex flex-col gap-1.5 p-0">
            {files.map((f) => {
              const chunks = chunksOf(f.blocks)
              return (
                <li key={f.id} className="list-none">
                  <button
                    type="button"
                    data-file={f.id}
                    aria-pressed={highlight === f.id}
                    onClick={() => onFileRowClick(f.id)}
                    className={cx(
                      'flex min-h-11 w-full items-center justify-between gap-2 rounded-md border-2 px-3 py-1.5 text-left',
                      highlight === f.id ? 'border-gold bg-panel-selected' : 'border-line bg-panel',
                    )}
                  >
                    <b className="font-display text-base">{f.id}</b>
                    <span className="text-xs text-muted">
                      {fill(UI.table.size, { size: f.sizeBlocks })}
                      {chunks.length > 1 ? ` · ${UI.table.fragmented}` : ''}
                    </span>
                  </button>
                  {armedDelete === f.id &&
                    currentOp?.kind === 'delete' &&
                    currentOp.fileId === f.id && (
                      <Button
                        variant="orange"
                        size="sm"
                        className="mt-1.5 w-full"
                        onClick={confirmDelete}
                      >
                        {fill(UI.table.delete, { file: f.id })}
                      </Button>
                    )}
                </li>
              )
            })}
          </ul>
        )}
        {phase.defragAvailable && (
          <Button
            variant="mint"
            size="sm"
            className="mt-3 w-full"
            data-defrag
            disabled={game.status !== 'playing'}
            onClick={onDefrag}
          >
            {UI.defrag.button}
            {game.defragUsed > 0 ? ` (${game.defragUsed}×)` : ''}
          </Button>
        )}
      </div>

      <div
        className="storage-disk"
        data-disk
        style={
          {
            '--storage-cols-mobile': phase.diskBlocks / phase.columns,
            '--storage-cols-desktop': phase.columns,
          } as CSSProperties
        }
      >
        {Array.from({ length: phase.diskBlocks }, (_, i) => {
          const owner = game.disk[i] ?? null
          const isSystem = owner === SYSTEM_FILE
          const isFree = owner === null
          const isSelected = selected.includes(i)
          const isHighlighted = !!owner && owner !== SYSTEM_FILE && owner === highlight
          const state = isSystem
            ? 'system'
            : isFree
              ? isSelected
                ? 'selected'
                : 'free'
              : isHighlighted
                ? 'highlighted'
                : 'occupied'

          let label: string
          let linkTo: number | null = null
          if (owner === SYSTEM_FILE) {
            label = fill(UI.disk.blockSystem, { n: i + 1 })
          } else if (owner === null) {
            label = isSelected
              ? fill(UI.disk.blockSelected, { n: i + 1, file: currentOp?.fileId ?? '' })
              : fill(UI.disk.blockFree, { n: i + 1 })
          } else {
            const entry = game.files[owner]!
            const chunks = chunksOf(entry.blocks)
            if (chunks.length <= 1) {
              label = fill(UI.disk.blockFile, { n: i + 1, file: owner })
            } else {
              const idx = chunks.findIndex((c) => c.includes(i))
              label = fill(UI.disk.blockFilePart, {
                n: i + 1,
                file: owner,
                part: idx + 1,
                total: chunks.length,
              })
              const chunk = chunks[idx]!
              if (idx < chunks.length - 1 && chunk[chunk.length - 1] === i) {
                linkTo = chunks[idx + 1]![0]!
              }
            }
          }

          return (
            <button
              key={i}
              type="button"
              data-block={i}
              data-state={state}
              aria-label={label}
              aria-pressed={isSelected || isHighlighted}
              disabled={game.status !== 'playing'}
              className="storage-block"
              onClick={() => onBlockClick(i)}
            >
              <span className="storage-block-n" aria-hidden="true">
                {i + 1}
              </span>
              {linkTo !== null && (
                <span className="storage-link" aria-hidden="true">
                  <Icon name="arrow-right" className="size-3" />
                  {fill(UI.disk.continuesAt, { n: linkTo + 1 })}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </GameFrame>
  )
}
