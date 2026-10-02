import { useEffect, useState } from 'react'
import { SHELL } from '@/content/shell'
import { STATION_COPY } from '@/content/stations'
import { useProgress } from '@/engine/store/progressStore'
import { TRAIL } from '@/games/catalog'
import { GAMES_BY_ID } from '@/games/registry'
import { ConceptCardView, LockedCardView } from '@/ui/ConceptCardView'
import { fill } from '@/ui/format'
import { Icon, isIconName } from '@/ui/icons'
import { ScreenFrame, TopBar } from '../ScreenFrame'
import { useMusic } from '../useMusic'

/** Manual do Computador: o glossário ilustrado com os cards ganhos. */
export function ManualScreen() {
  useMusic('map')
  const progress = useProgress((s) => s.progress)
  const markCardsSeen = useProgress((s) => s.markCardsSeen)
  // Os selos "Novo" ficam até o jogador sair desta tela.
  const [unseenOnOpen] = useState(() => progress.unseenCards)
  useEffect(() => () => markCardsSeen(unseenOnOpen), [markCardsSeen, unseenOnOpen])

  const games = TRAIL.map((id) => GAMES_BY_ID.get(id)).filter((g) => !!g)
  const total = games.reduce((a, g) => a + g.cards.length, 0)
  const owned = progress.cards.length

  return (
    <ScreenFrame wide>
      <TopBar back={{ to: '/', label: SHELL.common.backToMap }} title={SHELL.appName} />
      <header>
        <h1
          data-screen-title
          className="m-0 text-[28px] tracking-[1px] uppercase outline-none sm:text-[40px]"
        >
          {SHELL.manual.title}
        </h1>
        <p className="m-0 mt-1 text-muted">{SHELL.manual.subtitle}</p>
        <p className="m-0 mt-2 text-sm font-bold tracking-[2px] text-gold uppercase">
          {fill(SHELL.manual.count, { n: owned, total })}
        </p>
      </header>

      {owned === 0 && (
        <p className="m-0 rounded-lg border-2 border-dashed border-line p-5 text-center text-muted">
          {SHELL.manual.empty}
        </p>
      )}

      {games.map((game) => {
        const station = STATION_COPY[game.meta.id]
        return (
          <section
            key={game.meta.id}
            aria-labelledby={`st-${game.meta.id}`}
            className="flex flex-col gap-3"
          >
            <h2
              id={`st-${game.meta.id}`}
              className="m-0 flex items-center gap-2.5 text-xl tracking-[1px] uppercase"
            >
              {isIconName(game.meta.icon) && (
                <Icon name={game.meta.icon} className="size-6 text-cyan" />
              )}
              {station.title}
              <span className="font-body text-sm font-semibold tracking-normal text-muted normal-case">
                {station.part}
              </span>
            </h2>
            <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-2">
              {game.cards.map((c) => (
                <li key={c.id}>
                  {progress.cards.includes(c.id) ? (
                    <ConceptCardView
                      card={c}
                      station={station.title}
                      isNew={unseenOnOpen.includes(c.id)}
                      className="h-full"
                    />
                  ) : (
                    <LockedCardView
                      hint={fill(SHELL.manual.lockedHint, { station: station.title })}
                      className="h-full"
                    />
                  )}
                </li>
              ))}
            </ul>
          </section>
        )
      })}

      <section aria-label={SHELL.manual.soon} className="flex flex-col gap-2">
        <h2 className="m-0 text-sm tracking-[2px] text-muted uppercase">{SHELL.manual.soon}</h2>
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {TRAIL.filter((id) => !GAMES_BY_ID.has(id)).map((id) => (
            <li
              key={id}
              className="flex items-center gap-2 rounded-full border-2 border-dashed border-line-strong px-3 py-1.5 text-sm text-muted"
            >
              <Icon name={isIconName(id) ? id : 'info'} className="size-4" />
              {STATION_COPY[id].title}
            </li>
          ))}
        </ul>
      </section>
    </ScreenFrame>
  )
}
