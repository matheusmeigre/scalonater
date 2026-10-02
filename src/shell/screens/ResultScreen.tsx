import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { SHELL } from '@/content/shell'
import { STATION_COPY } from '@/content/stations'
import { audio } from '@/engine/audio/audioEngine'
import { useSettings } from '@/engine/store/settingsStore'
import type { StatTone } from '@/engine/types'
import { getGame } from '@/games/registry'
import { Button, ButtonLink } from '@/ui/Button'
import { ConceptCardView } from '@/ui/ConceptCardView'
import { Kernel } from '@/ui/Kernel'
import { Modal } from '@/ui/Modal'
import { Card, Label, Panel, Paper } from '@/ui/Panel'
import { DifficultyPill } from '@/ui/Pill'
import { RichText } from '@/ui/RichText'
import { Stars } from '@/ui/Stars'
import { cx } from '@/ui/format'
import { Icon } from '@/ui/icons'
import { ScreenFrame } from '../ScreenFrame'
import { useSession } from '../session'
import { useMusic } from '../useMusic'
import { phaseLabel } from './PlayScreen'

const TONE: Record<StatTone, string> = {
  ink: 'text-ink',
  gold: 'text-gold',
  orange: 'text-orange',
  mint: 'text-mint',
  cyan: 'text-cyan',
}

