import { expect, test, type Page } from '@playwright/test'
import {
  expectInsideViewportWidth,
  expectNoHorizontalScroll,
  expectTouchTargets,
  seedProgress,
  startPhase,
} from './helpers'

/** Ids das fases do Ciclo da CPU, na ordem da trilha do jogo. */
const CYCLE_PHASES = ['tutorial', 'nivel-1', 'nivel-2', 'nivel-3', 'nivel-4'] as const

/** Busca → decodifica → executa uma instrução (design doc: tocar em cada estação na ordem). */
async function completeInstruction(page: Page, pcAddress: number, op: string) {
  await page.locator(`[data-address="${pcAddress}"]`).click()
  await page.getByRole('button', { name: op, exact: true }).click()
  await page.getByRole('button', { name: 'Executar', exact: true }).click()
  await page.waitForTimeout(80)
}

/** Programa da Fase 1 (`phases.ts`): CARREGA 04, SOMA 05, GUARDA 04, PULA 00. */
const NIVEL1_PROGRAM: readonly [number, string][] = [
  [0, 'CARREGA'],
  [1, 'SOMA'],
  [2, 'GUARDA'],
  [3, 'PULA'],
]

async function completeNivel1(page: Page) {
  for (const [pc, op] of NIVEL1_PROGRAM) await completeInstruction(page, pc, op)
}

/**
 * O Ciclo da CPU vem depois de Bits e Memória na trilha (`engine/types.ts`,
 * `STATION_IDS`); Portas lógicas e ULA ainda não existem como jogo, então a
 * regra "linear, com exceção" os ignora e só exige Bits + Memória completos
 * para liberar a estação no mapa (`engine/phases/progression.ts`). O
 * `seedProgress` genérico só grava um jogo por vez, então aqui as duas
 * estações pré-requisito são marcadas completas diretamente.
 */
async function seedPrerequisites(page: Page) {
  await page.goto('/')
  await page.evaluate(() => {
    const complete = (ids: string[]) =>
      Object.fromEntries(
        ids.map((id) => [id, { stars: 2, bestScore: 100, completedAt: '2026-10-01T00:00:00Z' }]),
      )
    localStorage.setItem(
      'scalonater:progress',
      JSON.stringify({
        version: 1,
        games: {
          bits: {
            openingSeen: true,
            phases: complete(['tutorial', 'nivel-1', 'nivel-2', 'nivel-3', 'nivel-4', 'nivel-5']),
          },
          memory: {
            openingSeen: true,
            phases: complete(['tutorial', 'nivel-1', 'nivel-2', 'nivel-3', 'nivel-4']),
          },
        },
        cards: [],
        unseenCards: [],
      }),
    )
    localStorage.setItem('scalonater:settings', JSON.stringify({ version: 1, muted: true }))
  })
}

test.describe('jornada do Ciclo da CPU', () => {
  test('abertura do Kernel → tutorial → fase 1 → card no Manual → progresso salvo', async ({
    page,
  }) => {
    await seedPrerequisites(page)
    await page.goto('/')
    await page.locator('[data-station="cycle"]').click()
    await expect(page).toHaveURL(/\/jogo\/cycle$/)

    // abertura: até 3 falas
    await page.getByRole('button', { name: 'Próximo' }).click()
    await page.getByRole('button', { name: 'Próximo' }).click()
    await page.getByRole('button', { name: 'Vamos lá!' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Ciclo da CPU' })).toBeVisible()
    await expectNoHorizontalScroll(page)
    await expectTouchTargets(page)

    // tutorial: guiado, sem derrota, uma única instrução (CARREGA 02)
    await startPhase(page, 'cycle', 'tutorial')
    await expectNoHorizontalScroll(page)
    await expectInsideViewportWidth(page, '[data-game-active]')
    await expectTouchTargets(page)
    await completeInstruction(page, 0, 'CARREGA')
    await expect(page).toHaveURL(/\/jogo\/cycle\/tutorial\/resultado$/, { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: 'Fase concluída!' })).toBeVisible()
    await expectNoHorizontalScroll(page)
    await expectTouchTargets(page)

    // fase 1: desbloqueia o card "Buscar, decodificar, executar"
    await page.getByRole('link', { name: 'Próxima fase' }).click()
    await startPhase(page, 'cycle', 'nivel-1', 1)
    await completeNivel1(page)
    await expect(page).toHaveURL(/\/jogo\/cycle\/nivel-1\/resultado$/, { timeout: 60_000 })
    await expect(page.getByText('Card novo no Manual')).toBeVisible()

    // card de conceito abre no modal
    await page.getByRole('button', { name: 'Ver card' }).click()
    await expect(
      page.getByRole('dialog').getByRole('heading', { name: 'Buscar, decodificar, executar' }),
    ).toBeVisible()
    await page.getByRole('dialog').getByRole('button', { name: 'Fechar' }).click()

    // progresso persiste depois de recarregar
    await page.goto('/jogo/cycle')
    await page.reload()
    await expect(
      page.getByRole('link', { name: /Jogar: O acumulador guarda a conta/ }),
    ).toBeVisible()

    // Manual mostra o card ganho
    await page.goto('/manual')
    await expect(
      page.getByRole('heading', { name: 'Buscar, decodificar, executar' }),
    ).toBeVisible()
  })

  test('fase 1 cabe na tela e pausa', async ({ page }) => {
    await seedProgress(page, 'cycle', CYCLE_PHASES, 1)
    await startPhase(page, 'cycle', 'nivel-1', 1)
    await expectNoHorizontalScroll(page)
    await expectInsideViewportWidth(page, '[data-game-active]')
    await expectTouchTargets(page)

    await page.getByRole('button', { name: 'Pausar' }).first().click()
    await expect(page.getByRole('heading', { name: 'Pausado' })).toBeVisible()
    await page.getByRole('button', { name: 'Continuar' }).click()
    await expect(page.getByRole('heading', { name: 'Pausado' })).toBeHidden()
  })

  test('perder mostra a dica do Kernel e oferece jogar sem tempo', async ({ page }) => {
    await seedProgress(page, 'cycle', CYCLE_PHASES, 1)
    await startPhase(page, 'cycle', 'nivel-1', 1)
    // decodifica errado de propósito até perder (maxMistakes = 2 na fase 1)
    await page.locator('[data-address="0"]').click()
    await page.getByRole('button', { name: 'SOMA', exact: true }).click()
    await page.getByRole('button', { name: 'SOMA', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Tempo esgotado' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText('Dica do Kernel')).toBeVisible()
    await page.getByRole('button', { name: 'Jogar sem tempo' }).click()
    await expect(page.locator('[data-address="0"]')).toBeVisible()
  })
})

test.describe('teclado', () => {
  test('dá para jogar só com o teclado', async ({ page }) => {
    await seedProgress(page, 'cycle', CYCLE_PHASES, 0)
    await startPhase(page, 'cycle', 'tutorial', 1)

    const drawer = page.locator('[data-address="0"]')
    await drawer.focus()
    await page.keyboard.press('Enter')

    const carrega = page.getByRole('button', { name: 'CARREGA', exact: true })
    await expect(carrega).toBeEnabled()
    await carrega.focus()
    await page.keyboard.press('Enter')

    const executar = page.getByRole('button', { name: 'Executar', exact: true })
    await executar.focus()
    await page.keyboard.press('Enter')

    await expect(page).toHaveURL(/\/jogo\/cycle\/tutorial\/resultado$/, { timeout: 15_000 })
  })
})
