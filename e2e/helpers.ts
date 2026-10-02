import { expect, type Page } from '@playwright/test'

export const PHASES = ['tutorial', 'io-wait', 'time-slice', 'smt-cache'] as const

/** Grava progresso no localStorage: abertura vista e as `n` primeiras fases vencidas. */
export async function seedProgress(page: Page, cleared: number, extra: Record<string, unknown> = {}) {
  await page.goto('/')
  await page.evaluate(
    ({ cleared, extra }) => {
      const ids = ['tutorial', 'io-wait', 'time-slice', 'smt-cache'].slice(0, cleared)
      const phases = Object.fromEntries(
        ids.map((id) => [id, { stars: 2, bestScore: 100, completedAt: '2026-10-01T00:00:00Z' }]),
      )
      localStorage.setItem(
        'scalonater:progress',
        JSON.stringify({ version: 1, games: { cores: { openingSeen: true, phases } }, cards: [], unseenCards: [] }),
      )
      localStorage.setItem('scalonater:settings', JSON.stringify({ version: 1, muted: true, ...extra }))
    },
    { cleared, extra },
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
    for (const el of document.querySelectorAll<HTMLElement>('button, a[href], [role="switch"], [role="radio"]')) {
      if (el.closest('dialog:not([open])')) continue
      const r = el.getBoundingClientRect()
      const style = getComputedStyle(el)
      if (r.width === 0 || r.height === 0 || style.visibility === 'hidden') continue
      if (el.classList.contains('sr-only')) continue
      if (r.width < 43.5 || r.height < 43.5)
        out.push(`${el.tagName} "${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 40)}" ${Math.round(r.width)}×${Math.round(r.height)}`)
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

/** Abre uma fase com velocidade acelerada e fecha o cartão de abertura. */
export async function startPhase(page: Page, phase: string, speed = 8) {
  await page.goto(`/jogo/cores/${phase}?speed=${speed}`)
  await page.getByRole('dialog').getByRole('button', { name: /^jogar/i }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
}

/** Toca em espaços livres até a fase acabar (vitória ou derrota). */
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
