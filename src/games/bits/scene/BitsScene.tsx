import { useEffect, useRef, useState } from 'react'
import { SHELL } from '@/content/shell'
import { audio } from '@/engine/audio/audioEngine'
import { useGameLoop } from '@/engine/loop/useGameLoop'
import { randomSeed } from '@/engine/random'
import type { PhaseOutcome, SceneProps } from '@/engine/types'
import { BitRow, BitSwitch, formatBinary, fromBits } from '@/games/shared/binary'
import { announce } from '@/ui/Announcer'
import { GameFrame } from '@/ui/GameFrame'
import { LevelBadge, LivesStat, ScoreStat, TasksStat, TimeStat } from '@/ui/Hud'
import { Icon } from '@/ui/icons'
import { DifficultyPill } from '@/ui/Pill'
import { cx, fill } from '@/ui/format'
import { COPY, UI } from '../content'
import { resolveConfig } from '../logic/model'
import {
  clearBits,
  computeOutcome,
  createGame,
  markLost,
  missTarget,
  targetBits,
  toggleBit,
  upcomingTargets,
  type BitsEvent,
  type BitsState,
  type BitsTarget,
} from '../logic/rules'
import type { BitsPhase } from '../phases'
import './bits.css'

/** Duração real (ms, antes de dividir por `speed`) da pausa de comemoração/revelação. */
const MATCH_LOCK_MS = 700
const MISS_LOCK_MS = 1600
const SHAKE_MS = 300
const POPUP_MS = 700

interface Popup {
  id: number
  text: string
}

/** O que a cena mostra durante a pausa pós-acerto/erro, em vez do jogo "ao vivo". */
interface LockedView {
  kind: 'matched' | 'missed'
  target: BitsTarget
}

function newSession(phase: BitsPhase, goal: number) {
  return {
    game: createGame(phase, goal, randomSeed()),
    elapsed: 0,
    targetStartedAt: 0,
    letters: [] as string[],
    popups: [] as Popup[],
    shaking: false,
    locked: false,
    lockedView: null as LockedView | null,
  }
}

type Session = ReturnType<typeof newSession>

function targetText(phase: BitsPhase, target: BitsTarget): string {
  if (phase.targetKind === 'number') return String(target)
  if (phase.targetKind === 'letters') return phase.alphabet![target as number]!
  return ''
}

function numericValue(phase: BitsPhase, target: BitsTarget): number {
  return phase.targetKind === 'image' ? 0 : (target as number)
}

function matchAnnounceText(
  phase: BitsPhase,
  target: BitsTarget,
  done: number,
  goal: number,
): string {
  if (phase.targetKind === 'letters') {
    return fill(UI.announceLetterMatched, { letter: targetText(phase, target), done, goal })
  }
  if (phase.targetKind === 'image') return fill(UI.announceImageMatched, { done, goal })
  return fill(UI.announceMatched, { value: target as number, done, goal })
}

/** Miniatura só decorativa de um desenho-alvo (fila e pacote da Fase 5). */
function MiniImage({ bits, className }: { bits: readonly (0 | 1)[]; className?: string }) {
  return (
    <div className={cx('bits-mini-grid', className)} aria-hidden="true">
      {bits.map((b, i) => (
        <i key={i} className={b === 1 ? 'on' : undefined} />
      ))}
    </div>
  )
}

function QueueChip({ phase, target }: { phase: BitsPhase; target: BitsTarget }) {
  if (phase.targetKind === 'image') {
    return <div className="bits-chip bits-chip--image" />
  }
  return <div className="bits-chip">{targetText(phase, target)}</div>
}

/** Conteúdo do "pacote" viajando pela esteira: mistério até revelar (acerto/erro). */
function PacketBody({
  phase,
  target,
  revealed,
}: {
  phase: BitsPhase
  target: BitsTarget
  revealed: boolean
}) {
  if (phase.targetKind === 'image') {
    return <MiniImage bits={target as readonly (0 | 1)[]} className="bits-packet-grid" />
  }
  const binary = revealed
    ? formatBinary(numericValue(phase, target), phase.bitCount)
    : Array.from({ length: phase.bitCount / 4 }, () => '····').join(' ')
  return (
    <>
      <span className="bits-packet-value">{targetText(phase, target)}</span>
      <span className="bits-packet-binary">{binary}</span>
    </>
  )
}

