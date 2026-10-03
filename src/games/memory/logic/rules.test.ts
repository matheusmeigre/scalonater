import { describe, expect, it } from 'vitest'
import { PHASES } from '../phases'
import { resolveConfig } from './model'
import { applyPowerLoss, createGame, enqueueRequest, selectRequest, tapDrawer, tick } from './rules'
import { computeOutcome } from './outcome'

const phase1 = PHASES.find((p) => p.id === 'nivel-1')!
const phase3 = PHASES.find((p) => p.id === 'nivel-3')!
const phase4 = PHASES.find((p) => p.id === 'nivel-4')!
const tutorialPhase = PHASES[0]!

function configFor(phase = phase1, untimed = false) {
  return resolveConfig(phase, { untimed })
}

describe('createGame / enqueueRequest', () => {
  it('é determinístico com a mesma semente', () => {
    const a = createGame(phase1, configFor(), 7)
    const b = createGame(phase1, configFor(), 7)
    expect(a.request).toEqual(b.request)
    // mesma sequência de pedidos ao longo de várias rodadas
    let ga = a
    let gb = b
    for (let i = 0; i < 4 && ga.request; i++) {
      ga = tapDrawerFlow(ga)
      gb = tapDrawerFlow(gb)
      expect(ga.request).toEqual(gb.request)
    }
  })

  it('sementes diferentes podem gerar pedidos diferentes', () => {
    const a = createGame(phase1, configFor(), 1)
    const b = createGame(phase1, configFor(), 2)
    // não é garantido que sejam diferentes em todo caso, mas com várias
    // rodadas a sequência completa não deveria ser idêntica
    let ga = a
    let gb = b
    const seqA: string[] = []
    const seqB: string[] = []
    for (let i = 0; i < 6 && ga.request && gb.request; i++) {
      seqA.push(JSON.stringify(ga.request))
      seqB.push(JSON.stringify(gb.request))
      ga = tapDrawerFlow(ga)
      gb = tapDrawerFlow(gb)
    }
    expect(seqA).not.toEqual(seqB)
  })

  it('tutorial segue o roteiro fixo: guardar e depois ler', () => {
    const g = createGame(tutorialPhase, configFor(tutorialPhase), 1)
    expect(g.request).toEqual({
      id: 1,
      kind: 'write',
      address: 2,
      value: 7,
      overwrite: false,
      secondsLeft: 0,
      totalSeconds: 0,
    })
  })
})

/** Completa o pedido atual corretamente (seleciona se for escrita, depois toca a gaveta certa). */
function tapDrawerFlow(state: ReturnType<typeof createGame>) {
  if (!state.request) return state
  const selected = state.request.kind === 'write' ? selectRequest(state) : state
  return tapDrawer(selected, selected.request!.address)
}

describe('selectRequest + tapDrawer', () => {
  it('acerto de GUARDAR grava o valor e pontua', () => {
    const g0 = createGame(phase1, configFor(), 3)
    const req = g0.request!
    expect(req.kind === 'write' || req.kind === 'read').toBe(true)
    const next = tapDrawerFlow(g0)
    expect(next.requestsDone).toBe(1)
    expect(next.scoring.score).toBeGreaterThan(0)
    if (req.kind === 'write') {
      expect(next.memory.cells[req.address]!.value).toBe(req.value)
    }
  })

  it('toque na gaveta errada soma 1 a mistakes e quebra o combo', () => {
    const g0 = createGame(phase1, configFor(), 3)
    const req = g0.request!
    const armed = req.kind === 'write' ? selectRequest(g0) : g0
    const wrong = (req.address + 1) % configFor().shelfSize
    const next = tapDrawer(armed, wrong)
    expect(next.mistakes).toBe(1)
    expect(next.scoring.combo).toBe(0)
    expect(next.request).toEqual(req) // o pedido continua ativo
  })

  it('tocar a gaveta de uma escrita sem selecionar a ficha é erro', () => {
    let g = createGame(phase1, configFor(), 11)
    while (g.request!.kind !== 'write') g = tapDrawerFlow(g)
    const next = tapDrawer(g, g.request!.address)
    expect(next.mistakes).toBe(1)
  })

  it('mistakes >= maxMistakes perde a fase (fora do tutorial)', () => {
    let g = createGame(phase1, configFor(), 5)
    const wrongAddr = (addr: number) => (addr + 1) % configFor().shelfSize
    for (let i = 0; i < phase1.maxMistakes && g.status === 'playing'; i++) {
      const req = g.request!
      const armed = req.kind === 'write' ? selectRequest(g) : g
      g = tapDrawer(armed, wrongAddr(req.address))
    }
    expect(g.status).toBe('lost')
  })

  it('requestsDone >= requestsGoal vence a fase', () => {
    let g = createGame(phase1, configFor(), 9)
    let guard = 0
    while (g.status === 'playing' && guard < 50) {
      g = tapDrawerFlow(g)
      guard++
    }
    expect(g.status).toBe('won')
    expect(g.requestsDone).toBe(phase1.requestsGoal)
  })

  it('o tutorial nunca perde, mesmo com toques errados', () => {
    let g = createGame(tutorialPhase, configFor(tutorialPhase), 1)
    g = tapDrawer(g, 0) // errado e sem selecionar: só soma mistake, não perde
    expect(g.status).toBe('playing')
  })
})

