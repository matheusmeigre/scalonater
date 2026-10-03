import { expect, test, type Page } from '@playwright/test'
import { expectInsideViewportWidth, expectNoHorizontalScroll, expectTouchTargets, seedProgress, startPhase } from './helpers'

/**
 * Ids das fases de Cache, na ordem da trilha do jogo (ver
 * `src/games/cache/phases.ts`). Esta estação está com `meta.released: true`
 * (DECISIONS.md), então ela aparece normalmente numa build de produção —
 * sem precisar de `VITE_SHOW_UNRELEASED`.
 */
export const CACHE_PHASES = [
  'tutorial',
  'bancada-cheia',
  'volta-a-pedir',
  'vizinhos-de-linha',
  'dois-niveis',
] as const

/** Ids das fases das estações anteriores a Cache na trilha, todas já
 * implementadas nesta build (Bits, Portas lógicas, ULA, Memória e Ciclo da
 * CPU — `engine/phases/progression.ts`). */
const BITS_PHASES = ['tutorial', 'nivel-1', 'nivel-2', 'nivel-3', 'nivel-4', 'nivel-5'] as const
const GATES_PHASES = ['tutorial', 'nivel-1', 'nivel-2', 'nivel-3', 'nivel-4'] as const
const ALU_PHASES = ['tutorial', 'nivel-1', 'nivel-2', 'nivel-3', 'nivel-4'] as const
const MEMORY_PHASES = ['tutorial', 'nivel-1', 'nivel-2', 'nivel-3', 'nivel-4'] as const
const CYCLE_PHASES = ['tutorial', 'nivel-1', 'nivel-2', 'nivel-3', 'nivel-4'] as const

/**
 * `seedProgress` (helpers.ts) grava o progresso de só um jogo por vez
 * (substitui `scalonater:progress` inteiro). Cache depende de todas as
 * estações anteriores concluídas ("linear, com exceção"), então esta
 * estação grava todas de uma vez, igual ao `seedProgress` genérico faria se
 * aceitasse mais de um jogo.
 */
async function seedCachePrereqs(page: Page) {
  await page.goto('/')
  await page.evaluate(
    ({ bitsPhases, gatesPhases, aluPhases, memoryPhases, cyclePhases }) => {
      const clearedOf = (ids: readonly string[]) =>
        Object.fromEntries(
          ids.map((id) => [id, { stars: 2, bestScore: 100, completedAt: '2026-10-01T00:00:00Z' }]),
        )
      localStorage.setItem(
        'scalonater:progress',
        JSON.stringify({
          version: 1,
          games: {
            bits: { openingSeen: true, phases: clearedOf(bitsPhases) },
            gates: { openingSeen: true, phases: clearedOf(gatesPhases) },
            alu: { openingSeen: true, phases: clearedOf(aluPhases) },
            memory: { openingSeen: true, phases: clearedOf(memoryPhases) },
            cycle: { openingSeen: true, phases: clearedOf(cyclePhases) },
          },
          cards: [],
          unseenCards: [],
        }),
      )
      localStorage.setItem('scalonater:settings', JSON.stringify({ version: 1, muted: true }))
    },
    {
      bitsPhases: BITS_PHASES,
      gatesPhases: GATES_PHASES,
      aluPhases: ALU_PHASES,
      memoryPhases: MEMORY_PHASES,
      cyclePhases: CYCLE_PHASES,
    },
  )
}

/**
 * Toca no espaço do cache que deve sair sempre que o jogo pedir (a única
 * ação manual desta estação). Fica em loop até a fase terminar (vitória,
 * derrota ou card de abertura) ou o tempo máximo passar.
 */
async function playUntilDone(page: Page, until: RegExp, maxMs = 60_000) {
  const end = Date.now() + maxMs
  while (Date.now() < end) {
    if (until.test(page.url())) return
    if (await page.getByRole('dialog').isVisible()) return
    const evictable = page.locator('.cache-slot.is-evictable').first()
    if (await evictable.count()) await evictable.click({ timeout: 2000 }).catch(() => undefined)
    await page.waitForTimeout(150)
  }
}

