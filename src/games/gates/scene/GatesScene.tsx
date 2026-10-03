import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useEffect, useRef, useState } from 'react'
import { SHELL } from '@/content/shell'
import { useNarration } from '@/engine/narration/useNarration'
import { useGameLoop } from '@/engine/loop/useGameLoop'
import type { PhaseOutcome, SceneProps } from '@/engine/types'
import { CircuitSlot, GatePiece, evaluateCircuit, type GateType } from '@/games/shared/circuit'
import { BitSwitch } from '@/games/shared/binary'
import { Button } from '@/ui/Button'
import { GameFrame } from '@/ui/GameFrame'
import { LevelBadge, TasksStat, TimeStat } from '@/ui/Hud'
import { Icon } from '@/ui/icons'
import { Label } from '@/ui/Panel'
import { DifficultyPill } from '@/ui/Pill'
import { COPY, UI } from '../content'
import type { GatesPhase, PlayableGateType } from '../phases'
import {
  checkCircuit,
  clearGate,
  computeOutcome,
  createGame,
  expireTime,
  finishTutorial,
  placeGate,
  resolveTime,
  toggleInput,
  type GatesState,
} from '../logic/rules'
import './gates.css'

interface Session {
  game: GatesState
  elapsed: number
}

function newSession(phase: GatesPhase): Session {
  return { game: createGame(phase), elapsed: 0 }
}

/** Nós de entrada e de slot do template, na ordem declarada (para desenhar o circuito). */
function templateParts(phase: GatesPhase) {
  const inputs = phase.template.nodes.filter((n) => n.kind === 'input')
  const slots = phase.template.nodes.filter((n) => n.kind === 'slot')
  return { inputs, slots }
}

/** Avaliação em tempo real do circuito (só para o jogador explorar; a
 *  vitória de verdade é decidida por `checkCircuit`, que testa todos os
 *  casos da tabela-verdade, não só o caso visível agora). */
function livePreview(state: GatesState): boolean | null {
  const { slots } = templateParts(state.phase)
  if (slots.some((s) => state.placed[s.id] === undefined)) return null
  const circuit = state.phase.template.nodes.map((node) => {
    if (node.kind !== 'slot') return node
    return { kind: 'gate' as const, id: node.id, gate: state.placed[node.id]!, inputs: node.inputs }
  })
  const output = state.phase.template.nodes.find((n) => n.kind === 'output')
  if (!output || output.kind !== 'output') return null
  const values = evaluateCircuit(circuit, state.inputs)
  return values[output.input] ?? null
}

/** Linhas da tabela-verdade exibida (entradas em ordem binária crescente),
 *  junto do valor-alvo de cada caso — mesma convenção de `shared/circuit`. */
function displayRows(phase: GatesPhase): { bits: boolean[]; target: boolean }[] {
  const n = phase.inputCount
  return phase.targetTruthTable.map((target, combo) => ({
    bits: Array.from({ length: n }, (_, i) => ((combo >> (n - 1 - i)) & 1) === 1),
    target,
  }))
}

const STOCK_GATES: readonly PlayableGateType[] = ['AND', 'OR', 'NOT']