describe('tick (expiração)', () => {
  it('ficha expirada conta como erro e gera outro pedido', () => {
    const g0 = createGame(phase1, configFor(), 2)
    const total = g0.request!.totalSeconds
    const g1 = tick(g0, total + 1)
    expect(g1.mistakes).toBe(1)
    expect(g1.request).not.toBeNull()
  })

  it('no modo sem tempo, a ficha nunca expira', () => {
    const cfg = configFor(phase1, true)
    const g0 = createGame(phase1, cfg, 2)
    const g1 = tick(g0, 999)
    expect(g1.mistakes).toBe(0)
    expect(g1.request).toEqual(g0.request)
  })
})

describe('applyPowerLoss', () => {
  it('zera toda gaveta ocupada', () => {
    let g = createGame(phase3, configFor(phase3), 4)
    for (let i = 0; i < 3 && g.status === 'playing'; i++) g = tapDrawerFlow(g)
    const erased = applyPowerLoss(g)
    expect(erased.memory.cells.every((c) => c.value === null)).toBe(true)
    expect(erased.powerLossesDone).toBe(g.powerLossesDone + 1)
  })

  it('a fase 4 aplica a queda de energia sozinha nos índices configurados', () => {
    let g = createGame(phase4, configFor(phase4), 6)
    let guard = 0
    while (g.status === 'playing' && g.requestsDone < 4 && guard < 30) {
      g = tapDrawerFlow(g)
      guard++
    }
    expect(g.powerLossesDone).toBeGreaterThanOrEqual(1)
  })
})

describe('computeOutcome', () => {
  it('derrota nunca dá estrela', () => {
    let g = createGame(phase1, configFor(), 5)
    const wrongAddr = (addr: number) => (addr + 1) % configFor().shelfSize
    for (let i = 0; i < phase1.maxMistakes && g.status === 'playing'; i++) {
      const req = g.request!
      const armed = req.kind === 'write' ? selectRequest(g) : g
      g = tapDrawer(armed, wrongAddr(req.address))
    }
    const o = computeOutcome(g)
    expect(o.won).toBe(false)
    expect(o.stars).toBe(0)
  })

  it('vitória dá de 1 a 3 estrelas, nunca 0', () => {
    let g = createGame(phase1, configFor(), 9)
    let guard = 0
    while (g.status === 'playing' && guard < 50) {
      g = tapDrawerFlow(g)
      guard++
    }
    const o = computeOutcome(g)
    expect(o.won).toBe(true)
    expect(o.stars).toBeGreaterThanOrEqual(1)
    expect(o.stars).toBeLessThanOrEqual(3)
  })

  it('métrica mistakesLeft: vencer sem erro nenhum dá 3 estrelas', () => {
    let g = createGame(phase3, configFor(phase3), 9)
    let guard = 0
    while (g.status === 'playing' && guard < 50) {
      g = tapDrawerFlow(g)
      guard++
    }
    expect(g.mistakes).toBe(0)
    const o = computeOutcome(g)
    expect(o.won).toBe(true)
    expect(o.stars).toBe(3)
  })
})

describe('enqueueRequest', () => {
  it('não gera novo pedido depois que a meta já foi atingida', () => {
    let g = createGame(phase1, configFor(), 9)
    let guard = 0
    while (g.status === 'playing' && guard < 50) {
      g = tapDrawerFlow(g)
      guard++
    }
    const again = enqueueRequest(g)
    expect(again.request).toBeNull()
  })
})
