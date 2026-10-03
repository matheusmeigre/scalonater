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
import { randomSeed } from '@/engine/random'
import type { PhaseOutcome, SceneProps } from '@/engine/types'
import { BitRow, BitSwitch, formatBinary, fromBits } from '@/games/shared/binary'
import { CircuitSlot, GatePiece, type GateType } from '@/games/shared/circuit'
import { Button } from '@/ui/Button'
import { GameFrame } from '@/ui/GameFrame'
import { LevelBadge, TasksStat, TimeStat } from '@/ui/Hud'
import { Label } from '@/ui/Panel'
import { DifficultyPill } from '@/ui/Pill'
import { COPY, UI } from '../content'
import type { AluOp, AluPhase } from '../phases'
import {
  CIRCUIT_GATE_CHOICES,
  checkCircuitPhase,
  clearCircuitGate,
  computeAluOp,
  computeOutcome,
  confirmChallenge,
  confirmManualAnswer,
  createAluSelectGame,
  createCircuitGame,
  createManualGame,
  expireAluSelect,
  expireCircuit,
  expireManual,
  placeCircuitGate,
  resolveTime,
  selectAluOp,
  setAnswerBit,
  toggleCircuitInput,
  type AluSelectState,
  type CircuitPhaseState,
  type ManualState,
} from '../logic/rules'
import './alu.css'

type Game =
  | { mode: 'manual'; state: ManualState }
  | { mode: 'circuit'; state: CircuitPhaseState }
  | { mode: 'select'; state: AluSelectState }

interface Session {
  game: Game
  elapsed: number
  wrongFlash: boolean
}

function newGame(phase: AluPhase): Game {
  if (phase.mode === 'manual') return { mode: 'manual', state: createManualGame(phase, randomSeed()) }
  if (phase.mode === 'alu-select') return { mode: 'select', state: createAluSelectGame(phase) }
  return { mode: 'circuit', state: createCircuitGame(phase) }
}

function newSession(phase: AluPhase): Session {
  return { game: newGame(phase), elapsed: 0, wrongFlash: false }
}

function statusOf(game: Game): 'playing' | 'won' | 'lost' {
  return game.state.status
}

const OP_LABEL: Record<AluOp, string> = { add: UI.select.add, and: UI.select.and, or: UI.select.or }

/**
 * Cena única que atende os 3 modos da ULA (design doc `alu`, "Mecânica
 * principal"): soma manual coluna a coluna (tutorial, Fase 1), montagem de
 * circuito via `shared/circuit` (Fases 2-3) e o seletor de operação, fora do
 * padrão de circuito por decisão do design doc (Fase 4).
 */