/** Medidor de soma × alvo: não existe para a Fase 5 (desenho não é uma soma). */
function SumGauge({
  phase,
  bits,
  target,
}: {
  phase: BitsPhase
  bits: readonly (0 | 1)[]
  target: BitsTarget
}) {
  if (phase.targetKind === 'image') return null
  const max = 2 ** phase.bitCount - 1
  const sum = fromBits(bits)
  const t = numericValue(phase, target)
  const fillPct = (Math.min(sum, t) / max) * 100
  const overPct = sum > t ? ((sum - t) / max) * 100 : 0
  const markPct = (t / max) * 100
  const tone = sum === t ? 'hit' : sum > t ? 'over' : 'default'
  const statusText =
    sum === t
      ? UI.gaugeHit
      : sum > t
        ? fill(UI.gaugeOver, { value: sum - t })
        : fill(UI.gaugeShort, { value: t - sum })
  const ticks = [0, max * 0.25, max * 0.5, max * 0.75, max].map((n) => Math.round(n))

  return (
    <div className="bits-meter">
      <div className="bits-meter-top">
        <p className="bits-sum">
          {fill(UI.sum, { value: sum })}
          <small>{` (${formatBinary(sum, phase.bitCount)})`}</small>
        </p>
        <span className={cx('bits-status', `bits-status--${tone}`)}>{statusText}</span>
      </div>
      <div className="bits-gauge" aria-hidden="true">
        <i className="bits-gauge-fill" style={{ width: `${fillPct}%` }} />
        {overPct > 0 && (
          <i className="bits-gauge-over" style={{ left: `${markPct}%`, width: `${overPct}%` }} />
        )}
        <i className="bits-gauge-mark" style={{ left: `${markPct}%` }}>
          <span>{t}</span>
        </i>
      </div>
      <div className="bits-gauge-ticks" aria-hidden="true">
        {ticks.map((n, i) => (
          <span key={i}>{n}</span>
        ))}
      </div>
    </div>
  )
}

/**
 * Cena de Bits (README passo 6): pacotes de dados viajam por uma esteira até
 * a CPU, e o jogador acende os interruptores certos para decodificar o
 * número antes que o pacote chegue — senão, perde uma vida (`missTarget`).
 * `BitRow`/`BitSwitch` vêm de `shared/binary`, criado por esta estação.
 * Lógica pura em `logic/rules.ts`.
 */
