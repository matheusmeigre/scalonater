import { useEffect, useMemo, useRef } from 'react'
import { createMemory, MemoryShelf, MemoryTrip, writeMemory, type MemoryState } from '@/games/shared/memory'
import type { PhaseOutcome, SceneProps } from '@/engine/types'
import { GameFrame } from '@/ui/GameFrame'
import { HudPanel, LevelBadge } from '@/ui/Hud'
import { Icon } from '@/ui/icons'
import { Label } from '@/ui/Panel'
import { fill } from '@/ui/format'
import { COPY, UI } from '../content'
import { computeOutcome } from '../logic/outcome'
import { TRAVEL_SECONDS, PHASES, type CachePhase } from '../phases'
import { CacheSlots } from './CacheSlots'
import { useCacheSession } from './useCacheSession'
import './cache.css'

function buildRam(addressSpace: number): MemoryState {
  let mem = createMemory(addressSpace)
  for (let a = 0; a < addressSpace; a++) mem = writeMemory(mem, a, a).state
  return mem
}

export default function CacheScene(props: SceneProps<CachePhase>) {
  const { phase, untimed, paused, speed, runId, onPauseChange, onRestart, onFinish } = props
  const { game, narration, flash, config, actions } = useCacheSession({
    phase,
    untimed,
    paused,
    speed,
    runId,
  })

  const copy = COPY.phases[phase.id]!
  const levelNumber = PHASES.filter((p) => p.kind === 'level').indexOf(phase) + 1
  const ram = useMemo(() => buildRam(config.pattern.addressSpace), [config])

  const requestRef = useRef<HTMLDivElement>(null)
  const ramRef = useRef<HTMLDivElement>(null)

  const finishRef = useRef(onFinish)
  useEffect(() => {
    finishRef.current = onFinish
  })
  useEffect(() => {
    if (game.cache.status === 'playing') return
    const o = computeOutcome(game)
    const fail = o.lostReason ? UI.fail[o.lostReason] : null
    const outcome: PhaseOutcome = {
      won: o.won,
      stars: o.stars,
      score: o.score,
      stats: [
        { id: 'score', label: UI.stats.score, value: String(o.score), tone: 'gold' },
        {
          id: 'avgLatency',
          label: UI.stats.avgLatency,
          value: o.avgLatency.toFixed(1),
          tone: 'cyan',
        },
        { id: 'requests', label: UI.stats.requests, value: String(o.requestsDone), tone: 'mint' },
      ],
      ...(fail ? { failTitle: fail.title, failReason: fail.reason } : {}),
    }
    const t = window.setTimeout(() => finishRef.current(outcome), 600)
    return () => window.clearTimeout(t)
  }, [game])

  const traveling = game.travel !== null
  const avgLatency = game.cache.requestsDone > 0 ? game.cache.totalLatency / game.cache.requestsDone : 0
  const pendingAddress = game.travel?.address ?? flash?.address ?? null

  return (
    <GameFrame
      layoutClassName="cache-layout"
      paused={paused}
      onPauseChange={onPauseChange}
      onRestart={onRestart}
      narration={narration}
      speakerRole={UI.speakerRole}
      level={
        <>
          {phase.kind === 'tutorial' ? (
            <LevelBadge kicker="Fase" value={<Icon name="book" className="size-5 roomy:size-8" />} />
          ) : (
            <LevelBadge kicker="Fase" value={String(levelNumber)} />
          )}
          <div className="min-w-0">
            <h2 className="m-0 truncate text-[15px] tracking-[0.5px] roomy:text-[22px]">
              {copy.title}
            </h2>
          </div>
        </>
      }
      hud={
        <div className="grid min-w-0 grid-cols-2 gap-1.5 roomy:gap-3.5">
          <HudPanel>
            <Label>{UI.stats.avgLatency}</Label>
            <b className="font-display text-xl leading-none roomy:text-[28px]">
              {avgLatency.toFixed(1)}
            </b>
          </HudPanel>
          <HudPanel>
            <Label>{UI.stats.requests}</Label>
            <b className="font-display text-xl leading-none roomy:text-[28px]">
              {game.cache.requestsDone}/{config.requestsGoal}
            </b>
          </HudPanel>
        </div>
      }
    >
      <div className="cache-field">
        <div className="cache-request" ref={requestRef} data-traveling={traveling}>
          {pendingAddress !== null ? (
            <>
              <Icon name={traveling ? 'hourglass' : 'cache'} className="size-5" />
              <span>{fill(UI.requestAddress, { n: pendingAddress })}</span>
            </>
          ) : (
            <span>{UI.request}</span>
          )}
        </div>

        <section
          className="cache-level"
          data-level="l1"
          data-awaiting={game.awaitingEviction?.level === 'l1'}
          aria-labelledby="cache-l1-title"
        >
          <Label id="cache-l1-title">{UI.cacheL1}</Label>
          <CacheSlots
            label={UI.cacheL1}
            slots={game.cache.l1}
            awaitingEviction={game.awaitingEviction?.level === 'l1'}
            flash={flash}
            onEvict={actions.evict}
          />
          {game.awaitingEviction?.level === 'l1' && (
            <p className="cache-evict-hint">{UI.evictPrompt}</p>
          )}
        </section>

        {config.l2Slots > 0 && (
          <section
            className="cache-level"
            data-level="l2"
            data-awaiting={game.awaitingEviction?.level === 'l2'}
            aria-labelledby="cache-l2-title"
          >
            <Label id="cache-l2-title">{UI.cacheL2}</Label>
            <CacheSlots
              label={UI.cacheL2}
              slots={game.cache.l2}
              awaitingEviction={game.awaitingEviction?.level === 'l2'}
              flash={flash}
            />
          </section>
        )}

        <div className="cache-ram" ref={ramRef}>
          <Label>{UI.ramShelf}</Label>
          <MemoryShelf
            cells={ram.cells}
            columns={4}
            addressFormat="decimal"
            highlightAddress={pendingAddress}
          />
        </div>
      </div>

      <MemoryTrip
        from={requestRef}
        to={ramRef}
        tripKey={game.travelSeq}
        durationMs={TRAVEL_SECONDS * 1000}
        label={<Icon name="cache" className="size-5" />}
      />
    </GameFrame>
  )
}
