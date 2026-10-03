import { expect, test, type Page } from '@playwright/test'
import {
  CORES_PHASES,
  expectInsideViewportWidth,
  expectNoHorizontalScroll,
  expectTouchTargets,
  playByTapping,
  seedProgress,
  startPhase,
} from './helpers'

/**
 * Marca como concluídas as estações que vêm antes do Núcleos na trilha
 * "linear, com exceção" (Bits, Portas lógicas, ULA, Memória, Ciclo da CPU,
 * Cache e Armazenamento, todas já implementadas nesta build —
 * `engine/phases/progression.ts`). Quando este teste foi escrito, o Núcleos
 * era a única estação implementada e por isso ficava liberada sem
 * pré-requisito; hoje ela vem depois de sete outras estações na trilha.
 */
async function seedCoresPrerequisites(page: Page) {
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
          gates: {
            openingSeen: true,
            phases: done(['tutorial', 'nivel-1', 'nivel-2', 'nivel-3', 'nivel-4']),
          },
          alu: {
            openingSeen: true,
            phases: done(['tutorial', 'nivel-1', 'nivel-2', 'nivel-3', 'nivel-4']),
          },
          memory: {
            openingSeen: true,
            phases: done(['tutorial', 'nivel-1', 'nivel-2', 'nivel-3', 'nivel-4']),
          },
          cycle: {
            openingSeen: true,
            phases: done(['tutorial', 'nivel-1', 'nivel-2', 'nivel-3', 'nivel-4']),
          },
          cache: {
            openingSeen: true,
            phases: done([
              'tutorial',
              'bancada-cheia',
              'volta-a-pedir',
              'vizinhos-de-linha',
              'dois-niveis',
            ]),
          },
          storage: {
            openingSeen: true,
            phases: done(['tutorial', 'nivel-1', 'nivel-2', 'nivel-3', 'nivel-4']),
          },
        },
        cards: [],
        unseenCards: [],
      }),
    )
    localStorage.setItem('scalonater:settings', JSON.stringify({ version: 1, muted: true }))
  })
}

test.describe('mapa da placa-mãe', () => {
  test('mostra as estações, libera o Núcleos e cabe na tela', async ({ page }) => {
    await seedCoresPrerequisites(page)
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: 'A placa-mãe' })).toBeVisible()
    await expect(page.locator('[data-station]')).toHaveCount(11)
    await expect(page.locator('[data-station="cores"]')).toHaveAttribute('data-status', 'available')
    // "pixel" é a única estação da trilha ainda sem jogo implementado.
    await expect(page.locator('[data-station="pixel"]')).toHaveAttribute('data-status', 'soon')
    await expectNoHorizontalScroll(page)
    await expectTouchTargets(page)
  })

  test('estação em construção explica em vez de abrir', async ({ page }) => {
    await page.goto('/')
    await page.locator('[data-station="pixel"]').click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByText('ainda está sendo construída')).toBeVisible()
  })
})

