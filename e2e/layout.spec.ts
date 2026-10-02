import { test } from '@playwright/test'
import {
  discoverGames,
  expectInsideViewportWidth,
  expectNoHorizontalScroll,
  expectTouchTargets,
  seedProgress,
  startPhase,
} from './helpers'

/**
 * Checagens de layout (sem rolagem horizontal, alvos de toque de 44px ou
 * mais, nada cortado) para **cada fase de cada jogo registrado** nesta
 * build — descobertos em tempo de execução via `window.__SCALONATER_GAMES__`
 * (ver `games/registry.ts`), não por uma lista escrita à mão. Um jogo novo
 * (ou uma fase nova) passa a ser coberto por este arquivo sem precisar
 * editá-lo (docs/PLANEJAMENTO.md, seção 3, Onda 1, item 9).
 *
 * Roda como um teste por projeto (viewport) para o relatório ficar legível;
 * cada fase é um `test.step` dentro dele.
 */
test('toda fase de todo jogo registrado cabe na tela', async ({ page }) => {
  const games = await discoverGames(page)
  for (const game of games) {
    if (game.phases.length === 0) continue
    // Marca todas as fases como vencidas: qualquer uma fica acessível direto
    // pela URL, sem depender da ordem de desbloqueio.
    await seedProgress(page, game.id, game.phases, game.phases.length)

    for (const phaseId of game.phases) {
      await test.step(`${game.id}/${phaseId}`, async () => {
        await startPhase(page, game.id, phaseId, 8)
        await expectNoHorizontalScroll(page)
        await expectTouchTargets(page)
        await expectInsideViewportWidth(page, '[data-game-active]')
      })
    }
  }
})
