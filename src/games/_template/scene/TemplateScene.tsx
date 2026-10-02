import { useEffect, useRef, useState } from 'react'
import { useGameLoop } from '@/engine/loop/useGameLoop'
import { randomSeed } from '@/engine/random'
import type { PhaseOutcome, SceneProps } from '@/engine/types'
import { GameFrame } from '@/ui/GameFrame'
import { LevelBadge, TasksStat, TimeStat } from '@/ui/Hud'
import { fill } from '@/ui/format'
import { COPY, UI } from '../content'
import type { TemplatePhase } from '../phases'
import { computeOutcome, createGame, tap, type TemplateState } from '../logic/rules'
import './template.css'

const TARGET_COUNT = 4
const DURATION_S = 30

interface Session {
  game: TemplateState
  elapsed: number
}

function newSession(phase: TemplatePhase): Session {
  return { game: createGame(phase, TARGET_COUNT, randomSeed()), elapsed: 0 }
}

/**
 * Cena de exemplo (README, passo 6): usa `GameFrame` para a moldura comum
 * (painel de fase, HUD, controles, narrador) e desenha só o próprio campo
 * ("tocar no alvo certo"). Troque por sua mecânica — o que importa é manter
 * o padrão: `SceneProps` completo, `onFinish` ao fim, lógica pura em
 * `logic/`, e `useGameLoop` para o tempo (nunca `setInterval`/efeito).
 */
export default function TemplateScene({
  phase,
  paused,
  speed,
  runId,
  onPauseChange,
  onRestart,
  onFinish,
}: SceneProps<TemplatePhase>) {
  const [session, setSession] = useState<Session>(() => newSession(phase))

  // Nova partida a cada recomeço: ajustar o estado durante a renderização
  // evita um re-render extra de um efeito (ver engine/tutorial para o
  // mesmo padrão).
  const [seenRunId, setSeenRunId] = useState(runId)
  if (seenRunId !== runId) {
    setSeenRunId(runId)
    setSession(newSession(phase))
  }

  useGameLoop(
    (dt) => {
      setSession((s) => {
        if (s.game.status !== 'playing') return s
        const elapsed = s.elapsed + dt
        if (elapsed >= DURATION_S) return { ...s, elapsed, game: { ...s.game, status: 'lost' } }
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
    const o = computeOutcome(session.game)
    const outcome: PhaseOutcome = {
      won: o.won,
      stars: o.stars,
      score: o.score,
      stats: [{ id: 'score', label: 'Pontos', value: String(o.score), tone: 'gold' }],
      ...(o.won ? {} : { failTitle: 'Tempo esgotado', failReason: 'Tente de novo.' }),
    }
    const t = window.setTimeout(() => finishRef.current(outcome), 500)
    return () => window.clearTimeout(t)
  }, [session.game])

  const { game, elapsed } = session

  return (
    <GameFrame
      layoutClassName="template-layout"
      paused={paused}
      onPauseChange={onPauseChange}
      onRestart={onRestart}
      narration={{ text: COPY.opening[0] ?? '', mood: 'neutral' }}
      level={<LevelBadge kicker="Fase" value={COPY.phases[phase.id]?.title ?? phase.id} />}
      hud={
        <div className="grid grid-cols-2 gap-2">
          <TimeStat
            remaining={Math.max(0, DURATION_S - elapsed)}
            total={DURATION_S}
            untimed={false}
          />
          <TasksStat done={game.hits} goal={phase.goal} />
        </div>
      }
    >
      <div className="template-field">
        {Array.from({ length: TARGET_COUNT }, (_, i) => (
          <button
            key={i}
            type="button"
            className="template-target"
            aria-pressed={i === game.target}
            aria-label={fill(UI.targetLabel, { n: i + 1 })}
            onClick={() => setSession((s) => ({ ...s, game: tap(s.game, i) }))}
          />
        ))}
      </div>
    </GameFrame>
  )
}
