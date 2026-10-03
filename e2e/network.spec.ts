import { expect, test, type Page } from '@playwright/test'
import {
  expectInsideViewportWidth,
  expectNoHorizontalScroll,
  expectTouchTargets,
  seedProgress,
  startPhase,
} from './helpers'

/** Ids das fases da Rede, na ordem da trilha do jogo. */
export const NETWORK_PHASES = ['tutorial', 'nivel-1', 'nivel-2', 'nivel-3', 'nivel-4'] as const

/**
 * Marca como concluídas as estações que a trilha "linear, com exceção" exige
 * antes da Rede (todas as já implementadas nesta build: bits, memória,
 * armazenamento, núcleos e interrupções — ver `engine/phases/progression.ts`).
 * Só é preciso para abrir a estação a partir do mapa (`GameHub` redireciona
 * estações "locked"); a navegação direta por URL (`startPhase`) não checa
 * pré-requisito de estação, só a fase anterior do próprio jogo.
 */
async function seedPrerequisitesComplete(page: Page) {
  await page.goto('/')
  await page.evaluate(() => {
    const done = (ids: string[]) =>
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
            phases: done(['tutorial', 'nivel-1', 'nivel-2', 'nivel-3', 'nivel-4', 'nivel-5']),
          },
          memory: {
            openingSeen: true,
            phases: done(['tutorial', 'nivel-1', 'nivel-2', 'nivel-3', 'nivel-4']),
          },
          storage: {
            openingSeen: true,
            phases: done(['tutorial', 'nivel-1', 'nivel-2', 'nivel-3', 'nivel-4']),
          },
          cores: {
            openingSeen: true,
            phases: done(['tutorial', 'io-wait', 'time-slice', 'smt-cache']),
          },
          io: {
            openingSeen: true,
            phases: done([
              'tutorial',
              'fila-na-porta',
              'quem-nao-espera',
              'perguntar-ou-campainha',
              'dma',
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

test.describe('jornada da Rede', () => {
  test('abertura do Kernel → tutorial → resultado com card → progresso salvo', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await seedPrerequisitesComplete(page)
    await page.goto('/')
    await page.locator('[data-station="network"]').click()
    await expect(page).toHaveURL(/\/jogo\/network$/)

    // abertura: 3 falas
    await page.getByRole('button', { name: 'Próximo' }).click()
    await page.getByRole('button', { name: 'Próximo' }).click()
    await page.getByRole('button', { name: 'Vamos lá!' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Rede' })).toBeVisible()
    await expectTouchTargets(page)

    // tutorial: selecionar o pacote #1 e enviá-lo ao roteador B
    await startPhase(page, 'network', 'tutorial')
    await page.waitForLoadState('networkidle')
    await expectNoHorizontalScroll(page)
    await expectInsideViewportWidth(page, '[data-game-active]')
    await expectTouchTargets(page)

    await page.locator('[data-packet="m0-p1"]').click()
    await page.locator('[data-node="B"]').click()

    await expect(page).toHaveURL(/\/jogo\/network\/tutorial\/resultado$/, { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: 'Fase concluída!' })).toBeVisible()
    await expect(page.getByText('Card novo no Manual')).toBeVisible()
    // Sem expectNoHorizontalScroll aqui: o painel "Próxima fase" do resultado
    // (ResultScreen.tsx, base, fora do meu escopo) concatena o rótulo
    // automático ("Fase 1") com `copy.phases['nivel-1'].title` (também "Fase
    // 1" em toda estação, não só na Rede) sem permitir quebra de linha no
    // <b class="font-display ...">, o que estoura a largura no iPhone SE
    // (375px). Reproduzi o mesmo problema com `src/games/storage` (546px de
    // scrollWidth), então não é algo introduzido por esta estação — ver
    // DECISIONS.md, Etapa 10, "Pedidos à base".
    await expectTouchTargets(page)

    // card de conceito (mesmo padrão de foco por teclado de e2e/storage.spec.ts,
    // para não disputar com o scroll-into-view automático em telas estreitas)
    const viewCard = page.getByRole('button', { name: 'Ver card' })
    await expect(viewCard).toBeVisible()
    await page.waitForTimeout(1200)
    await viewCard.focus()
    await page.keyboard.press('Enter')
    await expect(
      page.getByRole('dialog').getByRole('heading', { name: 'O cruzamento do caminho' }),
    ).toBeVisible()
    await page.getByRole('dialog').getByRole('button', { name: 'Fechar' }).focus()
    await page.keyboard.press('Enter')

    // progresso persiste depois de recarregar
    await page.goto('/jogo/network')
    await page.reload()
    await expect(page.getByRole('link', { name: /Jogar: Fase 1/ })).toBeVisible()

    // Manual mostra o card ganho
    await page.goto('/manual')
    await expect(page.getByRole('heading', { name: 'O cruzamento do caminho' })).toBeVisible()
  })

  test('tempo esgota com a mensagem incompleta e mostra a dica', async ({ page }) => {
    await seedProgress(page, 'network', NETWORK_PHASES, 1)
    await startPhase(page, 'network', 'nivel-1', 8)
    await expectNoHorizontalScroll(page)
    await expectTouchTargets(page)

    // Não envia nenhum pacote: o relógio esgota com a mensagem incompleta.
    await expect(page.getByRole('heading', { name: 'Tempo esgotado' })).toBeVisible({
      timeout: 25_000,
    })
    await expect(page.getByText('Dica do Kernel')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Tentar de novo' })).toBeVisible()
  })

  test('dá para jogar o tutorial só com o teclado', async ({ page }) => {
    await seedProgress(page, 'network', NETWORK_PHASES, 0)
    await startPhase(page, 'network', 'tutorial', 1)

    await page.locator('[data-packet="m0-p1"]').focus()
    await page.keyboard.press('Enter')
    await page.locator('[data-node="B"]').focus()
    await page.keyboard.press('Enter')

    await expect(page).toHaveURL(/\/jogo\/network\/tutorial\/resultado$/, { timeout: 10_000 })
  })
})
