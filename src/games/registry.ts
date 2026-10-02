import { audio } from '@/engine/audio/audioEngine'
import type { GameMeta, GameModule, StationId } from '@/engine/types'
import { registerIcons } from '@/ui/icons'

/**
 * Minigames prontos, descobertos automaticamente em `src/games/<id>/index.ts`.
 * Para adicionar um novo, crie a pasta com um `index.ts` que exporte um
 * `GameModule` (nomeado ou `default`) — nada aqui precisa mudar. Pastas que
 * começam com `_` (como `_template`) são ignoradas.
 */
// O padrão negativo evita que "_template" (e qualquer outra pasta "_algo")
// entre no bundle: sem ele, o glob ainda a descobriria e só a descartaríamos
// depois, em tempo de execução.
const modules = import.meta.glob<Record<string, unknown>>(['./*/index.ts', '!./_*/index.ts'], {
  eager: true,
})

function isGameModule(v: unknown): v is GameModule {
  if (!v || typeof v !== 'object') return false
  const m = v as Partial<GameModule>
  return !!m.meta && !!m.copy && !!m.phases && !!m.Scene
}

function extractGame(mod: Record<string, unknown>): GameModule | null {
  if (isGameModule(mod.default)) return mod.default
  const named = Object.values(mod).find(isGameModule)
  return named ?? null
}

const discovered: GameModule[] = []
for (const [path, mod] of Object.entries(modules)) {
  const folder = path.split('/')[1] ?? ''
  if (folder.startsWith('_')) continue
  const game = extractGame(mod)
  if (game) discovered.push(game)
}
discovered.sort((a, b) => a.meta.id.localeCompare(b.meta.id))

/** Todos os módulos descobertos, liberados ou não. Use só para diagnóstico/testes. */
export const ALL_GAMES: readonly GameModule[] = discovered

for (const game of ALL_GAMES) {
  if (game.icons) registerIcons(game.icons)
  if (game.sfx) audio.registerSfx(game.sfx)
}

/**
 * Em `npm run dev` e nos previews com `VITE_SHOW_UNRELEASED=1`, as estações
 * ainda não liberadas (`meta.released === false`) aparecem como qualquer
 * outra, para revisão. Em produção, cada estação decide por conta própria.
 */
const SHOW_UNRELEASED = import.meta.env.DEV || import.meta.env.VITE_SHOW_UNRELEASED === '1'

export function isReleased(meta: GameMeta): boolean {
  return meta.released || SHOW_UNRELEASED
}

/** Jogos visíveis nesta build: liberados, ou todos se `VITE_SHOW_UNRELEASED`/dev. */
export const GAMES: readonly GameModule[] = ALL_GAMES.filter((g) => isReleased(g.meta))

export const GAMES_BY_ID: ReadonlyMap<StationId, GameModule> = new Map(
  GAMES.map((g) => [g.meta.id, g]),
)

export function getGame(id: string | undefined): GameModule | undefined {
  return id ? GAMES_BY_ID.get(id as StationId) : undefined
}

/**
 * Metadados mínimos (id + ids das fases) dos jogos visíveis nesta build,
 * expostos em `window` só para o `e2e/layout.spec.ts` descobrir sozinho
 * quais jogos e fases existem, sem precisar listá-los à mão. Não é usado
 * pela UI; não expõe nada que a página já não mostre.
 */
declare global {
  interface Window {
    __SCALONATER_GAMES__?: { id: StationId; phases: string[] }[]
  }
}
if (typeof window !== 'undefined') {
  window.__SCALONATER_GAMES__ = GAMES.map((g) => ({
    id: g.meta.id,
    phases: g.phases.map((p) => p.id),
  }))
}
