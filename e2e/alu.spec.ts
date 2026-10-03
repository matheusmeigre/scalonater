import { expect, test, type Page } from '@playwright/test'
import { startPhase } from './helpers'

/** Ids das fases da ULA, na ordem da trilha do jogo. */
export const ALU_PHASES = ['tutorial', 'nivel-1', 'nivel-2', 'nivel-3', 'nivel-4'] as const

/** Ids das fases de Bits e de Portas lógicas (pré-requisitos da trilha: "linear, com
 *  exceção" — DECISIONS.md). Ambos já liberados em produção. `seedProgress` de
 *  `e2e/helpers.ts` grava um único jogo por chamada (sobrescrevendo a anterior),
 *  então os dois pré-requisitos (e opcionalmente o progresso da própria ULA)
 *  precisam ser escritos juntos numa única chamada — mesmo padrão de
 *  `e2e/cycle.spec.ts` (`seedPrerequisites`). */
const BITS_PHASES = ['tutorial', 'nivel-1', 'nivel-2', 'nivel-3', 'nivel-4', 'nivel-5']
const GATES_PHASES = ['tutorial', 'nivel-1', 'nivel-2', 'nivel-3', 'nivel-4']

async function seedPrerequisites(page: Page, aluCleared: readonly string[] = []) {
  await page.goto('/')
  await page.evaluate(
    ({ aluCleared, aluPhases, bitsPhases, gatesPhases }) => {
      const complete = (ids: readonly string[]) =>
        Object.fromEntries(
          ids.map((id) => [id, { stars: 2, bestScore: 100, completedAt: '2026-10-01T00:00:00Z' }]),
        )
      localStorage.setItem(
        'scalonater:progress',
        JSON.stringify({
          version: 1,
          games: {
            bits: { openingSeen: true, phases: complete(bitsPhases) },
            gates: { openingSeen: true, phases: complete(gatesPhases) },
            ...(aluCleared.length > 0
              ? { alu: { openingSeen: true, phases: complete(aluPhases.slice(0, aluCleared.length)) } }
              : {}),
          },
          cards: [],
          unseenCards: [],
        }),
      )
      localStorage.setItem('scalonater:settings', JSON.stringify({ version: 1, muted: true }))
    },
    { aluCleared, aluPhases: ALU_PHASES, bitsPhases: BITS_PHASES, gatesPhases: GATES_PHASES },
  )
}

/** Reproduz `addManual` (soma binária coluna a coluna) no lado do teste, só
 *  para saber que bits marcar na resposta — a mesma regra testada em
 *  `src/games/alu/logic/rules.test.ts`. */
function addManualBits(a: readonly (0 | 1)[], b: readonly (0 | 1)[]): (0 | 1)[] {
  const n = a.length
  const result: (0 | 1)[] = new Array(n)
  let carry = 0
  for (let i = n - 1; i >= 0; i--) {
    const total = a[i]! + b[i]! + carry
    result[i] = (total % 2) as 0 | 1
    carry = total >= 2 ? 1 : 0
  }
  return result
}

/** Lê os bits (0/1) mostrados numa fileira ("A" ou "B") da conta manual. */
async function readRowBits(page: Page, row: 'a' | 'b'): Promise<(0 | 1)[]> {
  const texts = await page.locator(`[data-row="${row}"] .alu-manual-digit`).allTextContents()
  return texts.map((t) => (t.trim() === '1' ? 1 : 0))
}

/** Marca na resposta os bits que precisam virar 1 (ela sempre começa em 0) e confirma. */
async function answerAndConfirm(page: Page) {
  const a = await readRowBits(page, 'a')
  const b = await readRowBits(page, 'b')
  const sum = addManualBits(a, b)
  for (let i = 0; i < sum.length; i++) {
    if (sum[i] === 1) {
      await page.locator(`[data-answer] [data-bit="${i}"] button`).click()
    }
  }
  await page.locator('[data-confirm-manual]').click()
}