export default function GatesScene({
  phase,
  difficulty,
  untimed,
  paused,
  speed,
  runId,
  onPauseChange,
  onRestart,
  onFinish,
}: SceneProps<GatesPhase>) {
  const [session, setSession] = useState<Session>(() => newSession(phase))
  const [selectedGate, setSelectedGate] = useState<PlayableGateType | null>(null)
  const [draggingGate, setDraggingGate] = useState<GateType | null>(null)
  const [seenOn, setSeenOn] = useState(false)
  const [seenOff, setSeenOff] = useState(true) // começa desligado: já "viu" o estado inicial
  const timeLimit = resolveTime(phase, { difficulty, untimed })
  const narration = useNarration({
    text: COPY.phases[phase.id]?.intro[0] ?? '',
    mood: 'neutral',
  })

  const [seenRunId, setSeenRunId] = useState(runId)
  if (seenRunId !== runId) {
    setSeenRunId(runId)
    setSession(newSession(phase))
    setSelectedGate(null)
    setSeenOn(false)
    setSeenOff(true)
    narration.setInstruction({ text: COPY.phases[phase.id]?.intro[0] ?? '', mood: 'neutral' })
  }

  useGameLoop(
    (dt) => {
      setSession((s) => {
        if (s.game.status !== 'playing' || timeLimit === undefined) return s
        const elapsed = s.elapsed + dt
        if (elapsed >= timeLimit) return { ...s, elapsed, game: expireTime(s.game) }
        return { ...s, elapsed }
      })
    },
    { running: !paused && session.game.status === 'playing', speed },
  )

  const finishRef = useRef(onFinish)
  useEffect(() => {
    finishRef.current = onFinish
  })
  useEffect(() => {
    if (session.game.status === 'playing') return
    const o = computeOutcome(session.game, {
      timeLeft: timeLimit === undefined ? 0 : Math.max(0, timeLimit - session.elapsed),
      timeLimit: timeLimit ?? 0,
      untimed,
    })
    const outcome: PhaseOutcome = {
      won: o.won,
      stars: o.stars,
      score: o.score,
      stats: [{ id: 'score', label: UI.stats.score, value: String(o.score), tone: 'gold' }],
      ...(o.won ? {} : { failTitle: UI.fail.time.title, failReason: UI.fail.time.reason }),
    }
    const t = window.setTimeout(() => finishRef.current(outcome), 500)
    return () => window.clearTimeout(t)
  }, [session, timeLimit, untimed])

  const { game } = session
  const { inputs, slots } = templateParts(phase)
  const isTutorial = phase.kind === 'tutorial'
  const preview = livePreview(game)
  const copy = COPY.phases[phase.id]

  function onToggleInput(id: string) {
    const next = toggleInput(game, id)
    const on = next.inputs[id] === true
    const nextSeenOn = seenOn || (isTutorial && on)
    const nextSeenOff = seenOff || (isTutorial && !on)
    const finished = isTutorial && nextSeenOn && nextSeenOff
    setSession((s) => ({ ...s, game: finished ? finishTutorial(next) : next }))
    if (isTutorial) {
      setSeenOn(nextSeenOn)
      setSeenOff(nextSeenOff)
      narration.say(copy?.intro[0] ?? '', 'neutral')
    }
  }

  function onPlace(slotId: string, gate: PlayableGateType) {
    const { state } = placeGate(game, slotId, gate)
    setSession((s) => ({ ...s, game: state }))
    setSelectedGate(null)
    if (state.status === 'won') narration.say('Conseguiu! O circuito bate com a tabela.', 'happy')
  }

  function onClear(slotId: string) {
    setSession((s) => ({ ...s, game: clearGate(s.game, slotId) }))
  }

  function onPickStock(gate: PlayableGateType) {
    setSelectedGate((cur) => (cur === gate ? null : gate))
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  function onDragEnd(e: DragEndEvent) {
    setDraggingGate(null)
    const gate = e.active.data.current?.gate as PlayableGateType | undefined
    const target = e.over?.data.current?.target as { kind: 'slot'; slotId: string } | undefined
    if (gate && target) onPlace(target.slotId, gate)
  }

  const stock = game.stock
  const checkResult = checkCircuit(game)
  const mismatchStuck =
    checkResult.type === 'mismatch' && stock !== undefined && Object.values(stock).every((n) => (n ?? 0) === 0)

  const rows = displayRows(phase)

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e) => setDraggingGate((e.active.data.current?.gate as GateType) ?? null)}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDraggingGate(null)}
    >
      <GameFrame
        layoutClassName="gates-layout"
        paused={paused}
        onPauseChange={onPauseChange}
        onRestart={onRestart}
        narration={narration.narration}
        speakerRole={UI.speakerRole}
        level={
          <>
            <LevelBadge
              kicker="Fase"
              value={
                isTutorial ? (
                  <Icon name="book" className="size-5 roomy:size-8" />
                ) : (
                  String(phase.id.replace('nivel-', ''))
                )
              }
            />
            <div className="min-w-0 flex-1">
              <h2 className="m-0 truncate text-[15px] tracking-[0.5px] roomy:text-[22px]">
                {copy?.title ?? phase.id}
              </h2>
              {!isTutorial && (
                <DifficultyPill difficulty={difficulty}>
                  {SHELL.difficulty[difficulty].name}
                </DifficultyPill>
              )}
            </div>
          </>
        }
        hud={
          <div className="grid min-w-0 grid-cols-2 gap-1.5 roomy:gap-3.5">
            {timeLimit !== undefined ? (
              <TimeStat
                remaining={Math.max(0, timeLimit - session.elapsed)}
                total={timeLimit}
                untimed={false}
              />
            ) : (
              <TimeStat remaining={0} total={0} untimed />
            )}
            <TasksStat done={checkResult.type === 'won' ? phase.targetTruthTable.length : 0} goal={phase.targetTruthTable.length} />
          </div>
        }
      >
        <div className="gates-table" data-truth-table>
          <Label className="mb-1.5 block">{UI.table.title}</Label>
          <table className="gates-table-grid">
            <thead>
              <tr>
                {inputs.map((inp) => (
                  <th key={inp.id}>{inp.kind === 'input' ? inp.label : inp.id}</th>
                ))}
                <th>{'saída'}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} data-case={i}>
                  {row.bits.map((b, j) => (
                    <td key={j}>{b ? 1 : 0}</td>
                  ))}
                  <td className="gates-table-target">{row.target ? 1 : 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="gates-circuit" data-circuit>
          <div className="gates-circuit-inputs">
            {inputs.map((inp) =>
              inp.kind !== 'input' ? null : (
                <div key={inp.id} data-input={inp.id}>
                  <BitSwitch
                    value={game.inputs[inp.id] ? 1 : 0}
                    label={`Interruptor ${inp.label}, ${game.inputs[inp.id] ? 'ligado' : 'desligado'}`}
                    onToggle={() => onToggleInput(inp.id)}
                  />
                </div>
              ),
            )}
          </div>

          <div className="gates-circuit-slots">
            {slots.map((slot) =>
              slot.kind !== 'slot' ? null : (
                <CircuitSlot
                  key={slot.id}
                  id={slot.id}
                  gate={game.placed[slot.id]}
                  label={`Encaixe ${slot.id}, ${
                    game.placed[slot.id] ? `porta ${game.placed[slot.id]}` : 'vazio'
                  }`}
                  pendingGate={selectedGate}
                  onDrop={(gate) => onPlace(slot.id, gate as PlayableGateType)}
                  onClear={() => onClear(slot.id)}
                />
              ),
            )}
          </div>

          <div
            className="gates-lamp"
            data-lamp
            data-on={preview === true}
            role="img"
            aria-label={preview === null ? 'Lâmpada: incompleta' : preview ? 'Lâmpada ligada' : 'Lâmpada desligada'}
          >
            <Icon name="bits" />
            <span aria-hidden="true">{preview === null ? '?' : preview ? '1' : '0'}</span>
          </div>
        </div>

        <div className="gates-stock" data-stock>
          <Label className="mb-1.5 block">{UI.stock.title}</Label>
          <div className="gates-stock-pieces">
            {STOCK_GATES.map((gate) => (
              <GatePiece
                key={gate}
                id={`stock-${gate}`}
                gate={gate}
                remaining={stock ? stock[gate] ?? 0 : undefined}
                selected={selectedGate === gate}
                onPick={() => onPickStock(gate)}
              />
            ))}
          </div>
          {mismatchStuck && (
            <Button variant="orange" size="sm" className="mt-3 w-full" data-undo onClick={() => {
              const last = slots.find((s) => s.kind === 'slot' && game.placed[s.id])
              if (last) onClear(last.id)
            }}>
              {UI.undo.button}
            </Button>
          )}
        </div>
      </GameFrame>

      <DragOverlay dropAnimation={null}>
        {draggingGate && (
          <div className="gate-piece pointer-events-none">
            <span className="gate-piece-name">{draggingGate}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