test.describe('jornada do Núcleos', () => {
  test('abertura do Kernel → tutorial → resultado com card → progresso salvo', async ({ page }) => {
    await seedCoresPrerequisites(page)
    await page.goto('/')
    await page.locator('[data-station="cores"]').click()
    await expect(page).toHaveURL(/\/jogo\/cores$/)

    // abertura: até 3 falas
    await page.getByRole('button', { name: 'Próximo' }).click()
    await page.getByRole('button', { name: 'Próximo' }).click()
    await page.getByRole('button', { name: 'Vamos lá!' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Núcleos' })).toBeVisible()
    await expectNoHorizontalScroll(page)
    await expectTouchTargets(page)

    // tutorial: sem derrota, só tocando
    await startPhase(page, 'cores', 'tutorial')
    await expectNoHorizontalScroll(page)
    await expectInsideViewportWidth(page, '[data-slot]')
    await expectTouchTargets(page)
    await page.locator('[data-thread]').first().click()
    await expect(page.locator('[data-thread][aria-pressed="true"]')).toHaveCount(1)
    await playByTapping(page, /resultado$/)

    await expect(page).toHaveURL(/\/jogo\/cores\/tutorial\/resultado$/)
    await expect(page.getByRole('heading', { name: 'Fase concluída!' })).toBeVisible()
    await expect(page.getByText('Card novo no Manual')).toBeVisible()
    await expectNoHorizontalScroll(page)
    await expectTouchTargets(page)

    // card de conceito abre no modal
    await page.getByRole('button', { name: 'Ver card' }).click()
    await expect(
      page.getByRole('dialog').getByRole('heading', { name: 'Escalonador' }),
    ).toBeVisible()
    await page.getByRole('dialog').getByRole('button', { name: 'Fechar' }).click()

    // progresso persiste depois de recarregar
    await page.goto('/jogo/cores')
    await page.reload()
    await expect(page.getByRole('link', { name: /Jogar: Esperando dados/ })).toBeVisible()

    // Manual mostra o card ganho
    await page.goto('/manual')
    await expect(page.getByRole('heading', { name: 'Escalonador' })).toBeVisible()
  })

  test('fase com espera de dados cabe na tela e pausa', async ({ page }) => {
    await seedProgress(page, 'cores', CORES_PHASES, 1)
    await startPhase(page, 'cores', 'io-wait', 1)
    await page.locator('[data-slot][data-filled="false"]').first().click()
    await expect(page.locator('[data-slot][data-filled="true"]')).toHaveCount(1)
    await expectNoHorizontalScroll(page)
    await expectInsideViewportWidth(page, '[data-slot], [data-zone]')
    await expectTouchTargets(page)

    await page.getByRole('button', { name: 'Pausar' }).first().click()
    await expect(page.getByRole('heading', { name: 'Pausado' })).toBeVisible()
    await page.getByRole('button', { name: 'Continuar' }).click()
    await expect(page.getByRole('heading', { name: 'Pausado' })).toBeHidden()
  })

  test('fase SMT (2 espaços por núcleo) não corta nada', async ({ page }) => {
    await seedProgress(page, 'cores', CORES_PHASES, 3)
    await startPhase(page, 'cores', 'smt-cache', 1)
    await expect(page.locator('[data-slot]')).toHaveCount(8)
    for (let i = 0; i < 3; i++)
      await page.locator('[data-slot][data-filled="false"]').first().click()
    await expectNoHorizontalScroll(page)
    await expectInsideViewportWidth(page, '[data-slot], [data-zone]')
    await expectTouchTargets(page)
    // a lista de núcleos não passa da altura do próprio processador
    const overflow = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('[data-core]')].some(
        (c) => c.scrollHeight > c.clientHeight + 1,
      ),
    )
    expect(overflow).toBe(false)
  })

  test('perder mostra dica e permite tentar sem tempo', async ({ page }) => {
    await seedProgress(page, 'cores', CORES_PHASES, 1)
    await startPhase(page, 'cores', 'io-wait', 20)
    // não joga: o tempo acaba
    await expect(page.getByRole('heading', { name: 'Tempo esgotado' })).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByText('Dica do Kernel')).toBeVisible()
    await page.getByRole('button', { name: 'Jogar sem tempo' }).click()
    await expect(page.getByText('Livre', { exact: true }).first()).toBeVisible()
  })
})

test.describe('teclado e arraste', () => {
  test('dá para jogar só com o teclado', async ({ page }) => {
    await seedProgress(page, 'cores', CORES_PHASES, 1)
    await startPhase(page, 'cores', 'tutorial', 1)
    await page.locator('[data-thread]').first().focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('[data-thread][aria-pressed="true"]')).toHaveCount(1)
    await page.locator('[data-slot="2"]').focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('[data-slot="2"]')).toHaveAttribute('data-filled', 'true')
  })

  test('arrastar uma thread da fila até um núcleo', async ({ page, isMobile }) => {
    test.skip(isMobile, 'arraste com mouse só no desktop; no toque o caminho é tocar e tocar')
    await seedProgress(page, 'cores', CORES_PHASES, 1)
    await startPhase(page, 'cores', 'tutorial', 1)
    const thread = page.locator('[data-thread]').first()
    const slot = page.locator('[data-slot="3"]')
    const a = (await thread.boundingBox())!
    const b = (await slot.boundingBox())!
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
    await page.mouse.down()
    await page.mouse.move(a.x + a.width / 2 + 20, a.y + a.height / 2, { steps: 4 })
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 })
    await page.mouse.up()
    await expect(slot).toHaveAttribute('data-filled', 'true')
  })
})

test.describe('PWA', () => {
  test('funciona offline depois do primeiro acesso', async ({
    page,
    context,
    browserName,
    isMobile,
  }) => {
    test.skip(browserName !== 'chromium' || isMobile, 'service worker testado no Chromium desktop')
    await page.goto('/')
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready
    })
    await page.reload()
    await context.setOffline(true)
    await page.goto('/jogo/cores/tutorial')
    await expect(page.getByRole('dialog').getByRole('button', { name: /^jogar/i })).toBeVisible()
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: 'A placa-mãe' })).toBeVisible()
    await context.setOffline(false)
  })

  test('manifesto instalável', async ({ request }) => {
    const res = await request.get('/manifest.webmanifest')
    expect(res.ok()).toBe(true)
    const m = await res.json()
    expect(m.display).toBe('standalone')
    expect(m.lang).toBe('pt-BR')
    expect(m.icons.some((i: { sizes: string }) => i.sizes === '512x512')).toBe(true)
  })
})
