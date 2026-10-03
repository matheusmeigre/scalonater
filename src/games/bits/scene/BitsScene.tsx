import { useEffect, useRef, useState } from 'react'
import { useGameLoop } from '@/engine/loop/useGameLoop'
import { randomSeed } from '@/engine/random'
import type { PhaseOutcome, SceneProps } from '@/engine/types'
import { BitRow, BitSwitch, formatBinary, fromBits } from '@/games/shared/binary'
import { GameFrame } from '@/ui/GameFrame'
import { LevelBadge, TasksStat, TimeStat } from '@/ui/Hud'
import { announce } from '@/ui/Announcer'
import { fill } from '@/ui/format'
import { COPY, UI } from '../content'
import type { BitsPhase } from '../phases'
import { resolveConfig } from '../logic/model'
import {
  computeOutcome,
  createGame,
  markLost,
  toggleBit,
  type BitsState,
} from '../logic/rules'
import './bits.css'

function newSession(phase: BitsPhase, goal: number) {
  return { game: createGame(phase, goal, randomSeed()), elapsed: 0, letters: [] as string[] }
}

type Session = ReturnType<typeof newSession>

function targetLabel(phase: BitsPhase, game: BitsState, letters: string[]) {
  if (phase.targetKind === 'number') {
    return (
      <p className="bits-target-value">{fill(UI.targetNumber, { value: game.target as number })}</p>
    )
  }
  if (phase.targetKind === 'letters') {
    const letter = phase.alphabet![game.target as number]!
    const progress = [...letters, '_'].join(' ')
    return (
      <div>
        <p className="bits-target-value">{fill(UI.targetLetter, { letter })}</p>
        <p className="bits-word">{fill(UI.wordProgress, { progress })}</p>
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
      </div>
    )
  }
  const target = game.target as readonly (0 | 1)[]
  return (
    <div>
      <p className="bits-target-value">{UI.targetImage}</p>
      <div className="bits-grid bits-grid--preview" aria-hidden="true">
        {target.map((b, i) => (
          <i key={i} className={b === 1 ? 'bits-pixel bits-pixel--on' : 'bits-pixel'} />
        ))}
      </div>
    </div>
  )
}

/**
 * Cena de Bits (README passo 6): toque/clique/teclado nos interruptores,
 * sem arraste. `BitRow`/`BitSwitch` vêm de `shared/binary`, criado por esta
 * estação. Lógica pura em `logic/rules.ts`.
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

  // Sem relógio (tutorial ou modo sem tempo), não há nada para o laço fazer:
  // evita ficar re-renderizando a cena a 60fps sem motivo (a Fase 5, com 64
  // interruptores, sente isso mais que as outras).
  useGameLoop(
    (dt) => {
      setSession((s) => {
        if (s.game.status !== 'playing') return s
        const elapsed = s.elapsed + dt
        if (elapsed >= config.time) return { ...s, elapsed, game: markLost(s.game) }
        return { ...s, elapsed }
      })
    },
    { running: hasClock && !paused && session.game.status === 'playing', speed },
  )

  const finishRef = useRef(onFinish)
  useEffect(() => {
    finishRef.current = onFinish
  })
  useEffect(() => {
    if (session.game.status === 'playing') return
    const timeLeftFraction = hasClock
      ? Math.max(0, (config.time - session.elapsed) / config.time)
      : 1
    const o = computeOutcome(session.game, { untimed, timeLeftFraction })
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
      ],
      ...(o.won ? {} : { failTitle: UI.fail.title, failReason: UI.fail.reason }),
    }
    const t = window.setTimeout(() => finishRef.current(outcome), 500)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- config/untimed são estáveis por render de fase
  }, [session.game])

  const { game } = session

  const onToggle = (index: number) => {
    setSession((s) => {
      const { state, events } = toggleBit(s.game, index)
      let letters = s.letters
      for (const e of events) {
        if (e.type !== 'matched') continue
        const prevTarget = s.game.target
        if (s.game.phase.targetKind === 'letters') {
          letters = [...letters, s.game.phase.alphabet![prevTarget as number]!]
        }
        const msg =
          s.game.phase.targetKind === 'letters'
            ? fill(UI.announceLetterMatched, {
                letter: s.game.phase.alphabet![prevTarget as number]!,
                done: state.hits,
                goal: state.targetCount,
              })
            : s.game.phase.targetKind === 'image'
              ? fill(UI.announceImageMatched, { done: state.hits, goal: state.targetCount })
              : fill(UI.announceMatched, {
                  value: prevTarget as number,
                  done: state.hits,
                  goal: state.targetCount,
                })
        announce(msg, 'polite')
      }
      return { ...s, game: state, letters }
    })
  }

  const pc = COPY.phases[phase.id]!

  return (
    <GameFrame
      layoutClassName="bits-layout"
      rootProps={{ 'data-bits-layout': phase.layout }}
      paused={paused}
      onPauseChange={onPauseChange}
      onRestart={onRestart}
      narration={{ text: pc.tip, mood: 'neutral' }}
      speakerRole={UI.speakerRole}
      level={<LevelBadge kicker="Fase" value={pc.title} />}
      hud={
        <div className="grid grid-cols-2 gap-2">
          <TimeStat
            remaining={hasClock ? Math.max(0, config.time - session.elapsed) : 0}
            total={config.time}
            untimed={!hasClock}
          />
          <TasksStat done={game.hits} goal={game.targetCount} />
        </div>
      }
    >
      <div className="bits-target">{targetLabel(phase, game, session.letters)}</div>

      <div className="bits-field">
        {phase.layout === 'row' ? (
          <>
            <BitRow
              bits={game.bits}
              showPlaceValues={phase.showPlaceValues}
              onChange={onToggle}
              labelPrefix="Interruptor"
            />
            <p className="bits-sum">
              {fill(UI.sum, { value: fromBits(game.bits) })}
              {!phase.showPlaceValues && (
                <span className="bits-binary">
                  {` (${formatBinary(fromBits(game.bits), phase.bitCount)})`}
                </span>
              )}
            </p>
          </>
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
          <div className="bits-grid-scroll">
            <div className="bits-grid" role="group" aria-label={UI.imageGridLabel}>
              {game.bits.map((b, i) => (
                <div key={i} data-bit={i}>
                  <BitSwitch
                    value={b}
                    label={`Pixel linha ${Math.floor(i / 8) + 1}, coluna ${(i % 8) + 1}, ${
                      b === 1 ? UI.ariaOn : UI.ariaOff
                    }`}
                    onToggle={() => onToggle(i)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </GameFrame>
  )
}
