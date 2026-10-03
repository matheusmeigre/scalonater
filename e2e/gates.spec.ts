import { expect, test } from '@playwright/test'
import { seedProgress, startPhase } from './helpers'

/** Ids das fases de Portas lógicas, na ordem da trilha do jogo. */
export const GATES_PHASES = ['tutorial', 'nivel-1', 'nivel-2', 'nivel-3', 'nivel-4'] as const

/** Ids das fases de Bits (pré-requisito da trilha: "linear, com exceção" — DECISIONS.md). */
const BITS_PHASES = ['tutorial', 'nivel-1', 'nivel-2', 'nivel-3', 'nivel-4', 'nivel-5'] as const

test.describe('jornada de Portas lógicas', () => {
  test('abertura do Kernel → tutorial → vitória → card no Manual → progresso salvo', async ({
    page,
  }) => {
    // Bits precede Portas lógicas na trilha ("linear, com exceção") e já está
    // liberado em produção: sem marcá-lo concluído, a estação apareceria
    // bloqueada no mapa.
    await seedProgress(page, 'bits', BITS_PHASES, BITS_PHASES.length)
    // seedProgress grava o localStorage depois do `page.goto('/')` interno:
    // sem recarregar, a store (hidratada na carga) não veria o progresso novo.
    await page.reload()
    await page.locator('[data-station="gates"]').click()
    await expect(page).toHaveURL(/\/jogo\/gates$/)

    // abertura: 3 falas (até o máximo permitido)
    await page.getByRole('button', { name: 'Próximo' }).click()
    await page.getByRole('button', { name: 'Próximo' }).click()
    await page.getByRole('button', { name: 'Vamos lá!' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Portas lógicas' })).toBeVisible()

    // tutorial: observar a porta NOT inverter nos dois estados do interruptor A
    await startPhase(page, 'gates', 'tutorial')
    await page.waitForLoadState('networkidle')
    const switchA = page.locator('[data-input="A"] button')
    await switchA.click() // liga
    await switchA.click() // desliga
    await expect(page).toHaveURL(/\/jogo\/gates\/tutorial\/resultado$/, { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: 'Fase concluída!' })).toBeVisible()

    // Fase 1: encaixar AND no único slot vence (card "Porta lógica" desbloqueia aqui)
    await page.getByRole('link', { name: 'Próxima fase' }).click()
    await expect(page).toHaveURL(/\/jogo\/gates\/nivel-1$/)
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /^jogar/i })
      .click()
    await expect(page.getByRole('dialog')).toBeHidden()

    await page.locator('[data-piece="AND"]').click()
    await page.locator('[data-slot="s1"]').click()
    await expect(page).toHaveURL(/\/jogo\/gates\/nivel-1\/resultado$/, { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: 'Fase concluída!' })).toBeVisible()
    await expect(page.getByText('Card novo no Manual')).toBeVisible()

    const viewCard = page.getByRole('button', { name: 'Ver card' })
    await expect(viewCard).toBeVisible()
    await page.waitForTimeout(1200)
    await viewCard.focus()
    await page.keyboard.press('Enter')
    await expect(
      page.getByRole('dialog').getByRole('heading', { name: 'Porta lógica' }),
    ).toBeVisible()
    await page.getByRole('dialog').getByRole('button', { name: 'Fechar' }).focus()
    await page.keyboard.press('Enter')

    // progresso persiste depois de recarregar
    await page.goto('/jogo/gates')
    await page.reload()
    await expect(page.getByRole('link', { name: /Jogar: Fase 2/ })).toBeVisible()

    // Manual mostra o card ganho
    await page.goto('/manual')
    await expect(page.getByRole('heading', { name: 'Porta lógica' })).toBeVisible()
  })

  test('deixar o tempo esgotar na Fase 1 derrota e mostra a dica do Kernel', async ({ page }) => {
    await seedProgress(page, 'gates', GATES_PHASES, 1)
    await startPhase(page, 'gates', 'nivel-1', 20)

    await expect(page.getByRole('heading', { name: 'Tempo esgotado' })).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByText('Dica do Kernel')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Tentar de novo' })).toBeVisible()
  })

  test('dá para jogar o tutorial só com o teclado', async ({ page }) => {
    await seedProgress(page, 'gates', GATES_PHASES, 0)
    await startPhase(page, 'gates', 'tutorial', 1)

    const switchA = page.locator('[data-input="A"] button')
    await switchA.focus()
    await page.keyboard.press('Enter') // liga
    await page.keyboard.press('Enter') // desliga

    await expect(page).toHaveURL(/\/jogo\/gates\/tutorial\/resultado$/, { timeout: 10_000 })
  })
})
