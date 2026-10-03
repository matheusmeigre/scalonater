import { expect, test, type Page } from '@playwright/test'
import {
  expectInsideViewportWidth,
  expectNoHorizontalScroll,
  expectTouchTargets,
  seedProgress,
  startPhase,
} from './helpers'

/** Ids das fases da Memória, na ordem da trilha do jogo. */
const MEMORY_PHASES = ['tutorial', 'nivel-1', 'nivel-2', 'nivel-3', 'nivel-4'] as const

/**
 * Marca como concluídas as estações que vêm antes da Memória na trilha
 * "linear, com exceção" (Bits, Portas lógicas e ULA, todas já implementadas
 * nesta build — `engine/phases/progression.ts`). Sem isso, a Memória aparece
 * "locked" no mapa e o clique em `[data-station="memory"]` não abre nada.
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
          gates: {
            openingSeen: true,
            phases: complete(['tutorial', 'nivel-1', 'nivel-2', 'nivel-3', 'nivel-4']),
          },
          alu: {
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

/**
 * Lê o endereço pedido na ficha atual (via `aria-label`, que sempre contém
 * "gaveta N") e toca nela — tocando antes na ficha quando é um pedido de
 * GUARDAR. Devolve `false` quando não há mais pedido (fase acabou).
 */
async function completeCurrentRequest(page: Page): Promise<boolean> {
  const ticket = page.locator('[data-ticket]')
  const label = (await ticket.getAttribute('aria-label')) ?? ''
  const address = label.match(/gaveta (\d+)/i)?.[1]
  if (address === undefined) return false
  if (/guardar/i.test(label)) await ticket.click()
  await page.locator(`[data-address="${address}"]`).click()
  return true
}

async function completeRequests(page: Page, count: number) {
  for (let i = 0; i < count; i++) {
    const ok = await completeCurrentRequest(page)
    if (!ok) break
    await page.waitForTimeout(80)
  }
}

test.describe('jornada da Memória', () => {
  test('abertura do Kernel → tutorial → fase 1 → card no Manual → progresso salvo', async ({
    page,
  }) => {
    await seedPrerequisites(page)
    await page.goto('/')
    await page.locator('[data-station="memory"]').click()
    await expect(page).toHaveURL(/\/jogo\/memory$/)

    // abertura: até 3 falas
    await page.getByRole('button', { name: 'Próximo' }).click()
    await page.getByRole('button', { name: 'Próximo' }).click()
    await page.getByRole('button', { name: 'Vamos lá!' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Memória' })).toBeVisible()
    await expectNoHorizontalScroll(page)
    await expectTouchTargets(page)

    // tutorial: guiado, sem derrota, só tocando
    await startPhase(page, 'memory', 'tutorial')
    await expectNoHorizontalScroll(page)
    await expectInsideViewportWidth(page, '[data-game-active]')
    await expectTouchTargets(page)
    await completeRequests(page, 2)
    await expect(page).toHaveURL(/\/jogo\/memory\/tutorial\/resultado$/, { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: 'Fase concluída!' })).toBeVisible()
    await expectNoHorizontalScroll(page)
    await expectTouchTargets(page)

    // fase 1: desbloqueia o card "A estante de gavetas"
    await page.getByRole('link', { name: 'Próxima fase' }).click()
    await startPhase(page, 'memory', 'nivel-1', 1)
    await completeRequests(page, 8)
    await expect(page).toHaveURL(/\/jogo\/memory\/nivel-1\/resultado$/, { timeout: 60_000 })
    await expect(page.getByText('Card novo no Manual')).toBeVisible()

    // card de conceito abre no modal
    await page.getByRole('button', { name: 'Ver card' }).click()
    await expect(
      page.getByRole('dialog').getByRole('heading', { name: 'A estante de gavetas' }),
    ).toBeVisible()
    await page.getByRole('dialog').getByRole('button', { name: 'Fechar' }).click()

    // progresso persiste depois de recarregar
    await page.goto('/jogo/memory')
    await page.reload()
    await expect(page.getByRole('link', { name: /Jogar: Endereços em binário/ })).toBeVisible()

    // Manual mostra o card ganho
    await page.goto('/manual')
    await expect(page.getByRole('heading', { name: 'A estante de gavetas' })).toBeVisible()
  })

  test('fase 1 cabe na tela e pausa', async ({ page }) => {
    await seedProgress(page, 'memory', MEMORY_PHASES, 1)
    await startPhase(page, 'memory', 'nivel-1', 1)
    await expectNoHorizontalScroll(page)
    await expectInsideViewportWidth(page, '[data-game-active]')
    await expectTouchTargets(page)

    await page.getByRole('button', { name: 'Pausar' }).first().click()
    await expect(page.getByRole('heading', { name: 'Pausado' })).toBeVisible()
    await page.getByRole('button', { name: 'Continuar' }).click()
    await expect(page.getByRole('heading', { name: 'Pausado' })).toBeHidden()
  })

  test('perder mostra a dica do Kernel e oferece jogar sem tempo', async ({ page }) => {
    await seedProgress(page, 'memory', MEMORY_PHASES, 1)
    await startPhase(page, 'memory', 'nivel-1', 20)
    // não joga: as fichas expiram até perder (maxMistakes = 3)
    await expect(page.getByRole('heading', { name: 'Tempo esgotado' })).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByText('Dica do Kernel')).toBeVisible()
    await page.getByRole('button', { name: 'Jogar sem tempo' }).click()
    await expect(page.locator('[data-ticket]')).toBeVisible()
  })
})

test.describe('teclado', () => {
  test('dá para jogar só com o teclado', async ({ page }) => {
    await seedProgress(page, 'memory', MEMORY_PHASES, 0)
    await startPhase(page, 'memory', 'tutorial', 1)

    const ticket = page.locator('[data-ticket]')
    await ticket.focus()
    await page.keyboard.press('Enter')
    await expect(ticket).toHaveAttribute('aria-pressed', 'true')

    const label = (await ticket.getAttribute('aria-label')) ?? ''
    const address = label.match(/gaveta (\d+)/i)![1]!
    const drawer = page.locator(`[data-address="${address}"]`)
    await drawer.focus()
    await page.keyboard.press('Enter')

    // o próximo pedido (ler a mesma gaveta) já chegou
    await expect(ticket).not.toHaveAttribute('aria-pressed', 'true')
    await expect(drawer).toHaveAttribute('data-empty', 'false')

    // completa o pedido de leitura também pelo teclado
    await drawer.focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/jogo\/memory\/tutorial\/resultado$/, { timeout: 15_000 })
  })
})
