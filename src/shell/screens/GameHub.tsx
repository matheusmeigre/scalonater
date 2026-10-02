import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { SHELL } from '@/content/shell'
import { STATION_COPY } from '@/content/stations'
import { audio } from '@/engine/audio/audioEngine'
import {
  isGameComplete,
  isPhaseUnlocked,
  nextPhaseIndex,
  stationStatus,
} from '@/engine/phases/progression'
import { useProgress } from '@/engine/store/progressStore'
import { useSettings } from '@/engine/store/settingsStore'
import { DIFFICULTY_IDS, type GameModule } from '@/engine/types'
import { TRAIL } from '@/games/catalog'
import { GAMES_BY_ID, getGame } from '@/games/registry'
import { Button, ButtonLink, buttonClass } from '@/ui/Button'
import { Kernel } from '@/ui/Kernel'
import { Paper, Panel } from '@/ui/Panel'
import { RichText } from '@/ui/RichText'
import { Stars } from '@/ui/Stars'
import { Toggle } from '@/ui/Toggle'
import { cx, fill } from '@/ui/format'
import { Icon, isIconName } from '@/ui/icons'
import { ScreenFrame, TopBar } from '../ScreenFrame'
import { useMusic } from '../useMusic'

/** Abertura: o Kernel apresenta o problema do mundo real em até 3 falas. */
function Opening({ game, onDone }: { game: GameModule; onDone: () => void }) {
  const lines = game.copy.opening.slice(0, 3)
  const [i, setI] = useState(0)
  const last = i === lines.length - 1
  return (
    <section
      aria-labelledby="opening-title"
      className="flex flex-1 flex-col items-center justify-center gap-6 py-4"
    >
      <h1 id="opening-title" data-screen-title className="sr-only">
        {game.copy.title}
      </h1>
      <motion.div
        className="flex size-28 items-center justify-center rounded-[28px] bg-paper-ink shadow-[0_0_60px_rgb(61_224_255/0.25)] sm:size-36"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Kernel mood={last ? 'happy' : 'neutral'} className="size-20 sm:size-28" />
      </motion.div>
      <Paper className="w-full max-w-[640px] px-5 py-4 sm:px-7 sm:py-6">
        <p className="m-0 mb-2 font-display text-[15px] tracking-[2px] text-violet uppercase">
          {SHELL.opening.speaker}
          <span className="ml-3 font-body text-[13px] tracking-normal text-pin normal-case">
            {SHELL.opening.role}
          </span>
        </p>
        <AnimatePresence mode="wait">
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <RichText
              as="p"
              tone="paper"
              aria-live="polite"
              className="m-0 text-lg leading-[1.35] font-semibold sm:text-[22px]"
              text={lines[i] ?? ''}
            />
          </motion.div>
        </AnimatePresence>
      </Paper>
      <div className="flex gap-2" aria-hidden="true">
        {lines.map((_, k) => (
          <i key={k} className={cx('h-2 w-6 rounded-full', k <= i ? 'bg-cyan' : 'bg-line')} />
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button variant="ghost" onClick={onDone}>
          {SHELL.common.skip}
        </Button>
        <Button
          variant={last ? 'gold' : 'cyan'}
          size="lg"
          iconRight={last ? undefined : 'arrow-right'}
          autoFocus
          onClick={() => {
            audio.play('talk')
            if (last) onDone()
            else setI(i + 1)
          }}
        >
          {last ? SHELL.opening.start : SHELL.common.next}
        </Button>
      </div>
    </section>
  )
}

export function GameHub() {
  useMusic('map')
  const { gameId } = useParams()
  const game = getGame(gameId)
  const progress = useProgress((s) => s.progress)
  const markOpeningSeen = useProgress((s) => s.markOpeningSeen)
  const settings = useSettings()
  const [replayOpening, setReplayOpening] = useState(false)

  if (!game) return <Navigate to="/" replace />
  const id = game.meta.id
  const status = stationStatus(id, TRAIL, GAMES_BY_ID, progress)
  if (status === 'locked' || status === 'soon') return <Navigate to="/" replace />

  const gp = progress.games[id]
  const copy = game.copy
  const station = STATION_COPY[id]
  const complete = isGameComplete(game.phases, gp)
  const next = nextPhaseIndex(game.phases, gp)

  if (!gp?.openingSeen || replayOpening) {
    return (
      <ScreenFrame>
        <TopBar back={{ to: '/', label: SHELL.common.backToMap }} title={station.part} />
        <Opening
          game={game}
          onDone={() => {
            markOpeningSeen(id)
            setReplayOpening(false)
          }}
        />
      </ScreenFrame>
    )
  }

  let levelN = 0
  return (
    <ScreenFrame>
      <TopBar back={{ to: '/', label: SHELL.common.backToMap }} title={station.part} />

      <header className="flex items-start gap-4">
        <span className="flex size-16 flex-none items-center justify-center rounded-[16px] bg-cyan text-on-accent shadow-[0_5px_0_var(--color-cyan-depth)] sm:size-20">
          {isIconName(game.meta.icon) && (
            <Icon name={game.meta.icon} className="size-9 sm:size-11" />
          )}
        </span>
        <div className="min-w-0">
          <h1
            data-screen-title
            className="m-0 text-[30px] tracking-[1px] uppercase outline-none sm:text-[44px]"
          >
            {copy.title}
          </h1>
          <p className="m-0 mt-1 text-base text-muted sm:text-lg">{copy.tagline}</p>
          {complete && (
            <p className="m-0 mt-2 inline-flex items-center gap-1.5 text-sm font-bold tracking-[1px] text-gold uppercase">
              <Icon name="check" className="size-4" />
              {SHELL.hub.completed}
            </p>
          )}
        </div>
      </header>

      <section aria-labelledby="concepts" className="flex flex-col gap-2">
        <h2 id="concepts" className="m-0 text-sm tracking-[2px] text-cyan uppercase">
          {SHELL.hub.concepts}
        </h2>
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {copy.concepts.map((c) => (
            <li
              key={c}
              className="rounded-full border-2 border-line px-3 py-1 text-sm font-semibold text-muted"
            >
              {c}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="phases" className="flex flex-col gap-3">
        <h2 id="phases" className="m-0 text-sm tracking-[2px] text-cyan uppercase">
          {SHELL.hub.phases}
        </h2>
        <ol className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
          {game.phases.map((p, i) => {
            const pc = copy.phases[p.id]
            const rec = gp?.phases[p.id]
            const unlocked = isPhaseUnlocked(game.phases, i, gp)
            const label =
              p.kind === 'tutorial' ? SHELL.hub.tutorial : fill(SHELL.hub.phaseN, { n: ++levelN })
            const isNext = i === next && !complete
            return (
              <li key={p.id}>
                <Panel
                  className={cx(
                    'flex h-full flex-col gap-2 p-4',
                    isNext && 'border-gold shadow-card-gold',
                    !unlocked && 'opacity-70',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold tracking-[2px] text-muted uppercase">
                      {label}
                    </span>
                    {rec ? (
                      <Stars count={rec.stars} size="sm" />
                    ) : (
                      !unlocked && (
                        <Icon name="lock" label={SHELL.a11y.locked} className="size-5 text-dim" />
                      )
                    )}
                  </div>
                  <h3 className="m-0 text-lg tracking-[0.5px] uppercase sm:text-xl">{pc?.title}</h3>
                  <p className="m-0 flex-1 text-[15px] text-muted">{pc?.teaser}</p>
                  {unlocked ? (
                    <Link
                      to={`/jogo/${id}/${p.id}`}
                      className={buttonClass(isNext ? 'gold' : 'ghost', 'sm', 'self-start px-5')}
                      onClick={() => audio.play('click')}
                      aria-label={`${rec ? SHELL.hub.replay : SHELL.hub.play}: ${pc?.title ?? ''}`}
                    >
                      <Icon name={rec ? 'restart' : 'play'} />
                      {rec ? SHELL.hub.replay : SHELL.hub.play}
                    </Link>
                  ) : (
                    <p className="m-0 text-sm text-muted">{SHELL.hub.locked}</p>
                  )}
                </Panel>
              </li>
            )
          })}
        </ol>
      </section>

      <section aria-labelledby="options" className="grid gap-3 sm:grid-cols-2">
        <h2 id="options" className="sr-only">
          {SHELL.settings.play}
        </h2>
        {game.meta.hasDifficulty && (
          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="mb-2 text-sm font-bold tracking-[2px] text-cyan uppercase">
              {SHELL.hub.difficulty}
            </legend>
            <div
              role="radiogroup"
              aria-label={SHELL.hub.difficulty}
              className="grid grid-cols-3 gap-2"
            >
              {DIFFICULTY_IDS.map((d) => {
                const on = settings.difficulty === d
                return (
                  <button
                    key={d}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => {
                      audio.play('select')
                      settings.set('difficulty', d)
                    }}
                    className={cx(
                      'min-h-14 rounded-md border-2 px-2 py-2 text-center font-display text-sm tracking-[0.5px] uppercase sm:text-base',
                      on
                        ? 'border-gold bg-panel-selected text-gold'
                        : 'border-line bg-panel-raised text-ink',
                    )}
                  >
                    {SHELL.difficulty[d].name}
                  </button>
                )
              })}
            </div>
            <p className="m-0 text-sm text-muted">{SHELL.difficulty[settings.difficulty].desc}</p>
          </fieldset>
        )}
        <div className="flex flex-col gap-2">
          <span className="text-sm font-bold tracking-[2px] text-cyan uppercase" aria-hidden="true">
            {SHELL.hub.untimed}
          </span>
          <Toggle
            label={SHELL.hub.untimed}
            hint={SHELL.hub.untimedHint}
            checked={settings.untimed}
            onChange={(v) => settings.set('untimed', v)}
          />
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <ButtonLink to={`/jogo/${id}/${game.phases[next]!.id}`} size="lg" icon="play">
          {complete ? SHELL.hub.replay : SHELL.hub.play}
        </ButtonLink>
        {complete && game.meta.hasAutoplay && (
          <ButtonLink
            to={`/jogo/${id}/${game.phases.at(-1)!.id}?auto=1`}
            variant="cyan"
            icon="cores"
          >
            {SHELL.hub.autoplay}
          </ButtonLink>
        )}
        <Button variant="ghost" icon="restart" onClick={() => setReplayOpening(true)}>
          {SHELL.hub.replayOpening}
        </Button>
      </div>
    </ScreenFrame>
  )
}
