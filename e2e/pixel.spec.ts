import { expect, test, type Page } from '@playwright/test'
import {
  expectInsideViewportWidth,
  expectNoHorizontalScroll,
  expectTouchTargets,
  startPhase,
} from './helpers'

/** Ids das fases da estação "Do clique ao pixel", na ordem da trilha do jogo. */
const PIXEL_PHASES = ['tutorial', 'nivel-1', 'nivel-2', 'nivel-3'] as const

/**
 * "Do clique ao pixel" é a única estação com liberação condicional especial
 * (design doc, `docs/PLANEJAMENTO.md` seção 2.3/4.11): ela exige as 10
 * outras estações completas, não só a anterior na trilha
 * (`meta.prerequisites` em `src/games/pixel/index.ts`). Para abrir o mapa
 * com `pixel` disponível, as 10 precisam estar marcadas como completas.
 */
async function seedAllPrerequisites(page: Page, extra: Record<string, unknown> = {}) {
  await page.goto('/')
  await page.evaluate(
    ({ extra }) => {
      const complete = (ids: string[]) =>
        Object.fromEntries(
          ids.map((id) => [id, { stars: 2, bestScore: 100, completedAt: '2026-10-01T00:00:00Z' }]),
        )
      const done = (ids: string[]) => ({ openingSeen: true, phases: complete(ids) })
      localStorage.setItem(
        'scalonater:progress',
        JSON.stringify({
          version: 1,
          games: {
            bits: done(['tutorial', 'nivel-1', 'nivel-2', 'nivel-3', 'nivel-4', 'nivel-5']),
            gates: done(['tutorial', 'nivel-1', 'nivel-2', 'nivel-3', 'nivel-4']),
            alu: done(['tutorial', 'nivel-1', 'nivel-2', 'nivel-3', 'nivel-4']),
            memory: done(['tutorial', 'nivel-1', 'nivel-2', 'nivel-3', 'nivel-4']),
            cycle: done(['tutorial', 'nivel-1', 'nivel-2', 'nivel-3', 'nivel-4']),
            cache: done([
              'tutorial',
              'bancada-cheia',
              'volta-a-pedir',
              'vizinhos-de-linha',
              'dois-niveis',
            ]),
            storage: done(['tutorial', 'nivel-1', 'nivel-2', 'nivel-3', 'nivel-4']),
            cores: done(['tutorial', 'io-wait', 'time-slice', 'smt-cache']),
            io: done(['tutorial', 'fila-na-porta', 'quem-nao-espera', 'perguntar-ou-campainha', 'dma']),
            network: done(['tutorial', 'nivel-1', 'nivel-2', 'nivel-3', 'nivel-4']),
          },
          cards: [],
          unseenCards: [],
        }),
      )
      localStorage.setItem(
        'scalonater:settings',
        JSON.stringify({ version: 1, muted: true, ...extra }),
      )
    },
    { extra },
  )
}

/** Marca também o progresso do próprio `pixel` (`cleared` primeiras fases). */
async function seedPixelProgress(page: Page, cleared: number, extra: Record<string, unknown> = {}) {
  await seedAllPrerequisites(page, extra)
  await page.evaluate(
    ({ ids }) => {
      const raw = localStorage.getItem('scalonater:progress')
      const progress = raw ? JSON.parse(raw) : { version: 1, games: {}, cards: [], unseenCards: [] }
      progress.games.pixel = {
        openingSeen: true,
        phases: Object.fromEntries(
          ids.map((id) => [id, { stars: 2, bestScore: 100, completedAt: '2026-10-01T00:00:00Z' }]),
        ),
      }
      localStorage.setItem('scalonater:progress', JSON.stringify(progress))
    },
    { ids: PIXEL_PHASES.slice(0, cleared) },
  )
}

/** Capítulo 1 (Entrada): tocar o mouse, depois "Guardar e atender". */
async function completeTutorialChapter(page: Page) {
  await page.locator('[data-click-mouse]').click()
  await page.locator('[data-guard-button]').click()
  await page.getByRole('button', { name: 'Continuar' }).click()
}

/** Capítulo 2 (Decisão): escalonador → ciclo → ULA. */
async function completeNivel1(page: Page) {
  await page.getByRole('button', { name: 'Thread do clique' }).click()
  await page.locator('[data-slot="0"][data-filled="false"]').click()
  const executar = page.getByRole('button', { name: 'Executar', exact: true })
  await executar.click()
  await executar.click()
  await executar.click()
  await page.locator('[data-select-op="add"]').click()
}

/** Capítulo 3 (Dados): cache (falha, acerto) → disco (blocos 2, 5, 7). */
async function completeNivel2(page: Page) {
  const addr = page.getByRole('button', { name: 'Endereço 42' })
  await addr.click()
  await addr.click()
  for (const block of [2, 5, 7]) await page.locator(`[data-block="${block}"]`).click()
}

/**
 * Capítulo 4 (Saída): a carinha da Fase 5 de Bits (`TARGET_IMAGE`) já vem
 * 48/64 bits pré-marcados; faltam os índices 50, 53, 59 e 60 (ver
 * `src/games/pixel/phases.ts`).
 */
async function completeNivel3(page: Page) {
  for (const index of [50, 53, 59, 60]) {
    await page.locator('[role="switch"]').nth(index).click()
  }
}

