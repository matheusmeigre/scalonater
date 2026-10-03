import { expect, test, type Page } from '@playwright/test'
import {
  CORES_PHASES,
  expectInsideViewportWidth,
  expectNoHorizontalScroll,
  expectTouchTargets,
  seedProgress,
  startPhase,
} from './helpers'

/**
 * Ids das fases de Interrupções e E/S, na ordem da trilha do jogo (ver
 * `src/games/io/phases.ts`). Esta estação ainda está com `meta.released:
 * false` (DECISIONS.md), então ela só aparece com `VITE_SHOW_UNRELEASED=1`
 * (como em `npm run dev`): rode `VITE_SHOW_UNRELEASED=1 PORT=<porta> npm run
 * test:e2e` para este arquivo encontrar a estação no build de produção.
 */
export const IO_PHASES = [
  'tutorial',
  'fila-na-porta',
  'quem-nao-espera',
  'perguntar-ou-campainha',
  'dma',
] as const

/**
 * Marca como concluídas as estações que vêm antes de Interrupções e E/S na
 * trilha "linear, com exceção" (Bits, Portas lógicas, ULA, Memória, Ciclo
 * da CPU, Cache, Armazenamento e Núcleos, todas já implementadas nesta
 * build — `engine/phases/progression.ts`).
 */
async function seedPrerequisites(page: Page) {
  await page.goto('/')
  await page.evaluate(
    ({ coresPhases }: { coresPhases: readonly string[] }) => {
      const done = (ids: readonly string[]) =>
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
            cores: { openingSeen: true, phases: done(coresPhases) },
          },
          cards: [],
          unseenCards: [],
        }),
      )
      localStorage.setItem('scalonater:settings', JSON.stringify({ version: 1, muted: true }))
    },
    { coresPhases: CORES_PHASES },
  )
}

/** Guarda o contexto e atende o dispositivo que está chamando (tocando). */
async function guardAndAttend(page: import('@playwright/test').Page, device: string) {
  await expect(page.locator(`[data-device="${device}"][data-ringing="true"]`)).toBeVisible({
    timeout: 10_000,
  })
  await page.locator('[data-guard-button]').click()
  await page.locator(`[data-device="${device}"]`).click()
}

test.describe('jornada de Interrupções e E/S', () => {
  test('abertura do Kernel → tutorial → resultado com card → progresso salvo', async ({ page }) => {
    // io vem depois de várias estações na trilha ("linear, com exceção",
    // DECISIONS.md): precisa marcar todas as anteriores já implementadas
    // como concluídas para a estação deixar de aparecer bloqueada no mapa.
    await seedPrerequisites(page)
    await page.goto('/jogo/io')
    await expect(page).toHaveURL(/\/jogo\/io$/)

    // abertura: até 3 falas
    await page.getByRole('button', { name: 'Próximo' }).click()
    await page.getByRole('button', { name: 'Próximo' }).click()
    await page.getByRole('button', { name: 'Vamos lá!' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Interrupções' })).toBeVisible()
    await expectNoHorizontalScroll(page)
    await expectTouchTargets(page)

    // tutorial: guardar e atender 3 campainhas do teclado, sem derrota
    await startPhase(page, 'io', 'tutorial')
    await expectNoHorizontalScroll(page)
    await expectInsideViewportWidth(page, '[data-game-active]')
    await expectTouchTargets(page)

    for (let i = 0; i < 3; i++) await guardAndAttend(page, 'teclado')

    await expect(page).toHaveURL(/\/jogo\/io\/tutorial\/resultado$/)
    await expect(page.getByRole('heading', { name: 'Fase concluída!' })).toBeVisible()
    await expect(page.getByText('Card novo no Manual')).toBeVisible()
    await expectNoHorizontalScroll(page)
    await expectTouchTargets(page)

    // card de conceito abre no modal
    await page.getByRole('button', { name: 'Ver card' }).click()
    await expect(
      page.getByRole('dialog').getByRole('heading', { name: 'Entrada e saída' }),
    ).toBeVisible()
    await page.getByRole('dialog').getByRole('button', { name: 'Fechar' }).click()

    // progresso persiste depois de recarregar
    await page.goto('/jogo/io')
    await page.reload()
    await expect(page.getByRole('link', { name: /Jogar: Fila na porta/ })).toBeVisible()

    // Manual mostra o card ganho
    await page.goto('/manual')
    await expect(page.getByRole('heading', { name: 'Entrada e saída' })).toBeVisible()
  })

  test('fila cheia sem atendimento derrota a fase', async ({ page }) => {
    await seedProgress(page, 'io', IO_PHASES, 1)
    // não guarda nem atende nenhuma campainha: a fila cresce até perder as vidas
    await startPhase(page, 'io', 'fila-na-porta', 8)
    await expectNoHorizontalScroll(page)
    await expectTouchTargets(page)
    await expect(page.getByRole('heading', { name: 'Fila cheia' })).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByText('Dica do Kernel')).toBeVisible()
    await page.getByRole('button', { name: 'Jogar sem tempo' }).click()
    await expect(page.locator('[data-devices]')).toBeVisible()
  })
})

test.describe('teclado', () => {
  test('dá para guardar e atender só com o teclado', async ({ page }) => {
    await seedProgress(page, 'io', IO_PHASES, 0)
    await startPhase(page, 'io', 'tutorial', 1)

    await expect(page.locator('[data-device="teclado"][data-ringing="true"]')).toBeVisible({
      timeout: 10_000,
    })
    await page.locator('[data-guard-button]').focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('[data-guard-button]')).toBeDisabled()

    await page.locator('[data-device="teclado"]').focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('[data-device="teclado"]')).toHaveAttribute('data-ringing', 'false')
  })
})