export default function AluScene({
  phase,
  difficulty,
  untimed,
  paused,
  speed,
  runId,
  onPauseChange,
  onRestart,
  onFinish,
}: SceneProps<AluPhase>) {
  const [session, setSession] = useState<Session>(() => newSession(phase))
  const [selectedGate, setSelectedGate] = useState<GateType | null>(null)
  const [draggingGate, setDraggingGate] = useState<GateType | null>(null)
  const timeLimit = resolveTime(phase, { difficulty, untimed })
  const copy = COPY.phases[phase.id]
  const isTutorial = phase.kind === 'tutorial'
  const narration = useNarration({ text: copy?.intro[0] ?? '', mood: 'neutral' })

  const [seenRunId, setSeenRunId] = useState(runId)
  if (seenRunId !== runId) {
    setSeenRunId(runId)
    setSession(newSession(phase))
    setSelectedGate(null)
    narration.setInstruction({ text: copy?.intro[0] ?? '', mood: 'neutral' })
  }

  useGameLoop(
    (dt) => {
      setSession((s) => {
        if (statusOf(s.game) !== 'playing' || timeLimit === undefined) return s
        const elapsed = s.elapsed + dt
        if (elapsed < timeLimit) return { ...s, elapsed }
        const game = s.game
        const expired: Game =
          game.mode === 'manual'
            ? { mode: 'manual', state: expireManual(game.state) }
            : game.mode === 'circuit'
              ? { mode: 'circuit', state: expireCircuit(game.state) }
              : { mode: 'select', state: expireAluSelect(game.state) }
        return { ...s, elapsed, game: expired }
      })
    },
    { running: !paused && statusOf(session.game) === 'playing', speed },
  )

  const finishRef = useRef(onFinish)
  useEffect(() => {
    finishRef.current = onFinish
  })
  useEffect(() => {
    const status = statusOf(session.game)
    if (status === 'playing') return
    const swaps = session.game.mode === 'circuit' ? session.game.state.swaps : 0
    const o = computeOutcome(status, session.game.state.scoring, {
      timeLeft: timeLimit === undefined ? 0 : Math.max(0, timeLimit - session.elapsed),
      timeLimit: timeLimit ?? 0,
      untimed,
      swaps,
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
  const goal =
    phase.mode === 'manual'
      ? phase.targetCount ?? 1
      : phase.mode === 'alu-select'
        ? phase.challenges?.length ?? 1
        : phase.targetTruthTable?.length ?? 1
  const done =
    game.mode === 'manual' ? game.state.solved : game.mode === 'select' ? game.state.solved : 0

  function flashWrong(text: string) {
    narration.say(text, 'sad')
    setSession((s) => ({ ...s, wrongFlash: true }))
    window.setTimeout(() => setSession((s) => ({ ...s, wrongFlash: false })), 600)
  }

  function onConfirmManual() {
    if (game.mode !== 'manual') return
    const { state, event } = confirmManualAnswer(game.state)
    setSession((s) => ({ ...s, game: { mode: 'manual', state } }))
    if (event.type === 'wrong') flashWrong(UI.manual.wrong)
    else if (state.status === 'won') narration.say('Isso! A soma bateu certinho.', 'happy')
    else narration.say('Acertou! Próxima conta.', 'happy')
  }

  function onPlaceCircuit(slotId: string, gate: GateType) {
    if (game.mode !== 'circuit') return
    const { state } = placeCircuitGate(game.state, slotId, gate)
    setSession((s) => ({ ...s, game: { mode: 'circuit', state } }))
    setSelectedGate(null)
    if (state.status === 'won') narration.say('Conseguiu! O circuito bate em todos os casos.', 'happy')
  }

  function onClearCircuit(slotId: string) {
    if (game.mode !== 'circuit') return
    setSession((s) => ({ ...s, game: { mode: 'circuit', state: clearCircuitGate(game.state, slotId) } }))
  }

  function onToggleCircuitInput(id: string) {
    if (game.mode !== 'circuit') return
    setSession((s) => ({ ...s, game: { mode: 'circuit', state: toggleCircuitInput(game.state, id) } }))
  }

  function onConfirmSelect() {
    if (game.mode !== 'select') return
    const { state, event } = confirmChallenge(game.state)
    setSession((s) => ({ ...s, game: { mode: 'select', state } }))
    if (event.type === 'wrong') flashWrong(UI.select.wrong)
    else narration.say('Isso mesmo! Próximo desafio.', 'happy')
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  function onDragEnd(e: DragEndEvent) {
    setDraggingGate(null)
    const gate = e.active.data.current?.gate as GateType | undefined
    const target = e.over?.data.current?.target as { kind: 'slot'; slotId: string } | undefined
    if (gate && target) onPlaceCircuit(target.slotId, gate)
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e) => setDraggingGate((e.active.data.current?.gate as GateType) ?? null)}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDraggingGate(null)}
    >
      <GameFrame
        layoutClassName="alu-layout"
        paused={paused}
        onPauseChange={onPauseChange}
        onRestart={onRestart}
        narration={narration.narration}
        speakerRole={UI.speakerRole}
        level={
          <>
            <LevelBadge kicker="Fase" value={isTutorial ? 'T' : String(phase.id.replace('nivel-', ''))} />
            <div className="min-w-0 flex-1">
              <h2 className="m-0 truncate text-[15px] tracking-[0.5px] roomy:text-[22px]">
                {copy?.title ?? phase.id}
              </h2>
              {!isTutorial && (
                <DifficultyPill difficulty={difficulty}>{SHELL.difficulty[difficulty].name}</DifficultyPill>
              )}
            </div>
          </>
        }
        hud={
          <div className="grid min-w-0 grid-cols-2 gap-1.5 roomy:gap-3.5">
            {timeLimit !== undefined ? (
              <TimeStat remaining={Math.max(0, timeLimit - session.elapsed)} total={timeLimit} untimed={false} />
            ) : (
              <TimeStat remaining={0} total={0} untimed />
            )}
            <TasksStat done={done} goal={goal} />
          </div>
        }
      >
        {game.mode === 'manual' && (
          <ManualField
            state={game.state}
            wrongFlash={session.wrongFlash}
            onToggleBit={(i) => setSession((s) => ({ ...s, game: { mode: 'manual', state: setAnswerBit(game.state, i, game.state.answer[i] === 1 ? 0 : 1) } }))}
            onConfirm={onConfirmManual}
          />
        )}

        {game.mode === 'circuit' && (
          <CircuitField
            phase={phase}
            state={game.state}
            selectedGate={selectedGate}
            onToggleInput={onToggleCircuitInput}
            onPlace={onPlaceCircuit}
            onClear={onClearCircuit}
            onPickStock={(g) => setSelectedGate((cur) => (cur === g ? null : g))}
          />
        )}

        {game.mode === 'select' && (
          <SelectField state={game.state} wrongFlash={session.wrongFlash} onSelect={(op) => setSession((s) => ({ ...s, game: { mode: 'select', state: selectAluOp(game.state, op) } }))} onConfirm={onConfirmSelect} />
        )}
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

function ManualField({
  state,
  wrongFlash,
  onToggleBit,
  onConfirm,
}: {
  state: ManualState
  wrongFlash: boolean
  onToggleBit: (index: number) => void
  onConfirm: () => void
}) {
  const n = state.a.length
  return (
    <div className="alu-manual" data-manual>
      <div className="alu-manual-row" data-carry-row aria-hidden="true">
        {state.gabarito.columns.map((c, i) => (
          <span key={i} className="alu-carry-chip" data-on={c.carryOut === 1}>
            {c.carryOut === 1 ? '1' : ''}
          </span>
        ))}
      </div>
      <div className="alu-manual-row" data-row="a">
        <span className="alu-manual-label">{UI.manual.aLabel}</span>
        {state.a.map((b, i) => (
          <span key={i} className="alu-manual-digit">
            {b}
          </span>
        ))}
      </div>
      <div className="alu-manual-row" data-row="b">
        <span className="alu-manual-label">{UI.manual.bLabel}</span>
        {state.b.map((b, i) => (
          <span key={i} className="alu-manual-digit">
            {b}
          </span>
        ))}
      </div>
      <div className="alu-manual-rule" aria-hidden="true" />
      <div className="alu-manual-answer" data-answer>
        <BitRow
          bits={state.answer}
          disabled={state.status !== 'playing'}
          labelPrefix="Casa do resultado"
          onChange={onToggleBit}
        />
      </div>
      <Button
        variant="cyan"
        size="md"
        className={wrongFlash ? 'alu-shake' : undefined}
        data-confirm-manual
        disabled={state.status !== 'playing'}
        onClick={onConfirm}
      >
        {UI.manual.confirm}
      </Button>
      <p className="alu-manual-caption">
        {UI.manual.carryLabel}: {formatBinary(fromBits(state.gabarito.columns.map((c) => c.carryOut)), n)}
      </p>
    </div>
  )
}

function templateParts(phase: AluPhase) {
  const nodes = phase.template?.nodes ?? []
  return {
    inputs: nodes.filter((n) => n.kind === 'input'),
    slots: nodes.filter((n) => n.kind === 'slot'),
    outputs: nodes.filter((n) => n.kind === 'output'),
  }
}

function CircuitField({
  phase,
  state,
  selectedGate,
  onToggleInput,
  onPlace,
  onClear,
  onPickStock,
}: {
  phase: AluPhase
  state: CircuitPhaseState
  selectedGate: GateType | null
  onToggleInput: (id: string) => void
  onPlace: (slotId: string, gate: GateType) => void
  onClear: (slotId: string) => void
  onPickStock: (gate: GateType) => void
}) {
  const { inputs, slots, outputs } = templateParts(phase)
  const result = checkCircuitPhase(state)

  return (
    <div className="alu-circuit" data-circuit>
      <div className="alu-circuit-inputs">
        {inputs.map((inp) =>
          inp.kind !== 'input' ? null : (
            <div key={inp.id} data-input={inp.id}>
              <BitSwitch
                value={state.inputs[inp.id] ? 1 : 0}
                label={`Interruptor ${inp.label}, ${state.inputs[inp.id] ? 'ligado' : 'desligado'}`}
                onToggle={() => onToggleInput(inp.id)}
              />
              <span className="alu-circuit-input-label" aria-hidden="true">
                {inp.label}
              </span>
            </div>
          ),
        )}
      </div>

      <div className="alu-circuit-slots">
        {slots.map((slot) =>
          slot.kind !== 'slot' ? null : (
            <CircuitSlot
              key={slot.id}
              id={slot.id}
              gate={state.placed[slot.id]}
              label={`Encaixe ${slot.id}, ${state.placed[slot.id] ? `porta ${state.placed[slot.id]}` : 'vazio'}`}
              pendingGate={selectedGate}
              onDrop={(gate) => onPlace(slot.id, gate)}
              onClear={() => onClear(slot.id)}
            />
          ),
        )}
      </div>

      <div className="alu-circuit-outputs">
        {outputs.map((out) =>
          out.kind !== 'output' ? null : (
            <div
              key={out.id}
              className="alu-lamp"
              data-output={out.id}
              data-on={result.type === 'won'}
              role="img"
              aria-label={`${out.label}: ${result.type === 'won' ? 'correto' : 'ainda incompleto ou incorreto'}`}
            >
              <span aria-hidden="true">{out.label}</span>
            </div>
          ),
        )}
      </div>

      <div className="alu-circuit-stock" data-stock>
        <Label className="mb-1.5 block">{UI.circuit.stockTitle}</Label>
        <div className="alu-circuit-stock-pieces">
          {CIRCUIT_GATE_CHOICES.map((gate) => (
            <GatePiece key={gate} id={`stock-${gate}`} gate={gate} selected={selectedGate === gate} onPick={() => onPickStock(gate)} />
          ))}
        </div>
      </div>
    </div>
  )
}

function SelectField({
  state,
  wrongFlash,
  onSelect,
  onConfirm,
}: {
  state: AluSelectState
  wrongFlash: boolean
  onSelect: (op: AluOp) => void
  onConfirm: () => void
}) {
  const challenge = state.phase.challenges?.[state.challengeIndex]
  const bitCount = state.phase.bitCount
  const preview = state.selectedOp ? computeAluOp(challenge?.a ?? 0, challenge?.b ?? 0, state.selectedOp, bitCount) : null

  if (!challenge) return null

  return (
    <div className="alu-select" data-select>
      <p className="alu-select-prompt">
        {UI.select.title} <b>{OP_LABEL[challenge.op]}</b>{' '}
        {'de A e B?'}
      </p>
      <div className="alu-select-operands">
        <span>{'A = '}{formatBinary(challenge.a, bitCount)}</span>
        <span>{'B = '}{formatBinary(challenge.b, bitCount)}</span>
      </div>
      <div className="alu-select-ops" role="group" aria-label={UI.select.title}>
        {(['add', 'and', 'or'] as const).map((op) => (
          <Button
            key={op}
            variant={state.selectedOp === op ? 'cyan' : 'ghost'}
            size="md"
            data-select-op={op}
            aria-pressed={state.selectedOp === op}
            onClick={() => onSelect(op)}
          >
            {OP_LABEL[op]}
          </Button>
        ))}
      </div>
      {preview && (
        <p className="alu-select-preview" data-preview>
          {'= '}{formatBinary(fromBits(preview.result), bitCount)}
        </p>
      )}
      <Button
        variant="orange"
        size="md"
        className={wrongFlash ? 'alu-shake' : undefined}
        data-confirm-select
        disabled={state.selectedOp === null}
        onClick={onConfirm}
      >
        {UI.select.confirm}
      </Button>
    </div>
  )
}
