import { useEffect, useRef } from 'react'
import type { PhaseOutcome, SceneProps } from '@/engine/types'
import { GameFrame } from '@/ui/GameFrame'
import { LevelBadge, LivesStat, TasksStat, TimeStat } from '@/ui/Hud'
import { Label } from '@/ui/Panel'
import { cx, fill } from '@/ui/format'
import { COPY, UI } from '../content'
import { computeOutcome } from '../logic/outcome'
import { neighbors, packetNode } from '../logic/rules'
import { PHASES, type NetworkPhase } from '../phases'
import { useNetworkSession } from './useNetworkSession'
import './network.css'

export default function NetworkScene(props: SceneProps<NetworkPhase>) {
  const { phase, untimed, paused, speed, runId, onPauseChange, onRestart, onFinish } = props
  const { game, narration, config, actions } = useNetworkSession({
    phase,
    difficulty: props.difficulty,
    untimed,
    paused,
    speed,
    runId,
  })

  const copy = COPY.phases[phase.id]!
  const levelNumber = PHASES.filter((p) => p.kind === 'level').indexOf(phase) + 1

  const finishRef = useRef(onFinish)
  useEffect(() => {
    finishRef.current = onFinish
  })
  useEffect(() => {
    if (game.status === 'playing') return
    const o = computeOutcome(game)
    const fail =
      game.status === 'lost'
        ? game.hearts <= 0
          ? { title: UI.fail.hearts.title, reason: UI.fail.hearts.reason }
          : { title: UI.fail.timeout.title, reason: UI.fail.timeout.reason }
        : null
    const outcome: PhaseOutcome = {
      won: o.won,
      stars: o.stars,
      score: o.score,
      stats: [
        { id: 'score', label: UI.stats.score, value: String(o.score), tone: 'gold' },
        {
          id: 'delivered',
          label: UI.stats.delivered,
          value: `${game.delivered}/${game.messages.length}`,
          tone: 'cyan',
        },
        ...(phase.canLose
          ? [
              {
                id: 'hearts',
                label: UI.stats.hearts,
                value: String(game.hearts),
                tone: 'orange' as const,
              },
            ]
          : []),
      ],
      ...(fail ? { failTitle: fail.title, failReason: fail.reason } : {}),
    }
    const t = window.setTimeout(() => finishRef.current(outcome), 500)
    return () => window.clearTimeout(t)
  }, [game, copy, phase.canLose])

  const selectedPacket = game.selected ? game.packets[game.selected] : null
  const selectedAtNode = selectedPacket ? packetNode(config, selectedPacket) : null
  const reachable = selectedAtNode ? new Set(neighbors(config, selectedAtNode)) : null

  const availablePackets = Object.values(game.packets)
    .filter((p) => p.status === 'pending')
    .sort((a, b) => a.seq - b.seq)

  const activeMessage = game.messages[game.activeIndex]
  const boxes = activeMessage ? activeMessage.packetIds.map((id) => game.packets[id]!) : []

  const dnsNeeded = config.dns && !game.dnsResolved
  const transitingPackets = Object.values(game.packets).filter(
    (p) => p.status === 'transit' && p.location.kind === 'edge',
  )

  return (
    <GameFrame
      layoutClassName="network-layout"
      rootProps={{ 'data-dns': config.dns }}
      paused={paused}
      onPauseChange={onPauseChange}
      onRestart={onRestart}
      narration={narration}
      speakerRole={UI.speakerRole}
      level={
        <>
          <LevelBadge
            kicker={phase.kind === 'tutorial' ? 'Tutorial' : 'Fase'}
            value={phase.kind === 'tutorial' ? '•' : String(levelNumber)}
          />
          <div className="min-w-0">
            <h2 className="m-0 truncate text-[15px] tracking-[0.5px] roomy:text-[22px]">
              {copy.title}
            </h2>
          </div>
        </>
      }
      hud={
        <div className="grid min-w-0 grid-cols-2 gap-1.5 roomy:gap-3.5 side:grid-cols-3">
          <TimeStat
            remaining={Math.max(0, config.duration - game.elapsed)}
            total={config.duration}
            untimed={!config.timed}
          />
          <TasksStat done={game.delivered} goal={game.messages.length} />
          {phase.canLose && (
            <LivesStat hearts={game.hearts} max={config.startHearts} className="compact:hidden" />
          )}
        </div>
      }
    >
      <div className="network-field">
        {config.dns && (
          <section className="network-dns" data-dns-panel aria-labelledby="dns-title">
            <Label id="dns-title">{fill(UI.dnsPrompt, { name: config.dnsName ?? '' })}</Label>
            <div className="network-dns-options">
              {(config.dnsOptions ?? []).map((address) => (
                <button
                  key={address}
                  type="button"
                  data-dns-option={address}
                  className="network-btn"
                  aria-pressed={
                    game.dnsResolved &&
                    game.dnsCorrect &&
                    address === config.dnsOptions?.[config.dnsCorrectIndex ?? 0]
                  }
                  onClick={() => actions.resolveDns(address)}
                >
                  {fill(UI.dnsOption, { address })}
                </button>
              ))}
            </div>
            {game.dnsResolved && (
              <p className="network-dns-status" role="status">
                {game.dnsCorrect ? 'Endereço resolvido!' : 'Endereço errado — escolha outro.'}
              </p>
            )}
          </section>
        )}

        <section className="network-tray" data-tray aria-labelledby="tray-title">
          <Label id="tray-title">{UI.tray}</Label>
          <div className="network-tray-list">
            {availablePackets.length === 0 && <p className="m-0 text-sm text-muted">{'—'}</p>}
            {availablePackets.map((p) => {
              const atOrigin = p.location.kind === 'tray'
              const nodeId = atOrigin ? config.origin : packetNode(config, p)
              return (
                <button
                  key={p.id}
                  type="button"
                  data-packet={p.id}
                  data-selected={game.selected === p.id}
                  className={cx(
                    'network-packet',
                    game.selected === p.id && 'network-packet-selected',
                  )}
                  disabled={dnsNeeded}
                  aria-pressed={game.selected === p.id}
                  aria-label={
                    atOrigin
                      ? fill(UI.packetLabel, { n: p.seq })
                      : fill(UI.packetAt, { n: p.seq, node: nodeId })
                  }
                  onClick={() => actions.select(p.id)}
                >
                  {`#${p.seq}`}
                </button>
              )
            })}
          </div>
        </section>

        <section className="network-graph-wrap" data-graph aria-labelledby="graph-title">
          <Label id="graph-title">{UI.graph}</Label>
          <div className="network-graph">
            <svg
              className="network-links"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {config.links.map((l) => {
                const from = config.nodes.find((n) => n.id === l.from)!
                const to = config.nodes.find((n) => n.id === l.to)!
                const key = [l.from, l.to].sort().join('>')
                const congested = (game.linkLoad[key] ?? 0) >= l.capacity
                return (
                  <line
                    key={key}
                    x1={from.x * 100}
                    y1={from.y * 100}
                    x2={to.x * 100}
                    y2={to.y * 100}
                    className={cx('network-link', congested && 'network-link-congested')}
                  />
                )
              })}
            </svg>
            {transitingPackets.map((p) => {
              const loc = p.location
              if (loc.kind !== 'edge') return null
              const from = config.nodes.find((n) => n.id === loc.from)!
              const to = config.nodes.find((n) => n.id === loc.to)!
              const t = Math.min(1, loc.progress)
              const x = (from.x + (to.x - from.x) * t) * 100
              const y = (from.y + (to.y - from.y) * t) * 100
              return (
                <span
                  key={p.id}
                  className="network-packet-dot"
                  style={{ left: `${x}%`, top: `${y}%` }}
                  aria-hidden="true"
                >
                  {p.seq}
                </span>
              )
            })}
            {config.nodes.map((n) => {
              const isReachable = reachable?.has(n.id) ?? false
              const isOrigin = n.id === config.origin
              const isDestination = n.id === config.destination
              return (
                <button
                  key={n.id}
                  type="button"
                  data-node={n.id}
                  data-reachable={isReachable}
                  className={cx(
                    'network-node',
                    isOrigin && 'network-node-origin',
                    isDestination && 'network-node-destination',
                    isReachable && 'network-node-reachable',
                  )}
                  style={{ left: `${n.x * 100}%`, top: `${n.y * 100}%` }}
                  disabled={!isReachable}
                  aria-label={fill(UI.nodeLabel, { id: n.id })}
                  onClick={() => actions.forward(n.id)}
                >
                  {n.id}
                </button>
              )
            })}
          </div>
        </section>

        <section className="network-arrivals" data-arrivals aria-labelledby="arrivals-title">
          <Label id="arrivals-title">{UI.arrivals}</Label>
          <div className="network-boxes">
            {boxes.map((p) => (
              <div
                key={p.id}
                className={cx('network-box', p.status === 'delivered' && 'network-box-filled')}
                data-box={p.seq}
                data-filled={p.status === 'delivered'}
              >
                {p.status === 'delivered' ? p.seq : ''}
              </div>
            ))}
          </div>
        </section>
      </div>
    </GameFrame>
  )
}
