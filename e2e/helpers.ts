import { expect, type Page } from '@playwright/test'

declare global {
  interface Window {
    __SCALONATER_GAMES__?: { id: string; phases: string[] }[]
  }
}

/** Ids das fases do Núcleos, na ordem da trilha do jogo. */
export const CORES_PHASES = ['tutorial', 'io-wait', 'time-slice', 'smt-cache'] as const

/**
 * Grava progresso no localStorage: abertura vista e as `cleared` primeiras
 * fases (de `phaseIds`, na ordem) vencidas. Genérico para qualquer jogo
 * registrado — passe o id do jogo e a lista de ids das fases dele.
 */
export async function seedProgress(
  page: Page,
  gameId: string,
  phaseIds: readonly string[],
  cleared: number,
  extra: Record<string, unknown> = {},
) {
  await page.goto('/')
  await page.evaluate(
    ({ gameId, phaseIds, cleared, extra }) => {
      const ids = phaseIds.slice(0, cleared)
      const phases = Object.fromEntries(
        ids.map((id) => [id, { stars: 2, bestScore: 100, completedAt: '2026-10-01T00:00:00Z' }]),
      )
      localStorage.setItem(
        'scalonater:progress',
        JSON.stringify({
          version: 1,
          games: { [gameId]: { openingSeen: true, phases } },
          cards: [],
          unseenCards: [],
        }),
      )
      localStorage.setItem(
        'scalonater:settings',
        JSON.stringify({ version: 1, muted: true, ...extra }),
      )
    },
    { gameId, phaseIds, cleared, extra },
  )
}

/** Sem rolagem horizontal: nada passa da largura da tela. */
export async function expectNoHorizontalScroll(page: Page) {
  const { scroll, inner } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    inner: window.innerWidth,
  }))
  expect(scroll, 'rolagem horizontal').toBeLessThanOrEqual(inner)
}

/** Todo botão/link visível tem pelo menos 44×44px de área de toque. */
export async function expectTouchTargets(page: Page) {
  const small = await page.evaluate(() => {
    const out: string[] = []
    for (const el of document.querySelectorAll<HTMLElement>(
      'button, a[href], [role="switch"], [role="radio"]',
    )) {
      if (el.closest('dialog:not([open])')) continue
      const r = el.getBoundingClientRect()
      const style = getComputedStyle(el)
      if (r.width === 0 || r.height === 0 || style.visibility === 'hidden') continue
      if (el.classList.contains('sr-only')) continue
      if (r.width < 43.5 || r.height < 43.5)
        out.push(
          `${el.tagName} "${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 40)}" ${Math.round(r.width)}×${Math.round(r.height)}`,
        )
    }
    return out
  })
  expect(small, 'alvos de toque menores que 44px').toEqual([])
}

/** Elementos importantes da partida estão inteiros dentro da largura da tela. */
export async function expectInsideViewportWidth(page: Page, selector: string) {
  const out = await page.evaluate((sel) => {
    const w = window.innerWidth
    return [...document.querySelectorAll<HTMLElement>(sel)]
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.left < -0.5 || r.right > w + 0.5)
      .map((r) => `${Math.round(r.left)}..${Math.round(r.right)}`)
  }, selector)
  expect(out, `${selector} cortado na lateral`).toEqual([])
}

/** Abre uma fase de um jogo com velocidade acelerada e fecha o cartão de abertura. */
export async function startPhase(page: Page, gameId: string, phase: string, speed = 8) {
  await page.goto(`/jogo/${gameId}/${phase}?speed=${speed}`)
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /^jogar/i })
    .click()
  await expect(page.getByRole('dialog')).toBeHidden()
}

/** Toca em espaços livres até a fase acabar (vitória ou derrota). Específico do Núcleos. */
export async function playByTapping(page: Page, until: RegExp, maxMs = 60_000) {
  const end = Date.now() + maxMs
  while (Date.now() < end) {
    if (until.test(page.url())) return
    if (await page.getByRole('dialog').isVisible()) return
    const free = page.locator('[data-slot][data-filled="false"]:not([disabled])').first()
    if (await free.count()) await free.click({ timeout: 2000 }).catch(() => undefined)
    await page.waitForTimeout(150)
  }
}

/**
 * Descobre, a partir da própria página carregada, os jogos e fases visíveis
 * nesta build (ver `window.__SCALONATER_GAMES__` em `games/registry.ts`).
 * Usado por `e2e/layout.spec.ts` para testar "cada fase de cada jogo
 * registrado" sem listar nada à mão.
 */
export async function discoverGames(page: Page): Promise<{ id: string; phases: string[] }[]> {
  await page.goto('/')
  return page.evaluate(() => window.__SCALONATER_GAMES__ ?? [])
}