test.describe('jornada da ULA', () => {
  test('abertura do Kernel → tutorial → vitória → card no Manual → progresso salvo', async ({
    page,
  }) => {
    await seedPrerequisites(page)
    // seedPrerequisites grava o localStorage depois do `page.goto('/')` interno:
    // sem recarregar, a store (hidratada na carga) não veria o progresso novo.
    await page.reload()
    await page.locator('[data-station="alu"]').click()
    await expect(page).toHaveURL(/\/jogo\/alu$/)

    // abertura: 3 falas (até o máximo permitido)
    await page.getByRole('button', { name: 'Próximo' }).click()
    await page.getByRole('button', { name: 'Próximo' }).click()
    await page.getByRole('button', { name: 'Vamos lá!' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'A calculadora (ULA)' })).toBeVisible()

    // tutorial: 0+1 e 1+1, guiados (pares fixos, sem sorteio)
    await startPhase(page, 'alu', 'tutorial')
    await page.waitForLoadState('networkidle')
    await answerAndConfirm(page) // 0 + 1 = 01
    await answerAndConfirm(page) // 1 + 1 = 10
    await expect(page).toHaveURL(/\/jogo\/alu\/tutorial\/resultado$/, { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: 'Fase concluída!' })).toBeVisible()

    // Fase 1: 5 somas de 4 bits sorteadas (card "Vai-um (carry)" desbloqueia aqui)
    await page.getByRole('link', { name: 'Próxima fase' }).click()
    await expect(page).toHaveURL(/\/jogo\/alu\/nivel-1$/)
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /^jogar/i })
      .click()
    await expect(page.getByRole('dialog')).toBeHidden()

    for (let i = 0; i < 5; i++) {
      await answerAndConfirm(page)
    }
    await expect(page).toHaveURL(/\/jogo\/alu\/nivel-1\/resultado$/, { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: 'Fase concluída!' })).toBeVisible()
    await expect(page.getByText('Card novo no Manual')).toBeVisible()

    const viewCard = page.getByRole('button', { name: 'Ver card' })
    await expect(viewCard).toBeVisible()
    await page.waitForTimeout(1200)
    await viewCard.focus()
    await page.keyboard.press('Enter')
    await expect(
      page.getByRole('dialog').getByRole('heading', { name: 'Vai-um (carry)' }),
    ).toBeVisible()
    await page.getByRole('dialog').getByRole('button', { name: 'Fechar' }).focus()
    await page.keyboard.press('Enter')

    // progresso persiste depois de recarregar
    await page.goto('/jogo/alu')
    await page.reload()
    await expect(page.getByRole('link', { name: /Jogar: Fase 2/ })).toBeVisible()

    // Manual mostra o card ganho
    await page.goto('/manual')
    await expect(page.getByRole('heading', { name: 'Vai-um (carry)' })).toBeVisible()
  })

  test('deixar o tempo esgotar na Fase 1 derrota e mostra a dica do Kernel', async ({ page }) => {
    await seedPrerequisites(page, ALU_PHASES.slice(0, 1))
    await startPhase(page, 'alu', 'nivel-1', 20)

    await expect(page.getByRole('heading', { name: 'Tempo esgotado' })).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByText('Dica do Kernel', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Tentar de novo' })).toBeVisible()
  })

  test('dá para jogar o tutorial só com o teclado', async ({ page }) => {
    await seedPrerequisites(page)
    await startPhase(page, 'alu', 'tutorial', 1)

    // 0 + 1 = 01: só a casa menos significativa (índice 1) precisa virar 1.
    await page.locator('[data-answer] [data-bit="1"] button').focus()
    await page.keyboard.press('Enter')
    await page.locator('[data-confirm-manual]').focus()
    await page.keyboard.press('Enter')

    // 1 + 1 = 10: só a casa mais significativa (índice 0) precisa virar 1.
    await page.locator('[data-answer] [data-bit="0"] button').focus()
    await page.keyboard.press('Enter')
    await page.locator('[data-confirm-manual]').focus()
    await page.keyboard.press('Enter')

    await expect(page).toHaveURL(/\/jogo\/alu\/tutorial\/resultado$/, { timeout: 10_000 })
  })
})