test.describe('jornada do Cache', () => {
  test('abertura do Kernel → tutorial → vitória na Fase 1 com card → progresso salvo', async ({
    page,
  }) => {
    await seedCachePrereqs(page)
    await page.goto('/jogo/cache')
    await expect(page).toHaveURL(/\/jogo\/cache$/)

    // abertura: até 3 falas
    await page.getByRole('button', { name: 'Próximo' }).click()
    await page.getByRole('button', { name: 'Próximo' }).click()
    await page.getByRole('button', { name: 'Vamos lá!' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Cache' })).toBeVisible()
    await expectNoHorizontalScroll(page)
    await expectTouchTargets(page)

    // tutorial: 1ª falha guiada + 2º pedido (mesmo endereço) é acerto guiado,
    // sem nenhuma ação manual (o cache de 2 espaços nunca enche com 2 pedidos)
    await startPhase(page, 'cache', 'tutorial')
    await page.waitForLoadState('networkidle')
    await expectNoHorizontalScroll(page)
    await expectInsideViewportWidth(page, '[data-game-active]')
    await expectTouchTargets(page)

    await expect(page).toHaveURL(/\/jogo\/cache\/tutorial\/resultado$/, { timeout: 20_000 })
    await expect(page.getByRole('heading', { name: 'Fase concluída!' })).toBeVisible()

    // Fase 1: a bancada cheia — toca em quem sai sempre que o jogo pedir.
    // `startPhase` (em vez do botão "Próxima fase") deixa a cadência mais
    // rápida (?speed=8), para o teste não esperar o ritmo real da CPU.
    await startPhase(page, 'cache', 'bancada-cheia')
    await expectNoHorizontalScroll(page)
    await expectTouchTargets(page)

    await playUntilDone(page, /\/jogo\/cache\/bancada-cheia\/resultado$/)
    await expect(page).toHaveURL(/\/jogo\/cache\/bancada-cheia\/resultado$/, { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: 'Fase concluída!' })).toBeVisible()
    await expect(page.getByText('Card novo no Manual')).toBeVisible()
    // ResultScreen.tsx (base) agora tem `min-w-0`/`wrap-anywhere` no painel
    // "Próxima fase" — ver DECISIONS.md, Etapa 6, "Pedidos à base" (corrigido).
    await expectNoHorizontalScroll(page)
    await expectTouchTargets(page)

    // card de conceito abre no modal
    await page.getByRole('button', { name: 'Ver card' }).click()
    await expect(
      page.getByRole('dialog').getByRole('heading', { name: 'A bancada perto da CPU' }),
    ).toBeVisible()
    await page.getByRole('dialog').getByRole('button', { name: 'Fechar' }).click()

    // progresso persiste depois de recarregar
    await page.goto('/jogo/cache')
    await page.reload()
    await expect(page.getByRole('link', { name: /Jogar: Ele volta a pedir/ })).toBeVisible()

    // Manual mostra o card ganho
    await page.goto('/manual')
    await expect(page.getByRole('heading', { name: 'A bancada perto da CPU' })).toBeVisible()
  })

  test('tempo médio de acesso alto demais derrota a fase', async ({ page }) => {
    // Fase dos dois níveis (L1 bem pequeno, limite de tempo médio bem
    // apertado): tocar sempre no primeiro espaço evictável, sem nenhuma
    // estratégia, deixa o tempo médio alto o bastante para perder mesmo com
    // a aleatoriedade da partida (ver DECISIONS.md).
    await seedProgress(page, 'cache', CACHE_PHASES, 4)
    await startPhase(page, 'cache', 'dois-niveis', 8)
    await expectNoHorizontalScroll(page)
    await expectTouchTargets(page)

    await playUntilDone(page, /\/jogo\/cache\/dois-niveis\/resultado$/, 90_000)
    await expect(page.getByRole('heading', { name: 'Tempo médio alto demais' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText('Dica do Kernel')).toBeVisible()
  })
})

test.describe('teclado', () => {
  test('dá para escolher quem sai só com o teclado', async ({ page }) => {
    // precisa do tutorial concluído: fases de nível ficam trancadas até lá
    // dentro do próprio jogo, independente das estações anteriores.
    await seedProgress(page, 'cache', CACHE_PHASES, 1)
    await startPhase(page, 'cache', 'bancada-cheia', 8)

    // espera a primeira exigência de eviction aparecer e resolve pelo teclado
    await expect(page.locator('.cache-slot.is-evictable').first()).toBeVisible({
      timeout: 30_000,
    })
    await page.locator('.cache-slot.is-evictable').first().focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('.cache-slot.is-evictable')).toHaveCount(0)
  })
})
