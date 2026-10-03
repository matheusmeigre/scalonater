import { expect, test, type Page } from '@playwright/test'
import {
  expectInsideViewportWidth,
  expectNoHorizontalScroll,
  expectTouchTargets,
  seedProgress,
  startPhase,
} from './helpers'

/** Ids das fases de Bits, na ordem da trilha do jogo (ver `src/games/bits/phases.ts`). */
export const BITS_PHASES = ['tutorial', 'nivel-1', 'nivel-2', 'nivel-3', 'nivel-4', 'nivel-5'] as const

/**
 * Espera as fontes (self-hosted, `font-display: swap`) terminarem de
 * carregar. Sem isso, a troca da fonte reflui o texto bem na hora em que o
 * Playwright calcula a posição de um clique, e o botão "Jogar" (ou um
 * interruptor) pode ficar instável em telas estreitas — mais visível na
 * fase de imagem, cujo cartão de abertura ocupa quase toda a altura da tela.
 */
async function fontsReady(page: Page) {
  await page.evaluate(() => document.fonts.ready)
}

/** Quantos alvos cada fase pede na dificuldade normal (`targetCount`, sem ajuste). */
const TARGETS: Record<string, number> = {
  tutorial: 2,
  'nivel-1': 6,
  'nivel-2': 6,
  'nivel-3': 5,
  'nivel-4': 4,
  'nivel-5': 3,
}

/**
 * Lê os bits-alvo da fase atual na própria tela: o número-alvo (`.bits-target-value`,
 * "Alvo: N") convertido para bits, a linha da tabela de código (fase de letras,
 * que já mostra o binário) ou os pixels do desenho-alvo (fase de imagem). Não
 * depende de nenhuma função interna do app — só do que já está na tela.
 */
async function getTargetBits(page: Page): Promise<number[]> {
  const imageCount = await page.locator('.bits-target .bits-pixel').count()
  if (imageCount > 0) {
    return page
      .locator('.bits-target .bits-pixel')
      .evaluateAll((els) => els.map((el) => (el.classList.contains('bits-pixel--on') ? 1 : 0)))
  }

  const alphabetCount = await page.locator('.bits-alphabet').count()
  if (alphabetCount > 0) {
    const label = await page.locator('.bits-target-value').innerText()
    const letter = label.replace(/^.*:\s*/, '').trim()
    // A tabela vive dentro de um <details> fechado por padrão: `innerText`
    // respeita a renderização (ficaria vazio); `textContent` não.
    const rows = await page
      .locator('.bits-alphabet li')
      .evaluateAll((els) => els.map((el) => el.textContent ?? ''))
    const row = rows.find((r) => r.trim().startsWith(`${letter} =`))
    if (!row) throw new Error(`letra-alvo "${letter}" não encontrada na tabela`)
    return row
      .split('=')[1]!
      .trim()
      .replace(/\s+/g, '')
      .split('')
      .map(Number)
  }

  const label = await page.locator('.bits-target-value').innerText()
  const value = Number(label.replace(/[^\d]/g, ''))
  const bitCount = await page.locator('.bits-field [data-bit]').count()
  const bits: number[] = []
  let v = value
  for (let i = bitCount - 1; i >= 0; i--) {
    bits[i] = v % 2
    v = Math.floor(v / 2)
  }
  return bits
}

async function getCurrentBits(page: Page): Promise<number[]> {
  return page
    .locator('.bits-field [data-bit] button[role="switch"]')
    .evaluateAll((els) => els.map((el) => (el.getAttribute('aria-checked') === 'true' ? 1 : 0)))
}

/**
 * Alterna um interruptor pelo foco + Enter, não por clique de mouse: o
 * interruptor-alvo é o mesmo em qualquer caso (`BitSwitch` é um `<button>`
 * nativo), mas o foco não depende de geometria de tela nem de qual elemento
 * está "por cima" num certo pixel — fica imune a qualquer instabilidade
 * visual passageira (reflow de fonte, grade de 64 células sob carga pesada
 * de CPU com vários navegadores em paralelo). Também serve de prova extra
 * de que o caminho só por teclado funciona nesta fase.
 */
async function clickBit(page: Page, index: number) {
  const switchLocator = page.locator(`.bits-field [data-bit="${index}"] button[role="switch"]`)
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await switchLocator.focus({ timeout: 8_000 })
      await page.keyboard.press('Enter')
      return
    } catch (err) {
      if (attempt === 2) throw err
      await page.waitForTimeout(150)
    }
  }
}

