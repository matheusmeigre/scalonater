import { expect, test, type Page } from '@playwright/test'
import {
  expectInsideViewportWidth,
  expectNoHorizontalScroll,
  expectTouchTargets,
  seedProgress,
  startPhase,
} from './helpers'

/** Ids das fases do Armazenamento, na ordem da trilha do jogo. */
export const STORAGE_PHASES = ['tutorial', 'nivel-1', 'nivel-2', 'nivel-3', 'nivel-4'] as const

/**
 * Marca como concluídas as estações que vêm antes do Armazenamento na
 * trilha "linear, com exceção" (Bits, Portas lógicas, ULA, Memória, Ciclo
 * da CPU e Cache, todas já implementadas nesta build —
 * `engine/phases/progression.ts`). Sem isso, o Armazenamento aparece
 * "locked" no mapa.
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
          memory: {
            openingSeen: true,
            phases: complete(['tutorial', 'nivel-1', 'nivel-2', 'nivel-3', 'nivel-4']),
          },
          cycle: {
            openingSeen: true,
            phases: complete(['tutorial', 'nivel-1', 'nivel-2', 'nivel-3', 'nivel-4']),
          },
          cache: {
            openingSeen: true,
            phases: complete([
              'tutorial',
              'bancada-cheia',
              'volta-a-pedir',
              'vizinhos-de-linha',
              'dois-niveis',
            ]),
          },
        },
        cards: [],
        unseenCards: [],
      }),
    )
    localStorage.setItem('scalonater:settings', JSON.stringify({ version: 1, muted: true }))
  })
}

/** Toca em blocos livres, em ordem crescente de índice, até completar `count`. */
async function tapFreeBlocks(page: import('@playwright/test').Page, count: number) {
  for (let i = 0; i < count; i++) {
    await page.locator('[data-block][data-state="free"]').first().click()
  }
}

test.describe('jornada do Armazenamento', () => {
  test('abertura do Kernel → tutorial → resultado com card → progresso salvo', async ({
    page,
  }) => {
    await seedPrerequisites(page)
    await page.goto('/')
    await page.locator('[data-station="storage"]').click()
    await expect(page).toHaveURL(/\/jogo\/storage$/)

    // abertura: até 3 falas
    await page.getByRole('button', { name: 'Próximo' }).click()
    await page.getByRole('button', { name: 'Próximo' }).click()
    await page.getByRole('button', { name: 'Vamos lá!' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Armazenamento' })).toBeVisible()
    // GameHub.tsx (base) agora quebra o título com `wrap-anywhere` — ver
    // DECISIONS.md, Etapa 7, "Pedidos à base" (corrigido).
    await expectNoHorizontalScroll(page)
    await expectTouchTargets(page)

    // tutorial: salvar o arquivo A (3 blocos) tocando em blocos livres
    await startPhase(page, 'storage', 'tutorial')
    // Espera o chunk CSS da cena (code-split) carregar antes de medir o
    // layout — sob disputa de CPU (muitos projetos em paralelo), a grade do
    // disco pode ainda não ter a própria folha de estilo aplicada no
    // primeiro paint, o que mediria uma rolagem horizontal falsa.
    await page.waitForLoadState('networkidle')
    await expectNoHorizontalScroll(page)
    await expectInsideViewportWidth(page, '[data-game-active]')
    await expectTouchTargets(page)
    await tapFreeBlocks(page, 3)
    await expect(page.locator('[data-file="A"]')).toBeVisible()

    // depois, achar o arquivo pela tabela conclui o tutorial
    await page.locator('[data-file="A"]').click()
    await expect(page).toHaveURL(/\/jogo\/storage\/tutorial\/resultado$/, { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: 'Fase concluída!' })).toBeVisible()
    await expect(page.getByText('Card novo no Manual')).toBeVisible()
    await expectNoHorizontalScroll(page)
    await expectTouchTargets(page)

    // card de conceito abre no modal. O painel do card tem uma entrada
    // animada de ~1s; em telas estreitas o scroll-into-view do clique de
    // mouse disputa com o foco automático do título da tela, então ativa
    // pelo teclado (robusto e também cobre a acessibilidade do botão).
    const viewCard = page.getByRole('button', { name: 'Ver card' })
    await expect(viewCard).toBeVisible()
    await page.waitForTimeout(1200)
    await viewCard.focus()
    await page.keyboard.press('Enter')
    await expect(
      page.getByRole('dialog').getByRole('heading', { name: 'A tabela que lembra onde está tudo' }),
    ).toBeVisible()
    // "Fechar" ganha autoFocus ao abrir o modal; ativa pelo teclado pelo
    // mesmo motivo do "Ver card" acima (evita a disputa de scroll-into-view
    // num modal alto em telas estreitas).
    await page.getByRole('dialog').getByRole('button', { name: 'Fechar' }).focus()
    await page.keyboard.press('Enter')

    // progresso persiste depois de recarregar
    await page.goto('/jogo/storage')
    await page.reload()
    await expect(page.getByRole('link', { name: /Jogar: Fase 1/ })).toBeVisible()

    // Manual mostra o card ganho
    await page.goto('/manual')
    await expect(
      page.getByRole('heading', { name: 'A tabela que lembra onde está tudo' }),
    ).toBeVisible()
  })

  test('escolher blocos espalhados no HD esgota o tempo e mostra a dica', async ({ page }) => {
    await seedProgress(page, 'storage', STORAGE_PHASES, 3)
    await startPhase(page, 'storage', 'nivel-3', 1)
    await expectNoHorizontalScroll(page)
    await expectTouchTargets(page)

    // Primeiro pedido: salvar A (4 blocos). Escolhas de propósito espalhadas
    // pelo disco custam caro no HD e passam do limite de tempo da fase.
    await page.locator('[data-block="0"]').click()
    await page.locator('[data-block="23"]').click()
    await page.locator('[data-block="1"]').click()
    await page.locator('[data-block="22"]').click()

    await expect(page.getByRole('heading', { name: 'Tempo do HD esgotado' })).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByText('Dica do Kernel')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Tentar de novo' })).toBeVisible()
  })

  test('dá para jogar o tutorial só com o teclado', async ({ page }) => {
    await seedProgress(page, 'storage', STORAGE_PHASES, 0)
    await startPhase(page, 'storage', 'tutorial', 1)

    for (let i = 0; i < 3; i++) {
      const block = page.locator('[data-block][data-state="free"]').first()
      await block.focus()
      await page.keyboard.press('Enter')
    }
    await expect(page.locator('[data-file="A"]')).toBeVisible()
    await page.locator('[data-file="A"]').focus()
    await page.keyboard.press('Enter')

    await expect(page).toHaveURL(/\/jogo\/storage\/tutorial\/resultado$/, { timeout: 10_000 })
  })
})