test.describe('jornada de "Do clique ao pixel"', () => {
  test('abertura do Kernel → tutorial → 3 fases → card no Manual → progresso salvo', async ({
    page,
  }) => {
    await seedAllPrerequisites(page)
    await page.goto('/')
    await page.locator('[data-station="pixel"]').click()
    await expect(page).toHaveURL(/\/jogo\/pixel$/)

    // abertura: até 3 falas
    await page.getByRole('button', { name: 'Próximo' }).click()
    await page.getByRole('button', { name: 'Próximo' }).click()
    await page.getByRole('button', { name: 'Vamos lá!' }).click()
    await expect(
      page.getByRole('heading', { level: 1, name: 'Do clique ao pixel' }),
    ).toBeVisible()
    await expectTouchTargets(page)

    // capítulo 1 (Entrada): guiado, sem derrota
    await startPhase(page, 'pixel', 'tutorial')
    await expectNoHorizontalScroll(page)
    await expectInsideViewportWidth(page, '[data-game-active]')
    await expectTouchTargets(page)
    await completeTutorialChapter(page)
    await expect(page).toHaveURL(/\/jogo\/pixel\/tutorial\/resultado$/, { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: 'Fase concluída!' })).toBeVisible()

    // capítulo 2 (Decisão)
    await page.getByRole('link', { name: 'Próxima fase' }).click()
    await startPhase(page, 'pixel', 'nivel-1', 1)
    await expectNoHorizontalScroll(page)
    await expectTouchTargets(page)
    await completeNivel1(page)
    await expect(page).toHaveURL(/\/jogo\/pixel\/nivel-1\/resultado$/, { timeout: 60_000 })

    // capítulo 3 (Dados)
    await page.getByRole('link', { name: 'Próxima fase' }).click()
    await startPhase(page, 'pixel', 'nivel-2', 1)
    await completeNivel2(page)
    await expect(page).toHaveURL(/\/jogo\/pixel\/nivel-2\/resultado$/, { timeout: 60_000 })

    // capítulo 4 (Saída): sem relógio, desbloqueia o card "O caminho de um clique"
    await page.getByRole('link', { name: 'Próxima fase' }).click()
    await startPhase(page, 'pixel', 'nivel-3', 1)
    await expectNoHorizontalScroll(page)
    await expectTouchTargets(page)
    await completeNivel3(page)
    await expect(page).toHaveURL(/\/jogo\/pixel\/nivel-3\/resultado$/, { timeout: 15_000 })
    await expect(page.getByText('Card novo no Manual')).toBeVisible()

    // card de conceito abre no modal
    await page.getByRole('button', { name: 'Ver card' }).click()
    await expect(
      page.getByRole('dialog').getByRole('heading', { name: 'O caminho de um clique' }),
    ).toBeVisible()
    await page.getByRole('dialog').getByRole('button', { name: 'Fechar' }).click()

    // progresso persiste depois de recarregar
    await page.goto('/jogo/pixel')
    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: 'Do clique ao pixel' })).toBeVisible()

    // Manual mostra o card ganho
    await page.goto('/manual')
    await expect(
      page.getByRole('heading', { name: 'O caminho de um clique' }),
    ).toBeVisible()
  })

  test('fase 1 cabe na tela e pausa', async ({ page }) => {
    await seedPixelProgress(page, 1)
    await startPhase(page, 'pixel', 'nivel-1', 1)
    await expectNoHorizontalScroll(page)
    await expectInsideViewportWidth(page, '[data-game-active]')
    await expectTouchTargets(page)

    await page.getByRole('button', { name: 'Pausar' }).first().click()
    await expect(page.getByRole('heading', { name: 'Pausado' })).toBeVisible()
    await page.getByRole('button', { name: 'Continuar' }).click()
    await expect(page.getByRole('heading', { name: 'Pausado' })).toBeHidden()
  })

  test('tempo esgota na fase 1 (Decisão) e mostra a dica do Kernel', async ({ page }) => {
    await seedPixelProgress(page, 1)
    await startPhase(page, 'pixel', 'nivel-1', 8)
    await expect(page.getByRole('heading', { name: 'Tempo esgotado' })).toBeVisible({
      timeout: 20_000,
    })
    await expect(page.getByText('Dica do Kernel')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Jogar sem tempo' })).toBeVisible()
  })

  test('a fase 3 (Saída) nunca perde, mesmo sem nenhuma interação', async ({ page }) => {
    await seedPixelProgress(page, 3)
    await startPhase(page, 'pixel', 'nivel-3', 8)
    await page.waitForTimeout(3_000)
    await expect(page.getByRole('heading', { name: 'Tempo esgotado' })).toBeHidden()
    await expect(page.getByRole('heading', { name: 'Fase concluída!' })).toBeHidden()
  })
})

test.describe('teclado', () => {
  test('dá para jogar o tutorial só com o teclado', async ({ page }) => {
    await seedPixelProgress(page, 0)
    await startPhase(page, 'pixel', 'tutorial', 1)

    const mouseBtn = page.locator('[data-click-mouse]')
    await mouseBtn.focus()
    await page.keyboard.press('Enter')

    const guardBtn = page.locator('[data-guard-button]')
    await guardBtn.focus()
    await page.keyboard.press('Enter')

    const continueBtn = page.getByRole('button', { name: 'Continuar' })
    await continueBtn.focus()
    await page.keyboard.press('Enter')

    await expect(page).toHaveURL(/\/jogo\/pixel\/tutorial\/resultado$/, { timeout: 15_000 })
  })
})
