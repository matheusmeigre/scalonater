import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { SHELL } from '@/content/shell'
import { audio } from '@/engine/audio/audioEngine'
import { useGameLoop } from '@/engine/loop/useGameLoop'
import { randomSeed } from '@/engine/random'
import { useSettings } from '@/engine/store/settingsStore'
import type { PhaseOutcome, SceneProps } from '@/engine/types'
import { formatBinary, placeValue } from '@/games/shared/binary'
import { announce } from '@/ui/Announcer'
import { GameFrame } from '@/ui/GameFrame'
import { HudPanel, LevelBadge, LivesStat, ScoreStat } from '@/ui/Hud'
import type { KernelMood } from '@/ui/Kernel'
import { Label } from '@/ui/Panel'
import { DifficultyPill } from '@/ui/Pill'
import { Icon } from '@/ui/icons'
import { cx, fill } from '@/ui/format'
import { COPY, UI } from '../content'
import { resolveConfig } from '../logic/model'
import {
  advance,
  clearBits,
  computeOutcome,
  createGame,
  hintFor,
  letterOf,
  partsOf,
  peek,
  sumOf,
  tick,
  toggleBit,
  type BitsState,
  type BitsTarget,
} from '../logic/rules'
import type { BitsPhase } from '../phases'
import './bits.css'

/** Tempos do protótipo (ms reais, divididos pela velocidade do jogo). */
const T = {
  countStep: 650,
  countGo: 550,
  afterSuccess: 1300,
  afterFail: 2600,
  peek: 3000,
  idleHint: 6000,
  cpuHit: 400,
  finish: 500,
}

const CONFETTI = [
  'var(--color-mint)',
  'var(--color-gold)',
  'var(--color-cyan)',
  'var(--color-orange)',
]

interface Say {
  text: string
  mood: KernelMood
}

/* ---------- textos derivados do alvo ---------- */

function labelOf(phase: BitsPhase, t: BitsTarget): string {
  if (phase.targetKind === 'letters') return letterOf(t as number)
  if (phase.targetKind === 'number') return String(t)
  return ''
}

function binOf(phase: BitsPhase, n: number): string {
  return formatBinary(n, phase.bitCount)
}

function unknownBin(phase: BitsPhase): string {
  return Array.from({ length: phase.bitCount / 4 }, () => UI.unknownBinary).join(' ')
}

function placesList(phase: BitsPhase): string {
  return Array.from({ length: phase.bitCount }, (_, i) => placeValue(i, phase.bitCount)).join(', ')
}

function packetLine(g: BitsState): string {
  const { phase } = g
  if (phase.targetKind === 'image') return UI.say.image
  if (phase.targetKind === 'letters') {
    return fill(UI.say.letter, { letter: labelOf(phase, g.target), code: g.target as number })
  }
  const target = g.target as number
  const isLast = g.targets.length > 1 && g.idx === g.targets.length - 1
  if (isLast) return fill(UI.say.lastPacket, { target })
  const tpl = UI.say.packets[g.idx] ?? UI.say.packets[1]
  return fill(tpl, { target, places: placesList(phase) })
}

function successLine(g: BitsState): string {
  const { phase } = g
  const combo = g.combo > 2 ? fill(UI.say.comboNext, { n: g.combo }) : ''
  if (phase.targetKind === 'image') return UI.say.successImage + combo
  const parts = partsOf(phase, g.target).join(' + ')
  if (phase.targetKind === 'letters') {
    const code = g.target as number
    return fill(UI.say.successLetter, { letter: labelOf(phase, code), code, parts }) + combo
  }
  return fill(UI.say.success, { target: g.target as number, parts }) + combo
}

function failLine(g: BitsState): string {
  const { phase } = g
  if (phase.targetKind === 'image') return UI.say.failImage
  const code = g.target as number
  const vars = { target: code, code, letter: labelOf(phase, code), binary: binOf(phase, code) }
  const parts = partsOf(phase, code).join(' + ')
  return fill(phase.targetKind === 'letters' ? UI.say.failLetter : UI.say.fail, { ...vars, parts })
}

