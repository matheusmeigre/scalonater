import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router'
import { SHELL } from '@/content/shell'
import { STATION_COPY } from '@/content/stations'
import { audio } from '@/engine/audio/audioEngine'
import { stationStatus } from '@/engine/phases/progression'
import type { StarCount } from '@/engine/scoring/scoring'
import { useProgress } from '@/engine/store/progressStore'
import type { StationId } from '@/engine/types'
import { TRAIL } from '@/games/catalog'
import { GAMES_BY_ID } from '@/games/registry'
import { Narrator } from '@/ui/Narrator'
import { fill } from '@/ui/format'
import { Board, type StationView } from '../map/Board'
import { ScreenFrame, TopBar } from '../ScreenFrame'
import { useSession } from '../session'
import { useMusic } from '../useMusic'

const PORTRAIT_QUERY = '(max-width: 759.98px) and (orientation: portrait)'

function useMediaQuery(q: string) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(q)
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    () => window.matchMedia(q).matches,
  )
}

export function MapScreen() {
  useMusic('map')
  const navigate = useNavigate()
  const progress = useProgress((s) => s.progress)
  const justLit = useSession((s) => s.justLit)
  const setJustLit = useSession((s) => s.setJustLit)
  const portrait = useMediaQuery(PORTRAIT_QUERY)
  const [hint, setHint] = useState<string | null>(null)

  const stations = useMemo(() => {
    const out = {} as Record<StationId, StationView>
    for (const id of TRAIL) {
      const game = GAMES_BY_ID.get(id)
      const phases = game ? Object.values(progress.games[id]?.phases ?? {}) : []
      const stars = phases.length
        ? (Math.round(phases.reduce((a, p) => a + p.stars, 0) / phases.length) as StarCount)
        : 0
      out[id] = {
        id,
        status: stationStatus(id, TRAIL, GAMES_BY_ID, progress),
        stars,
        icon: game?.meta.icon ?? id,
      }
    }
    return out
  }, [progress])

  const lit = TRAIL.filter((id) => stations[id].status === 'complete').length

  // Comemora a peça que acabou de acender, uma vez.
  useEffect(() => {
    if (!justLit) return
    const t = window.setTimeout(() => audio.play('power'), 400)
    const clear = window.setTimeout(() => setJustLit(null), 2500)
    return () => {
      window.clearTimeout(t)
      window.clearTimeout(clear)
    }
  }, [justLit, setJustLit])

  const onSelect = (id: StationId) => {
    const s = stations[id]
    if (s.status === 'available' || s.status === 'complete') {
      audio.play('click')
      navigate(`/jogo/${id}`)
      return
    }
    audio.play('invalid')
    const title = STATION_COPY[id].title
    setHint(`**${title}:** ${s.status === 'locked' ? SHELL.map.lockedHint : SHELL.map.soonHint}`)
  }

  const message = hint ?? (justLit ? `**${SHELL.result.stationLit}**` : SHELL.map.welcome.join(' '))

  return (
    <ScreenFrame wide>
      <TopBar />
      <section className="flex flex-col gap-1">
        <h1
          data-screen-title
          className="m-0 text-[28px] tracking-[1px] uppercase outline-none sm:text-[40px]"
        >
          {SHELL.map.title}
        </h1>
        <p className="m-0 max-w-[70ch] text-[15px] text-muted sm:text-[17px]">
          {SHELL.map.subtitle}
        </p>
        <p className="m-0 mt-1 text-sm font-bold tracking-[2px] text-gold uppercase">
          {fill(SHELL.map.progress, { done: lit, total: TRAIL.length })}
        </p>
      </section>
      <Narrator
        message={message}
        mood={justLit ? 'happy' : hint ? 'think' : 'neutral'}
        speaker={SHELL.opening.speaker}
        role={SHELL.opening.role}
      />
      <Board stations={stations} portrait={portrait} justLit={justLit} onSelect={onSelect} />
    </ScreenFrame>
  )
}