export function ResultScreen() {
  useMusic('map')
  const { gameId, phaseId } = useParams()
  const navigate = useNavigate()
  const game = getGame(gameId)
  const result = useSession((s) => s.lastResult)
  const setJustLit = useSession((s) => s.setJustLit)
  const difficulty = useSettings((s) => s.difficulty)
  const [cardOpen, setCardOpen] = useState(false)

  const valid = !!game && !!result && result.gameId === gameId && result.phaseId === phaseId
  const record = valid ? result.record : null
  const newCards = record?.newCards ?? []
  const gameCompleted = !!record?.gameCompleted

  useEffect(() => {
    if (!valid) return
    const t = window.setTimeout(
      () => audio.play(gameCompleted ? 'final' : newCards.length ? 'card' : 'done'),
      1100,
    )
    return () => window.clearTimeout(t)
  }, [valid, gameCompleted, newCards.length])

  if (!valid || !game) return <Navigate to={game ? `/jogo/${game.meta.id}` : '/'} replace />

  const { outcome } = result
  const index = game.phases.findIndex((p) => p.id === phaseId)
  const phase = game.phases[index]!
  const nextPhase = game.phases[index + 1]
  const pc = game.copy.phases[phase.id]!
  const hub = `/jogo/${game.meta.id}`
  const card = game.cards.find((c) => c.id === newCards[0])
  const station = STATION_COPY[game.meta.id]

  if (outcome.autoplay) {
    return (
      <ScreenFrame className="justify-center">
        <Card tone="win" className="mx-auto w-full max-w-[640px]">
          <h1
            data-screen-title
            className="m-0 mb-3 text-[clamp(28px,5vw,44px)] tracking-[1px] uppercase outline-none"
          >
            {SHELL.result.autoTitle}
          </h1>
          <p className="m-0 mb-6 text-[#DAD7F2]">{SHELL.result.autoBody}</p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink to="/" size="lg" icon="map">
              {SHELL.result.backToMap}
            </ButtonLink>
            <ButtonLink to={hub} variant="ghost" icon="arrow-left">
              {SHELL.common.back}
            </ButtonLink>
          </div>
        </Card>
      </ScreenFrame>
    )
  }

  const goMap = () => {
    if (gameCompleted) setJustLit(game.meta.id)
    navigate('/')
  }

  return (
    <ScreenFrame wide className="items-center text-center">
      <div className="flex w-full max-w-[1120px] flex-col items-center gap-5 py-2 sm:gap-7">
        <Stars count={outcome.stars} />
        <DifficultyPill difficulty={phase.kind === 'tutorial' ? 'easy' : difficulty}>
          {phase.kind === 'tutorial'
            ? phaseLabel(game, phase)
            : `${phaseLabel(game, phase)} · ${SHELL.difficulty[difficulty].name}`}
        </DifficultyPill>
        <h1
          data-screen-title
          className="m-0 text-[clamp(34px,6vw,64px)] tracking-[2px] uppercase outline-none"
        >
          {SHELL.result.title}
        </h1>
        {record?.newBestScore && (
          <p className="m-0 -mt-3 font-display text-lg tracking-[1px] text-gold uppercase">
            {SHELL.result.newRecord}
          </p>
        )}

        <dl className="m-0 grid w-full grid-cols-2 gap-2.5 text-left sm:gap-4 lg:grid-cols-4">
          {outcome.stats.map((s) => (
            <Panel
              key={s.id}
              className="flex flex-col-reverse gap-1.5 px-3.5 py-3 sm:px-[22px] sm:py-5"
            >
              <dd
                className={cx(
                  'm-0 font-display text-[28px] leading-[1.1] sm:text-[40px]',
                  TONE[s.tone],
                )}
              >
                {s.value}
              </dd>
              <dt>
                <Label>{s.label}</Label>
              </dt>
            </Panel>
          ))}
        </dl>

        <div className="grid w-full gap-4 text-left lg:grid-cols-[minmax(0,1fr)_380px]">
          <Paper className="flex flex-col gap-3 p-[18px] sm:flex-row sm:gap-[22px] sm:px-7 sm:py-6">
            <span className="flex size-[76px] flex-none items-center justify-center rounded-[16px] bg-paper-ink">
              <Kernel mood="happy" className="size-14" />
            </span>
            <div>
              <span className="mb-2.5 block font-display text-[15px] tracking-[2px] text-violet uppercase">
                {SHELL.result.learnedTitle}
              </span>
              <RichText
                as="p"
                tone="paper"
                className="m-0 mb-2.5 text-[21px] leading-[1.2] font-bold sm:text-[26px]"
                text={pc.learn}
              />
              <RichText
                as="p"
                tone="paper"
                className="m-0 text-base leading-normal sm:text-lg"
                text={`**${SHELL.result.realWorld}** ${pc.real}`}
              />
            </div>
          </Paper>

          <div className="flex flex-col justify-end gap-3.5">
            {card && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
              >
                <Panel className="flex items-center gap-3 border-gold p-4 shadow-card-gold">
                  <Icon name="book" className="size-7 flex-none text-gold" />
                  <div className="min-w-0 flex-1">
                    <Label>{SHELL.result.cardUnlocked}</Label>
                    <p className="m-0 truncate font-display text-lg uppercase">{card.title}</p>
                  </div>
                  <Button variant="gold" size="sm" onClick={() => setCardOpen(true)}>
                    {SHELL.result.viewCard}
                  </Button>
                </Panel>
              </motion.div>
            )}

            {nextPhase ? (
              <Panel className="flex flex-col gap-1.5 px-5 py-[18px]">
                <Label>{SHELL.result.nextPhase}</Label>
                <b className="font-display text-[22px] font-normal">{`${phaseLabel(game, nextPhase)} · ${game.copy.phases[nextPhase.id]?.title ?? ''}`}</b>
                <span className="text-base leading-[1.4] text-muted">
                  {game.copy.phases[nextPhase.id]?.teaser}
                </span>
              </Panel>
            ) : (
              <Panel className="flex flex-col gap-1.5 border-cyan px-5 py-[18px]">
                <Label>{SHELL.result.connectionTitle}</Label>
                <RichText
                  as="p"
                  className="m-0 text-base leading-[1.4]"
                  text={game.copy.connection}
                />
              </Panel>
            )}

            {nextPhase ? (
              <ButtonLink
                to={`${hub}/${nextPhase.id}`}
                size="lg"
                iconRight="arrow-right"
                className="w-full"
              >
                {SHELL.result.nextPhaseCta}
              </ButtonLink>
            ) : (
              <Button size="lg" icon="map" className="w-full" onClick={goMap}>
                {SHELL.result.backToMap}
              </Button>
            )}
            <ButtonLink to={`${hub}/${phase.id}`} variant="ghost" icon="restart" className="w-full">
              {SHELL.result.retry}
            </ButtonLink>
          </div>
        </div>

        {!nextPhase && (
          <Card tone="win" className="w-full text-left">
            <h2 className="m-0 mb-3 text-[clamp(24px,4vw,36px)] tracking-[1px] uppercase">
              {game.copy.finale.title}
            </h2>
            <p className="m-0 mb-2 text-[#DAD7F2]">{game.copy.finale.intro}</p>
            <ul className="m-0 mb-4 flex flex-col gap-1.5 pl-5 text-[#DAD7F2]">
              {game.copy.finale.bullets.map((b) => (
                <RichText key={b} as="li" text={b} />
              ))}
            </ul>
            <Paper className="mb-5 px-4 py-3.5">
              <span className="mb-1 block font-display text-[13px] tracking-[2px] text-violet uppercase">
                {game.copy.finale.extraTitle}
              </span>
              <RichText as="p" tone="paper" className="m-0" text={game.copy.finale.extra} />
            </Paper>
            <div className="flex flex-wrap gap-3">
              {game.meta.hasAutoplay && (
                <ButtonLink to={`${hub}/${phase.id}?auto=1`} variant="cyan" icon="cores">
                  {SHELL.hub.autoplay}
                </ButtonLink>
              )}
              <ButtonLink to="/manual" variant="ghost" icon="book">
                {SHELL.manual.title}
              </ButtonLink>
            </div>
          </Card>
        )}
      </div>

      <Modal open={cardOpen} onDismiss={() => setCardOpen(false)} labelledBy="card-title">
        {card && (
          <div className="flex flex-col gap-3">
            <ConceptCardView card={card} station={station.title} headingId="card-title" isNew />
            <Button
              variant="ghost"
              autoFocus
              onClick={() => setCardOpen(false)}
              className="self-center"
            >
              {SHELL.common.close}
            </Button>
          </div>
        )}
      </Modal>
    </ScreenFrame>
  )
}