/** Ajusta a fileira para bater com o alvo atual: toca só nos interruptores que precisam mudar. */
async function matchCurrentTarget(page: Page) {
  const target = await getTargetBits(page)
  const current = await getCurrentBits(page)
  for (let i = 0; i < target.length; i++) {
    if (current[i] !== target[i]) await clickBit(page, i)
  }
}

/** Forma `targets` alvos seguidos, só tocando, até a fase terminar (vitória). */
async function winPhase(page: Page, targets: number) {
  for (let i = 0; i < targets; i++) {
    await matchCurrentTarget(page)
    // 80ms era curto demais sob carga (suíte inteira em paralelo): a leitura
    // do próximo alvo chegava a pegar o estado antigo antes do re-render,
    // fazendo o último toque da fase sumir e o teste nunca ver `/resultado`
    // (observado de forma intermitente, em projetos diferentes a cada run).
    await page.waitForTimeout(150)
  }
  await expect(page).toHaveURL(/resultado$/, { timeout: 15_000 })
}

test.describe('jornada de Bits', () => {
  // A estação entra com `meta.released: false` (convenção da "definição de
  // pronto", docs/PLANEJAMENTO.md seção 5): em produção ela aparece "em
  // construção" até o dono do projeto liberar. Para revisar a jornada
  // completa antes do merge, builde com `VITE_SHOW_UNRELEASED=1` (o
  // mecanismo já previsto em `games/registry.ts`/DECISIONS.md). Sem essa
  // variável, estes testes pulam (em vez de falhar) para não quebrar o
  // `npm run test:e2e` padrão.
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    const status = await page.locator('[data-station="bits"]').getAttribute('data-status')
    test.skip(
      status !== 'available',
      'Bits não está liberado nesta build (meta.released=false). Rode ' +
        'VITE_SHOW_UNRELEASED=1 PORT=4301 npm run test:e2e para validar a jornada completa.',
    )
  })

  test('abertura do Kernel → tutorial → resultado com card → progresso salvo', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.clear()
      localStorage.setItem('scalonater:settings', JSON.stringify({ version: 1, muted: true }))
    })
    await page.goto('/')
    await page.locator('[data-station="bits"]').click()
    await expect(page).toHaveURL(/\/jogo\/bits$/)

    // abertura: até 3 falas
    await page.getByRole('button', { name: 'Próximo' }).click()
    await page.getByRole('button', { name: 'Próximo' }).click()
    await page.getByRole('button', { name: 'Vamos lá!' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Bits' })).toBeVisible()
    await expectNoHorizontalScroll(page)
    await expectTouchTargets(page)

    // tutorial: sem derrota, só tocando (liga e depois desliga)
    await startPhase(page, 'bits', 'tutorial')
    await fontsReady(page)
    await expectNoHorizontalScroll(page)
    await expectInsideViewportWidth(page, '[data-game-active]')
    await expectTouchTargets(page)
    await winPhase(page, TARGETS.tutorial!)

    await expect(page).toHaveURL(/\/jogo\/bits\/tutorial\/resultado$/)
    await expect(page.getByRole('heading', { name: 'Fase concluída!' })).toBeVisible()
    await expectNoHorizontalScroll(page)
    await expectTouchTargets(page)

    // progresso persiste depois de recarregar
    await page.goto('/jogo/bits')
    await page.reload()
    await expect(page.getByRole('link', { name: /Jogar/ }).first()).toBeVisible()

    // fase 2 libera o card "Bit e byte": marca tutorial + nível 1 como vencidos.
    // Sem relógio (`untimed`) para o teste não correr contra o tempo real do
    // navegador ao resolver 6 alvos de 8 bits clicando um a um.
    await seedProgress(page, 'bits', BITS_PHASES, 2, { untimed: true })
    await startPhase(page, 'bits', 'nivel-2', 8)
    await fontsReady(page)
    await winPhase(page, TARGETS['nivel-2']!)
    await expect(page.getByText('Card novo no Manual')).toBeVisible()
    await page.getByRole('button', { name: 'Ver card' }).click()
    await expect(page.getByRole('dialog').getByRole('heading', { name: 'Bit e byte' })).toBeVisible()
    await page.getByRole('dialog').getByRole('button', { name: 'Fechar' }).click()

    // Manual mostra o card ganho
    await page.goto('/manual')
    await expect(page.getByRole('heading', { name: 'Bit e byte' })).toBeVisible()
  })

  test('fase com valor das casas cabe na tela e pausa', async ({ page }) => {
    await seedProgress(page, 'bits', BITS_PHASES, 1)
    await startPhase(page, 'bits', 'nivel-1', 4)
    await fontsReady(page)
    await expectNoHorizontalScroll(page)
    await expectInsideViewportWidth(page, '[data-game-active]')
    await expectTouchTargets(page)

    await page.getByRole('button', { name: 'Pausar' }).first().click()
    await expect(page.getByRole('heading', { name: 'Pausado' })).toBeVisible()
    await page.getByRole('button', { name: 'Continuar' }).click()
    await expect(page.getByRole('heading', { name: 'Pausado' })).toBeHidden()
  })

  test('fase "sem cola" (sem valor das casas) e fase de letras não cortam nada', async ({ page }) => {
    await seedProgress(page, 'bits', BITS_PHASES, 4, { untimed: true })
    await startPhase(page, 'bits', 'nivel-4', 8)
    await fontsReady(page)
    await expectNoHorizontalScroll(page)
    await expectInsideViewportWidth(page, '[data-game-active]')
    await expectTouchTargets(page)
    await winPhase(page, TARGETS['nivel-4']!)
    await expect(page).toHaveURL(/resultado$/)
  })

  test('fase de imagem (grade 8x8) reproduz o desenho e cabe na tela', async ({ page }) => {
    // Sem relógio: resolver 3 desenhos de 64 bits clicando um a um não cabe
    // no tempo real do navegador se a fase estiver cronometrada.
    await seedProgress(page, 'bits', BITS_PHASES, 5, { untimed: true })
    await startPhase(page, 'bits', 'nivel-5', 4)
    await fontsReady(page)
    await expect(page.locator('.bits-field [data-bit]')).toHaveCount(64)
    await expectNoHorizontalScroll(page)
    await expectInsideViewportWidth(page, '[data-game-active]')
    await expectTouchTargets(page)
    await winPhase(page, TARGETS['nivel-5']!)
    await expect(page).toHaveURL(/resultado$/)
  })

  test('perder mostra dica e permite tentar sem tempo', async ({ page }) => {
    await seedProgress(page, 'bits', BITS_PHASES, 1)
    await startPhase(page, 'bits', 'nivel-1', 20)
    // não joga: o tempo acaba
    await expect(page.getByRole('heading', { name: 'Tempo esgotado' })).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByText('Dica do Kernel')).toBeVisible()
    await page.getByRole('button', { name: 'Jogar sem tempo' }).click()
    await expect(page.getByText('Livre', { exact: true }).first()).toBeVisible()
  })
})

