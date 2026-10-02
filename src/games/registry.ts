import type { GameModule, StationId } from '@/engine/types'
import { coresGame } from './cores'

/**
 * Minigames prontos. Para adicionar um novo, crie src/games/<id>/ exportando um
 * GameModule e acrescente-o aqui. O mapa, as rotas e o Manual se ajustam sozinhos.
 */
export const GAMES: readonly GameModule[] = [coresGame]

export const GAMES_BY_ID: ReadonlyMap<StationId, GameModule> = new Map(
  GAMES.map((g) => [g.meta.id, g]),
)

export function getGame(id: string | undefined): GameModule | undefined {
  return id ? GAMES_BY_ID.get(id as StationId) : undefined
}