/* ---------- peças visuais ---------- */

function Bulb() {
  return (
    <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2.5a6.5 6.5 0 0 0-3.8 11.8c.7.5 1.1 1.3 1.1 2.2v.5h5.4v-.5c0-.9.4-1.7 1.1-2.2A6.5 6.5 0 0 0 12 2.5z" />
      <path d="M9.6 19.5h4.8M10.5 22h3" />
    </svg>
  )
}

function MiniImage({ bits, className }: { bits: readonly (0 | 1)[]; className?: string }) {
  return (
    <div className={cx('bits-mini', className)} aria-hidden="true">
      {bits.map((b, i) => (
        <i key={i} className={b === 1 ? 'on' : undefined} />
      ))}
    </div>
  )
}

/**
 * Cena de Bits: réplica do protótipo "Decodificador de pacotes". Pacotes
 * viajam por uma esteira até a CPU; o jogador acende as lâmpadas certas
 * antes que cheguem. Lógica pura em `logic/rules.ts`; aqui ficam o tempo
 * (contagem, pausas de acerto/erro, dica), os efeitos e as falas do Kernel.
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
  const fresh = () => createGame(phase, randomSeed(), config.durMult)

  const [game, setGame] = useState<BitsState>(fresh)
  /** -1: esperando começar; 0..3: "3, 2, 1, Vai!"; null: em jogo. */
  const [cd, setCd] = useState<number | null>(-1)
  const [say, setSay] = useState<Say>({ text: UI.say.ready, mood: 'happy' })
  const [peeking, setPeeking] = useState(false)
  const [hintIdx, setHintIdx] = useState<number | null>(null)
  const [hinted, setHinted] = useState(false)
  const [overWarned, setOverWarned] = useState(false)
  const [cpuHit, setCpuHit] = useState(false)
  const [scoreShown, setScoreShown] = useState(0)
  const [touches, setTouches] = useState(0)

  // Nova partida a cada recomeço ou troca de fase (ajuste durante a
  // renderização, como nas outras cenas: evita um re-render extra).
  const [seen, setSeen] = useState({ runId, phase })
  if (seen.runId !== runId || seen.phase !== phase) {
    setSeen({ runId, phase })
    setGame(fresh())
    setCd(-1)
    setSay({ text: UI.say.ready, mood: 'happy' })
    setPeeking(false)
    setHintIdx(null)
    setHinted(false)
    setOverWarned(false)
    setCpuHit(false)
    setScoreShown(0)
  }

  // Estado autoritativo para os handlers e temporizadores (sempre o último).
  const gameRef = useRef(game)
  useLayoutEffect(() => {
    gameRef.current = game
  })
  const commit = (next: BitsState) => {
    gameRef.current = next
    setGame(next)
  }

  // Temporizadores da partida: cancelados no recomeço e ao sair.
  const timers = useRef(new Set<number>())
  const speedRef = useRef(speed)
  useLayoutEffect(() => {
    speedRef.current = speed
  })
  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.current.delete(id)
      fn()
    }, ms / speedRef.current)
    timers.current.add(id)
  }
  useEffect(() => {
    const set = timers.current
    return () => {
      set.forEach((id) => window.clearTimeout(id))
      set.clear()
    }
  }, [runId, phase])

  /* ---------- efeitos visuais (camada fixa, como no protótipo) ---------- */
  const reduceSetting = useSettings((s) => s.reduceMotion)
  const reduce = () =>
    reduceSetting || window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const fxRef = useRef<HTMLDivElement>(null)
  const flashRef = useRef<HTMLDivElement>(null)
  const fieldRef = useRef<HTMLDivElement>(null)
  const packetRef = useRef<HTMLDivElement>(null)
  const bitRefs = useRef<(HTMLButtonElement | null)[]>([])

  const center = (el: Element | null | undefined) => {
    const r = el?.getBoundingClientRect()
    return r
      ? { x: r.left + r.width / 2, y: r.top + r.height / 2 }
      : { x: innerWidth / 2, y: innerHeight / 2 }
  }
  const floatText = (x: number, y: number, text: string, color: string) => {
    const fx = fxRef.current
    if (!fx) return
    const d = document.createElement('div')
    d.className = 'bits-float'
    d.textContent = text
    d.style.left = `${x}px`
    d.style.top = `${y}px`
    d.style.color = color
    fx.appendChild(d)
    const a = d.animate(
      [
        { opacity: 0, transform: 'translate(-50%,-30%) scale(.6)' },
        { opacity: 1, transform: 'translate(-50%,-90%) scale(1.1)', offset: 0.25 },
        { opacity: 0, transform: 'translate(-50%,-220%) scale(1)' },
      ],
      { duration: 900, easing: 'ease-out' },
    )
    a.onfinish = () => d.remove()
  }
  const burst = (x: number, y: number, n = 22) => {
    const fx = fxRef.current
    if (!fx || reduce()) return
    for (let i = 0; i < n; i++) {
      const p = document.createElement('div')
      p.className = 'bits-part'
      p.style.left = `${x}px`
      p.style.top = `${y}px`
      p.style.background = CONFETTI[i % CONFETTI.length]!
      fx.appendChild(p)
      const ang = Math.random() * Math.PI * 2
      const r = 60 + Math.random() * 120
      const a = p.animate(
        [
          { transform: 'translate(-50%,-50%) rotate(0)', opacity: 1 },
          {
            transform: `translate(${Math.cos(ang) * r}px,${Math.sin(ang) * r + 40}px) rotate(${Math.random() * 540}deg) scale(.3)`,
            opacity: 0,
          },
        ],
        { duration: 700 + Math.random() * 400, easing: 'cubic-bezier(.2,.8,.4,1)' },
      )
      a.onfinish = () => p.remove()
    }
  }
  const shake = () => {
    if (reduce()) return
    fieldRef.current
      ?.closest('[data-game-active]')
      ?.animate(
        [
          { transform: 'translate(0)' },
          { transform: 'translate(-10px,4px)' },
          { transform: 'translate(9px,-3px)' },
          { transform: 'translate(-6px,2px)' },
          { transform: 'translate(0)' },
        ],
        { duration: 350 },
      )
    flashRef.current?.animate([{ opacity: 0.25 }, { opacity: 0 }], { duration: 450 })
  }
  const popPacket = () => {
    if (reduce()) return
    packetRef.current?.animate(
      [
        { transform: 'translateY(-50%) scale(.4)', opacity: 0 },
        { transform: 'translateY(-50%) scale(1)', opacity: 1 },
      ],
      { duration: 350, easing: 'cubic-bezier(.3,1.6,.5,1)' },
    )
  }

  /* ---------- fluxo da partida ---------- */
  const beginPacket = (g: BitsState) => {
    setHintIdx(null)
    setHinted(false)
    setOverWarned(false)
    setSay({ text: packetLine(g), mood: 'neutral' })
    popPacket()
  }

  const goNext = () => {
    const next = advance(gameRef.current)
    commit(next)
    if (next.status === 'playing') beginPacket(next)
  }

  const onSuccess = (g: BitsState, points: number, usedCombo: number) => {
    const c = center(packetRef.current)
    burst(c.x, c.y)
    floatText(
      c.x,
      c.y - 70,
      `+${points}${usedCombo > 1 ? `  x${usedCombo}` : ''}`,
      'var(--color-mint)',
    )
    audio.play('bitsWin')
    announce(fill(UI.announceSuccess, { points }), 'polite')
    setHintIdx(null)
    setSay({ text: successLine(g), mood: 'happy' })
    later(goNext, T.afterSuccess)
  }

  const onFail = (g: BitsState) => {
    setCpuHit(true)
    later(() => setCpuHit(false), T.cpuHit)
    shake()
    audio.play('bitsLose')
    announce(fill(UI.announceFail, { lives: g.lives }), 'assertive')
    setHintIdx(null)
    setSay({ text: failLine(g), mood: 'sad' })
    later(goNext, T.afterFail)
  }

  // Contagem "3, 2, 1, Vai!" quando a partida começa (depois do "Jogar").
  useEffect(() => {
    if (cd !== -1 || paused) return
    const step = (k: number) => {
      setCd(k)
      audio.play(k === 3 ? 'bitsGo' : 'bitsCount')
      if (k < 3) later(() => step(k + 1), T.countStep)
      else
        later(() => {
          setCd(null)
          beginPacket(gameRef.current)
        }, T.countGo)
    }
    later(() => step(0), 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dispara uma vez por partida
  }, [cd, paused])

  const live = cd === null && !paused && game.status === 'playing' && game.stage === 'running'

  // O pacote anda até a CPU (fases com derrota e relógio ligado).
  useGameLoop(
    (dt) => {
      const g = gameRef.current
      const before = Math.ceil(g.remaining)
      const { state, events } = tick(g, dt)
      commit(state)
      const after = Math.ceil(state.remaining)
      if (after < before && after <= 3 && after > 0) audio.play('bitsTick')
      if (events.some((e) => e.type === 'fail')) onFail(state)
    },
    { running: live && config.moving, speed },
  )

  // Dica depois de 6 s parado, como no protótipo.
  useEffect(() => {
    if (!live || hinted || phase.targetKind === 'image') return
    const id = window.setTimeout(() => {
      const g = gameRef.current
      const h = hintFor(g)
      setHinted(true)
      if (!h) return
      if (h.kind === 'over') {
        setSay({ text: UI.say.hintOver, mood: 'think' })
        return
      }
      setHintIdx(h.index)
      setSay({ text: fill(UI.say.hintBit, { rest: h.rest }), mood: 'think' })
    }, T.idleHint / speed)
    return () => window.clearTimeout(id)
  }, [live, hinted, touches, game.idx, phase.targetKind, speed])

  // Pontos sobem contando, em vez de pular.
  useEffect(() => {
    if (scoreShown === game.score) return
    const raf = requestAnimationFrame(() => {
      const diff = game.score - scoreShown
      setScoreShown(scoreShown + Math.ceil(Math.abs(diff) / 8) * Math.sign(diff))
    })
    return () => cancelAnimationFrame(raf)
  }, [scoreShown, game.score])

  // Fim da fase: avisa o shell (confete na vitória).
  const finishRef = useRef(onFinish)
  useLayoutEffect(() => {
    finishRef.current = onFinish
  })
  useEffect(() => {
    if (game.status === 'playing') return
    if (game.status === 'won') burst(innerWidth / 2, innerHeight / 2 - 120, 40)
    const o = computeOutcome(game)
    const outcome: PhaseOutcome = {
      won: o.won,
      stars: o.stars,
      score: o.score,
      stats: [
        { id: 'score', label: UI.stats.score, value: String(o.score), tone: 'gold' },
        {
          id: 'tasks',
          label: UI.stats.hits,
          value: `${game.solved}/${game.targets.length}`,
          tone: 'cyan',
        },
        { id: 'combo', label: UI.stats.combo, value: `x${game.best}`, tone: 'orange' },
      ],
      ...(o.won ? {} : { failTitle: UI.fail.title, failReason: UI.fail.reason }),
    }
    const id = window.setTimeout(() => finishRef.current(outcome), T.finish / speed)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só quando o status muda
  }, [game.status])

  /* ---------- ações do jogador ---------- */
  const onToggle = (i: number) => {
    if (!live) return
    const g = gameRef.current
    const { state, events } = toggleBit(g, i)
    if (state === g) return
    commit(state)
    setTouches((n) => n + 1)
    setHintIdx(null)
    setHinted(false)
    const on = state.bits[i] === 1
    const v = placeValue(i, phase.bitCount)
    audio.play(`${on ? 'bitsOn' : 'bitsOff'}${i % 8}`)
    if (phase.layout === 'row') {
      const c = center(bitRefs.current[i])
      floatText(
        c.x,
        c.y - 50,
        on ? `+${v}` : `−${v}`,
        on ? 'var(--color-gold)' : 'var(--color-muted)',
      )
    }
    const win = events.find((e) => e.type === 'success')
    if (win && win.type === 'success') return onSuccess(state, win.points, win.combo)
    if (phase.targetKind === 'image') return
    const s = sumOf(state)
    const t = state.target as number
    if (s > t && !overWarned) {
      setOverWarned(true)
      setSay({ text: fill(UI.say.over, { sum: s, target: t }), mood: 'think' })
    }
    if (s <= t) setOverWarned(false)
  }
  const onClear = () => {
    if (!live) return
    const { state } = clearBits(gameRef.current)
    commit(state)
    setOverWarned(false)
    audio.play('bitsOff0')
  }
  const onPeek = () => {
    if (!live) return
    const next = peek(gameRef.current)
    if (!next) return
    commit(next)
    setPeeking(true)
    later(() => setPeeking(false), T.peek)
    setSay({ text: UI.say.peek, mood: 'think' })
  }

  // Teclado do protótipo: 1 a 8 acendem as lâmpadas; Backspace apaga tudo.
  // (Pausar com P/Esc já é do shell.)
  const keyRef = useRef({ onToggle, onClear })
  useLayoutEffect(() => {
    keyRef.current = { onToggle, onClear }
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (phase.layout === 'row' && /^[1-9]$/.test(e.key) && Number(e.key) <= phase.bitCount) {
        e.preventDefault()
        keyRef.current.onToggle(Number(e.key) - 1)
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        keyRef.current.onClear()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase.layout, phase.bitCount])

  /* ---------- derivados para desenhar ---------- */
  const pc = COPY.phases[phase.id]!
  const resolved = game.stage === 'locked' ? game.results[game.idx] : undefined
  const progress = config.moving ? Math.min(1, 1 - game.remaining / game.dur) : 0
  const danger = config.moving && progress > 0.76 && game.stage === 'running'
  const sum = phase.targetKind === 'image' ? 0 : sumOf(game)
  const target = phase.targetKind === 'image' ? 0 : (game.target as number)
  const max = 2 ** phase.bitCount - 1
  const pct = (n: number) => `${(n / max) * 100}%`
  const upcoming = game.targets.slice(game.idx + 1, game.idx + 3)
  const stateName =
    game.status !== 'playing'
      ? 'over'
      : cd !== null
        ? 'countdown'
        : game.stage === 'locked'
          ? 'locked'
          : 'running'

  const onBitKey = (e: React.KeyboardEvent, i: number) => {
    const n = phase.bitCount
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      bitRefs.current[(i + 1) % n]?.focus()
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      bitRefs.current[(i - 1 + n) % n]?.focus()
    }
  }

  return (
    <GameFrame
      layoutClassName="bits-layout"
      rootProps={{ 'data-bits-state': stateName }}
      paused={paused}
      onPauseChange={onPauseChange}
      onRestart={onRestart}
      narration={say}
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
            {phase.kind === 'tutorial' ? (
              <DifficultyPill difficulty="easy">{SHELL.hud.tutorial}</DifficultyPill>
            ) : (
              <DifficultyPill difficulty={difficulty}>
                {SHELL.difficulty[difficulty].name}
              </DifficultyPill>
            )}
          </div>
        </>
      }
      hud={
        <div className="bits-hud">
          <HudPanel>
            <div className="flex items-center justify-between gap-2">
              <Label>
                <Icon name="clock" className="hidden size-[18px] roomy:block" />
                {UI.arrival}
              </Label>
              {config.moving ? (
                <b className="bits-timer">
                  {Math.max(0, Math.ceil(game.remaining))}
                  <small>{UI.seconds}</small>
                </b>
              ) : (
                <b className="bits-timer flex items-center gap-1 text-mint">
                  <Icon name="infinity" className="size-5 roomy:size-7" />
                  <small className="text-mint uppercase">{SHELL.hud.untimed}</small>
                </b>
              )}
            </div>
            <div className={cx('bits-tbar', danger && 'warn')}>
              <i style={{ width: `${config.moving ? (game.remaining / game.dur) * 100 : 100}%` }} />
            </div>
          </HudPanel>
          <HudPanel>
            <div className="flex items-center justify-between gap-2">
              <Label>{UI.packets}</Label>
              <span className="bits-count">{`${game.solved}/${game.targets.length}`}</span>
            </div>
            <div className="bits-pips" aria-hidden="true">
              {game.targets.map((_, i) => (
                <span
                  key={i}
                  className={cx(
                    'bits-pip',
                    game.results[i],
                    !game.results[i] && i === game.idx && game.status === 'playing' && 'now',
                  )}
                />
              ))}
            </div>
          </HudPanel>
          <ScoreStat score={scoreShown} combo={game.combo} />
          <LivesStat hearts={game.lives} max={phase.lives} />
        </div>
      }
    >
      <div className="bits-fx" ref={fxRef} aria-hidden="true" />
      <div className="bits-flash" ref={flashRef} aria-hidden="true" />
      {cd !== null && cd >= 0 && (
        <div className="bits-countdown" aria-live="assertive">
          <div key={cd} className="bits-cd">
            {UI.countdown[cd]}
          </div>
        </div>
      )}

      <section className="bits-field" ref={fieldRef} aria-label={UI.boardLabel}>
        <span className="bits-screw a" aria-hidden="true" />
        <span className="bits-screw b" aria-hidden="true" />
        <span className="bits-screw c" aria-hidden="true" />
        <span className="bits-screw d" aria-hidden="true" />

        {phase.targetKind === 'letters' && (
          <p className="bits-word">
            {fill(UI.wordProgress, {
              progress: game.targets
                .map((t, i) => (game.results[i] ? letterOf(t as number) : '_'))
                .join(' '),
            })}
          </p>
        )}

        <div className="bits-lane">
          <div className="bits-queue" aria-hidden="true">
            <span className="bits-lab">{UI.queue}</span>
            {upcoming.map((t, i) => (
              <div key={i} className="bits-qchip">
                {phase.targetKind === 'image' ? (
                  <MiniImage bits={t as readonly (0 | 1)[]} />
                ) : (
                  labelOf(phase, t)
                )}
              </div>
            ))}
            {game.idx + 1 >= game.targets.length && <div className="bits-qchip">{UI.queueEnd}</div>}
          </div>

          <div className="bits-track">
            {config.moving && (
              <div className="bits-zone" aria-hidden="true">
                <span>{UI.danger}</span>
              </div>
            )}
            <div className="bits-wire" aria-hidden="true" />
            <div
              ref={packetRef}
              className={cx('bits-packet', danger && 'danger', resolved === 'ok' && 'done')}
              style={{ left: `calc((100% - var(--pw)) * ${progress.toFixed(4)})` }}
            >
              <div className="pl">{fill(UI.packet, { n: game.idx + 1 })}</div>
              {phase.targetKind === 'image' ? (
                <MiniImage bits={game.target as readonly (0 | 1)[]} className="pn-img" />
              ) : (
                <>
                  <div className="pn">{labelOf(phase, game.target)}</div>
                  <div className="pb">
                    {resolved ? binOf(phase, game.target as number) : unknownBin(phase)}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className={cx('bits-cpu', cpuHit && 'hit')}>
            <div>
              <div className="ic">
                <Icon name="cores" />
              </div>
              <b>{UI.cpu}</b>
            </div>
          </div>
        </div>

        {phase.targetKind === 'letters' && (
          <details className="bits-alphabet">
            <summary>{UI.alphabetTitle}</summary>
            <ul>
              {(phase.alphabet ?? []).map((l) => (
                <li key={l}>{`${l} = ${binOf(phase, l.charCodeAt(0))}`}</li>
              ))}
            </ul>
          </details>
        )}

        {phase.layout === 'row' ? (
          <div
            className={cx('bits-bits', phase.bitCount === 4 && 'four', peeking && 'peek')}
            role="group"
            aria-label={UI.bitsGroup}
          >
            {game.bits.map((b, i) => {
              const v = placeValue(i, phase.bitCount)
              const on = b === 1
              const showVal = on || peeking || phase.showPlaceValues
              return (
                <Fragment key={i}>
                  {phase.bitCount === 8 && i === 4 && (
                    <span className="bits-gap" aria-hidden="true" />
                  )}
                  <div className="bits-cell" data-bit={i}>
                    <button
                      ref={(el) => {
                        bitRefs.current[i] = el
                      }}
                      type="button"
                      role="switch"
                      aria-checked={on}
                      aria-label={fill(UI.bitLabel, { n: i + 1, state: on ? UI.bitOn : UI.bitOff })}
                      className={cx(
                        'bits-bit',
                        on && 'on',
                        resolved === 'ok' && on && 'win',
                        resolved === 'bad' && 'answer',
                        hintIdx === i && 'hint',
                      )}
                      onClick={() => onToggle(i)}
                      onKeyDown={(e) => onBitKey(e, i)}
                    >
                      <span className="key">{i + 1}</span>
                      <Bulb />
                      <span className="val">{showVal ? v : UI.unknownValue}</span>
                      <span className="dig">{b}</span>
                    </button>
                  </div>
                </Fragment>
              )
            })}
          </div>
        ) : (
          <div className="bits-grid-scroll">
            <div className="bits-grid" role="group" aria-label={UI.bitsGroup}>
              {game.bits.map((b, i) => (
                <div key={i} className="bits-cell" data-bit={i}>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={b === 1}
                    aria-label={fill(UI.pixelLabel, {
                      row: Math.floor(i / 8) + 1,
                      col: (i % 8) + 1,
                      state: b === 1 ? UI.bitOn : UI.bitOff,
                    })}
                    className={cx(
                      'bits-px',
                      b === 1 && 'on',
                      resolved === 'ok' && b === 1 && 'win',
                      resolved === 'bad' && 'answer',
                    )}
                    onClick={() => onToggle(i)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {phase.targetKind !== 'image' && (
          <div className="bits-meter">
            <div className="bits-sumrow">
              <div className="bits-sum">
                {UI.sum}
                <span>{sum}</span>
                <small>{`(${binOf(phase, sum)})`}</small>
              </div>
              <div
                className={cx(
                  'bits-status',
                  sum === target && target > 0 && 'hit',
                  sum > target && 'over',
                )}
              >
                {sum === target && target > 0
                  ? UI.hit
                  : sum > target
                    ? fill(UI.over, { n: sum - target })
                    : fill(UI.short, { n: target - sum })}
              </div>
            </div>
            <div className="bits-gauge" aria-hidden="true">
              <div className="fill" style={{ width: pct(Math.min(sum, target)) }} />
              <div
                className="over"
                style={{ left: pct(target), width: sum > target ? pct(sum - target) : '0%' }}
              />
              <div className="mark" style={{ left: pct(target) }}>
                <span>{target}</span>
              </div>
            </div>
            <div className="bits-ticks" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((k) => (
                <span key={k}>{Math.min(max, Math.round(((max + 1) * k) / 4))}</span>
              ))}
            </div>
          </div>
        )}

        <div className="bits-tools">
          {phase.peeks > 0 && (
            <button type="button" className="bits-tool" onClick={onPeek} disabled={game.peeks <= 0}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {fill(UI.peek, { n: game.peeks })}
            </button>
          )}
          <button type="button" className="bits-tool" onClick={onClear}>
            <Icon name="close" />
            {UI.clear}
          </button>
          {phase.layout === 'row' && (
            <span className="bits-keys">{fill(UI.keys, { n: phase.bitCount })}</span>
          )}
        </div>
      </section>
    </GameFrame>
  )
}