export default function BitsScene({
  phase,
  difficulty,
  untimed,
  paused,
  speed,
  runId,
  onPauseChange,
  onRestart,
  onFinish,
}: SceneProps<BitsPhase>) {
  const config = resolveConfig(phase, { difficulty, untimed })
  const [session, setSession] = useState<Session>(() => newSession(phase, config.goal))
  const popupId = useRef(0)

  // Nova partida a cada recomeço ou troca de fase: ajustar o estado durante a
  // renderização evita um re-render extra de um efeito (ver engine/tutorial).
  const [seenRunId, setSeenRunId] = useState(runId)
  const [seenPhase, setSeenPhase] = useState(phase)
  if (seenRunId !== runId || seenPhase !== phase) {
    setSeenRunId(runId)
    setSeenPhase(phase)
    setSession(newSession(phase, config.goal))
  }

  const hasClock = phase.kind !== 'tutorial' && !untimed
  const falls = hasClock && config.perTargetTime > 0

  /** Processa os eventos de um toque/limpeza: pontos, anúncio, fila de acerto/queda. */
  function processResult(
    s: Session,
    prevTarget: BitsTarget,
    result: { state: BitsState; events: BitsEvent[] },
  ): Session {
    const { state, events } = result
    let letters = s.letters
    let completed: BitsTarget | null = null
    let cursor = prevTarget
    for (const e of events) {
      if (e.type === 'matched') {
        completed = cursor
        if (s.game.phase.targetKind === 'letters') {
          letters = [...letters, targetText(s.game.phase, cursor)]
        }
        announce(matchAnnounceText(s.game.phase, cursor, state.hits, state.targetCount), 'polite')
      }
      if (e.type === 'advanced') cursor = e.target
    }
    if (completed === null) return { ...s, game: state, letters }

    const delta = state.scoring.score - s.game.scoring.score
    const id = popupId.current++
    const popups = [...s.popups, { id, text: `+${delta}` }]
    window.setTimeout(
      () => setSession((s2) => ({ ...s2, popups: s2.popups.filter((p) => p.id !== id) })),
      POPUP_MS,
    )
    audio.play('done')
    const ms = MATCH_LOCK_MS / speed
    window.setTimeout(
      () =>
        setSession((s2) => ({
          ...s2,
          locked: false,
          lockedView: null,
          targetStartedAt: s2.elapsed,
        })),
      ms,
    )
    return {
      ...s,
      game: state,
      letters,
      popups,
      locked: true,
      lockedView: { kind: 'matched', target: completed },
    }
  }

  // Sem relógio (tutorial ou modo sem tempo), não há nada para o laço fazer:
  // evita ficar re-renderizando a cena a 60fps sem motivo (a Fase 5, com 64
  // interruptores, sente isso mais que as outras).
  useGameLoop(
    (dt) => {
      setSession((s) => {
        if (s.game.status !== 'playing' || s.locked) return s
        const elapsed = s.elapsed + dt
        if (elapsed >= config.time) return { ...s, elapsed, game: markLost(s.game) }
        if (!falls) return { ...s, elapsed }

        const before = Math.ceil(config.perTargetTime - (s.elapsed - s.targetStartedAt))
        const remainingNow = config.perTargetTime - (elapsed - s.targetStartedAt)
        const after = Math.ceil(remainingNow)
        if (after < before && after <= 3 && after > 0) audio.play('tick')
        if (remainingNow > 0) return { ...s, elapsed }

        const missedTarget = s.game.target
        const { state, events } = missTarget(s.game)
        if (!events.some((e) => e.type === 'missed')) return { ...s, elapsed, game: state }

        audio.play('blocked')
        announce(
          fill(UI.announceMissed, { lives: state.lives, maxLives: state.maxLives }),
          'assertive',
        )
        window.setTimeout(() => setSession((s2) => ({ ...s2, shaking: false })), SHAKE_MS)
        const ms = MISS_LOCK_MS / speed
        window.setTimeout(
          () =>
            setSession((s2) => ({
              ...s2,
              locked: false,
              lockedView: null,
              targetStartedAt: s2.elapsed,
            })),
          ms,
        )
        return {
          ...s,
          elapsed,
          game: state,
          locked: true,
          shaking: true,
          lockedView: { kind: 'missed', target: missedTarget },
        }
      })
    },
    { running: hasClock && !paused && session.game.status === 'playing', speed },
  )

  const finishRef = useRef(onFinish)
  useEffect(() => {
    finishRef.current = onFinish
  })
  useEffect(() => {
    if (session.game.status === 'playing' || session.locked) return
    const timeLeftFraction = hasClock
      ? Math.max(0, (config.time - session.elapsed) / config.time)
      : 1
    const o = computeOutcome(session.game, { untimed, timeLeftFraction })
    const fail = o.lostReason ? UI.fail[o.lostReason] : null
    const outcome: PhaseOutcome = {
      won: o.won,
      stars: o.stars,
      score: o.score,
      stats: [
        { id: 'score', label: UI.stats.score, value: String(o.score), tone: 'gold' },
        {
          id: 'targets',
          label: UI.stats.targets,
          value: `${session.game.hits}/${session.game.targetCount}`,
          tone: 'cyan',
        },
        ...(session.game.maxLives > 0
          ? [
              {
                id: 'hearts',
                label: UI.stats.hearts,
                value: String(Math.max(0, session.game.lives)),
                tone: 'orange' as const,
              },
            ]
          : []),
      ],
      ...(fail ? { failTitle: fail.title, failReason: fail.reason } : {}),
    }
    const t = window.setTimeout(() => finishRef.current(outcome), 500)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- config/untimed são estáveis por render de fase
  }, [session.game, session.locked])

  const { game } = session

  const onToggle = (index: number) => {
    setSession((s) => {
      if (s.locked || s.game.status !== 'playing') return s
      const prevTarget = s.game.target
      const result = toggleBit(s.game, index)
      const toggled = result.events.find(
        (e): e is Extract<BitsEvent, { type: 'toggled' }> => e.type === 'toggled',
      )
      if (toggled) audio.play(toggled.value === 1 ? 'select' : 'deselect')
      return processResult(s, prevTarget, result)
    })
  }
  const onToggleRef = useRef(onToggle)
  useEffect(() => {
    onToggleRef.current = onToggle
  })

  // Atalho de teclado: teclas 1 a N acendem o interruptor correspondente
  // direto, sem precisar focar (Tab/Enter/Espaço continuam funcionando,
  // ver `shared/binary`). Lido por uma ref para não precisar reassinar o
  // listener a cada quadro do laço do jogo.
  const keyGuard = useRef({ ready: false, bitCount: phase.bitCount })
  useEffect(() => {
    keyGuard.current = {
      ready: !paused && !session.locked && session.game.status === 'playing',
      bitCount: phase.bitCount,
    }
  })
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!keyGuard.current.ready) return
      const n = Number(e.key)
      if (Number.isInteger(n) && n >= 1 && n <= keyGuard.current.bitCount) {
        e.preventDefault()
        onToggleRef.current(n - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const onClear = () => {
    setSession((s) => {
      if (s.locked || s.game.status !== 'playing' || s.game.bits.every((b) => b === 0)) return s
      const prevTarget = s.game.target
      const result = clearBits(s.game)
      audio.play('deselect')
      return processResult(s, prevTarget, result)
    })
  }

  const pc = COPY.phases[phase.id]!
  const displayTarget = session.lockedView ? session.lockedView.target : game.target
  const displayBits = session.lockedView ? targetBits(phase, session.lockedView.target) : game.bits
  const progress =
    falls && game.status === 'playing'
      ? Math.min(1, Math.max(0, (session.elapsed - session.targetStartedAt) / config.perTargetTime))
      : session.lockedView
        ? 1
        : 0
  const danger = falls && !session.lockedView && progress > 0.72
  const upcoming = upcomingTargets(game, 2)
  const gridMod = session.lockedView?.kind === 'matched' ? 'matched' : session.lockedView?.kind

  return (
    <GameFrame
      layoutClassName="bits-layout"
      rootProps={{ 'data-bits-layout': phase.layout }}
      paused={paused}
      onPauseChange={onPauseChange}
      onRestart={onRestart}
      narration={{ text: pc.tip, mood: game.maxLives > 0 && game.lives <= 1 ? 'sad' : 'neutral' }}
      speakerRole={UI.speakerRole}
      level={
        <>
          <LevelBadge
            kicker="Fase"
            value={phase.kind === 'tutorial' ? 'T' : phase.id.replace('nivel-', '')}
          />
          <div className="min-w-0 flex-1">
            <h2 className="m-0 truncate text-[15px] tracking-[0.5px] roomy:text-[22px]">
              {pc.title}
            </h2>
            {phase.kind !== 'tutorial' && (
              <DifficultyPill difficulty={difficulty}>
                {SHELL.difficulty[difficulty].name}
              </DifficultyPill>
            )}
          </div>
        </>
      }
      hud={
        <div className="grid grid-cols-2 gap-2 roomy:grid-cols-4">
          <TimeStat
            remaining={hasClock ? Math.max(0, config.time - session.elapsed) : 0}
            total={config.time}
            untimed={!hasClock}
          />
          <TasksStat done={game.hits} goal={game.targetCount} />
          <ScoreStat score={game.scoring.score} combo={game.scoring.combo} />
          {game.maxLives > 0 && <LivesStat hearts={game.lives} max={game.maxLives} />}
        </div>
      }
    >
      <div className="bits-field">
        <div className="bits-popups" aria-hidden="true">
          {session.popups.map((p) => (
            <span key={p.id} className="bits-popup">
              {p.text}
            </span>
          ))}
        </div>

        {phase.targetKind === 'letters' && (
          <p className="bits-word">
            {fill(UI.wordProgress, { progress: [...session.letters, '_'].join(' ') })}
          </p>
        )}

        <div className="bits-board">
          <div className="bits-queue" aria-hidden="true">
            <span className="bits-queue-label">{UI.queueLabel}</span>
            <div className="bits-queue-chips">
              {upcoming.length ? (
                upcoming.map((t, i) => <QueueChip key={i} phase={phase} target={t} />)
              ) : (
                <div className="bits-chip bits-chip--empty">{UI.queueEmpty}</div>
              )}
            </div>
          </div>

          <div className="bits-track">
            <span className="bits-wire" aria-hidden="true" />
            {falls && (
              <span className="bits-danger" aria-hidden="true">
                <small>{UI.dangerLabel}</small>
              </span>
            )}
            <div
              className={cx(
                'bits-packet',
                danger && 'bits-packet--danger',
                session.lockedView?.kind === 'matched' && 'bits-packet--done',
                session.lockedView?.kind === 'missed' && 'bits-packet--missed',
              )}
              style={{ left: `calc((100% - var(--pw)) * ${progress})` }}
            >
              <PacketBody phase={phase} target={displayTarget} revealed={!!session.lockedView} />
            </div>
          </div>

          <div className={cx('bits-cpu', session.shaking && 'bits-cpu--hit')}>
            <Icon name="cores" className="bits-cpu-icon" />
            <b>{UI.cpuLabel}</b>
          </div>
        </div>

        {phase.targetKind === 'letters' && (
          <details className="bits-alphabet">
            <summary>{UI.alphabetTitle}</summary>
            <ul>
              {phase.alphabet!.map((l, i) => (
                <li key={l} className={i === game.target ? 'bits-alphabet-current' : undefined}>
                  {`${l} = ${formatBinary(i, phase.bitCount)}`}
                </li>
              ))}
            </ul>
          </details>
        )}

        {phase.layout === 'row' ? (
          <div className={cx('bits-grid-wrap', gridMod && `bits-grid-wrap--${gridMod}`)}>
            <BitRow
              bits={displayBits}
              showPlaceValues={phase.showPlaceValues}
              disabled={!!session.lockedView || paused}
              onChange={onToggle}
              labelPrefix="Interruptor"
            />
          </div>
        ) : paused ? (
          // Durante a abertura da fase ou a pausa, troca a grade interativa
          // (64 botões com SVG) por uma versão leve só visual: reduz o
          // trabalho de pintura da página bem na hora em que o cartão de
          // abertura precisa de estabilidade para o botão "Jogar".
          <div className="bits-grid-scroll">
            <div className="bits-grid" aria-hidden="true">
              {game.bits.map((b, i) => (
                <i key={i} className={b === 1 ? 'bits-pixel bits-pixel--on' : 'bits-pixel'} />
              ))}
            </div>
          </div>
        ) : (
          <div className={cx('bits-grid-wrap', gridMod && `bits-grid-wrap--${gridMod}`)}>
            <div className="bits-grid-scroll">
              <div className="bits-grid" role="group" aria-label={UI.imageGridLabel}>
                {displayBits.map((b, i) => (
                  <div key={i} data-bit={i}>
                    <BitSwitch
                      value={b}
                      disabled={!!session.lockedView || paused}
                      label={`Pixel linha ${Math.floor(i / 8) + 1}, coluna ${(i % 8) + 1}, ${
                        b === 1 ? UI.ariaOn : UI.ariaOff
                      }`}
                      onToggle={() => onToggle(i)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <SumGauge phase={phase} bits={displayBits} target={displayTarget} />

        <div className="bits-tools">
          <button
            type="button"
            className="bits-tool"
            onClick={onClear}
            disabled={!!session.lockedView || paused || game.bits.every((b) => b === 0)}
          >
            <Icon name="close" className="size-[18px]" />
            {UI.clearAll}
          </button>
        </div>
      </div>
    </GameFrame>
  )
}