test.describe('Bits pelo teclado', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    const status = await page.locator('[data-station="bits"]').getAttribute('data-status')
    test.skip(status !== 'available', 'Bits não está liberado nesta build (meta.released=false).')
  })

  test('dá para jogar só com o teclado: Tab, Enter e as setas', async ({ page }) => {
    await seedProgress(page, 'bits', BITS_PHASES, 1)
    await startPhase(page, 'bits', 'nivel-1', 4)
    await fontsReady(page)

    const first = page.locator('.bits-field [data-bit="0"] button[role="switch"]')
    await first.focus()
    await expect(first).toHaveAttribute('aria-checked', 'false')
    await page.keyboard.press('Enter')
    await expect(first).toHaveAttribute('aria-checked', 'true')

    // Espaço também alterna.
    await page.keyboard.press('Space')
    await expect(first).toHaveAttribute('aria-checked', 'false')

    // Setas movem o foco sem alternar o estado.
    await page.keyboard.press('ArrowRight')
    const second = page.locator('.bits-field [data-bit="1"] button[role="switch"]')
    await expect(second).toBeFocused()
    await expect(second).toHaveAttribute('aria-checked', 'false')

    await page.keyboard.press('ArrowLeft')
    await expect(first).toBeFocused()

    // Joga a fase inteira só com Tab/Enter, resolvendo pelo texto do alvo.
    await winPhase(page, TARGETS['nivel-1']!)
    await expect(page).toHaveURL(/resultado$/)
  })
})
