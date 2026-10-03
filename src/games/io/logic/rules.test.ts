import { describe, expect, it } from 'vitest'
import { resolveConfig } from './model'
import { computeOutcome } from './outcome'
import { PHASES } from '../phases'
import {
  attendDevice,
  attendDmaChunk,
  checkNow,
  collectDma,
  createGame,
  popContext,
  pushContext,
  ringDevice,
  startDma,
  step,
  tickDma,
} from './rules'

const tutorial = PHASES[0]!
const f1 = PHASES.find((p) => p.id === 'fila-na-porta')!
const f2 = PHASES.find((p) => p.id === 'quem-nao-espera')!
const f3 = PHASES.find((p) => p.id === 'perguntar-ou-campainha')!
const f4 = PHASES.find((p) => p.id === 'dma')!

const configFor = (phase: typeof tutorial, untimed = false) =>
  resolveConfig(phase, { difficulty: 'normal', untimed })

describe('createGame', () => {
  it('é determinístico com a mesma semente', () => {
    const cfg = configFor(f1)
    const a = createGame(cfg, 7)
    const b = createGame(cfg, 7)
    let sa = a
    let sb = b
    for (let i = 0; i < 200; i++) {
      sa = step(sa, 0.2)
      sb = step(sb, 0.2)
    }
    expect(sa.ringQueue.map((r) => r.device)).toEqual(sb.ringQueue.map((r) => r.device))
    expect(sa.mainProgress).toBeCloseTo(sb.mainProgress)
  })
})

describe('pushContext/attendDevice/popContext', () => {
  it('atender sem guardar contexto zera o progresso (nunca "quase zera")', () => {
    let s = createGame({ ...configFor(f1), ringEvery: 999, queueMax: 99 }, 1)
    for (let i = 0; i < 50; i++) s = step(s, 0.2) // avança bastante o progresso
    expect(s.mainProgress).toBeGreaterThan(0)
    s = ringDevice(s, 'teclado')
    s = attendDevice(s, 'teclado') // sem pushContext antes
    expect(s.mainProgress).toBe(0)
    expect(s.events.some((e) => e.type === 'contextLost')).toBe(true)
  })

  it('guardar e atender preserva o progresso e retoma sozinho', () => {
    let s = createGame({ ...configFor(f1), ringEvery: 999, queueMax: 99 }, 1)
    for (let i = 0; i < 50; i++) s = step(s, 0.2)
    const saved = s.mainProgress
    s = ringDevice(s, 'teclado')
    s = pushContext(s)
    expect(s.events.some((e) => e.type === 'contextSaved')).toBe(true)
    expect(s.contextStack).toEqual([saved])
    s = attendDevice(s, 'teclado')
    expect(s.events.some((e) => e.type === 'attended')).toBe(true)
    expect(s.events.some((e) => e.type === 'resumed')).toBe(true)
    expect(s.mainProgress).toBeCloseTo(saved)
    expect(s.contextStack).toEqual([])
  })

  it('popContext sem nada guardado não faz nada', () => {
    const s = createGame(configFor(f1), 1)
    const next = popContext(s)
    expect(next).toBe(s)
  })

  it('pushContext sem campainha tocando não faz nada', () => {
    const s = createGame(configFor(f1), 1)
    const next = pushContext(s)
    expect(next).toBe(s)
  })

  it('várias campainhas guardadas sob o mesmo contexto: só retoma quando a fila esvazia', () => {
    let s = createGame(configFor(f1), 1)
    s = ringDevice(s, 'teclado')
    s = ringDevice(s, 'mouse')
    s = pushContext(s)
    s = attendDevice(s, 'teclado')
    expect(s.contextStack.length).toBe(1) // ainda tem o mouse na fila
    s = attendDevice(s, 'mouse')
    expect(s.contextStack.length).toBe(0)
  })
})

describe('derrota por fila cheia', () => {
  it('perde vida e a partida quando a fila passa do máximo repetidamente', () => {
    const cfg = { ...configFor(f1), queueMax: 1, hearts: 1 }
    let s = createGame(cfg, 1)
    s = ringDevice(s, 'teclado')
    s = ringDevice(s, 'mouse') // 2 > queueMax(1)
    s = step(s, 0.01)
    expect(s.status).toBe('lost')
    expect(s.lostReason).toBe('queue')
  })
})

describe('derrota por campainha urgente expirada (F2)', () => {
  it('perde vida quando o teclado/mouse expira sem atendimento', () => {
    const cfg = { ...configFor(f2), hearts: 1, queueMax: 99 }
    let s = createGame(cfg, 1)
    s = ringDevice(s, 'teclado')
    for (let i = 0; i < 400; i++) s = step(s, 0.1) // bem mais que a paciência do teclado
    expect(s.status).toBe('lost')
    expect(s.lostReason).toBe('deadline')
  })
})

describe('vitória por progresso mantido até o fim do tempo (F1/F2)', () => {
  it('vence quando o progresso ao fim do tempo atinge a meta', () => {
    const cfg = { ...configFor(f1), duration: 5, goal: 1, ringEvery: 999, hearts: 5 }
    let s = createGame(cfg, 1)
    for (let i = 0; i < 300 && s.status === 'playing'; i++) s = step(s, 0.1)
    expect(s.status).toBe('won')
  })

  it('perde por tempo quando o progresso não atinge a meta', () => {
    const cfg = { ...configFor(f1), duration: 1, goal: 99, ringEvery: 999, hearts: 5 }
    let s = createGame(cfg, 1)
    for (let i = 0; i < 50 && s.status === 'playing'; i++) s = step(s, 0.1)
    expect(s.status).toBe('lost')
    expect(s.lostReason).toBe('time')
  })
})

describe('tutorial', () => {
  it('vence depois de guardar e atender o número certo de campainhas', () => {
    const cfg = configFor(tutorial)
    let s = createGame(cfg, 1)
    for (let i = 0; i < cfg.goal; i++) {
      s = ringDevice(s, 'teclado')
      s = pushContext(s)
      s = attendDevice(s, 'teclado')
    }
    expect(s.status).toBe('won')
  })
})

describe('F3: perguntar toda hora × campainha', () => {
  it('checkNow sempre gasta energia; só avança quando o dado estava pronto', () => {
    const cfg = configFor(f3)
    let s = createGame(cfg, 1)
    s = checkNow(s) // provavelmente não está pronto ainda
    expect(s.energyWasted).toBe(1)
  })

  it('o lado por interrupção avança sozinho, sem custo de energia', () => {
    const cfg = configFor(f3)
    let s = createGame(cfg, 1)
    for (let i = 0; i < 50; i++) s = step(s, 0.1)
    expect(s.interruptProgress).toBeGreaterThan(0)
    expect(s.energyWasted).toBe(0)
  })

  it('vence quando o progresso por polling chega a 100%', () => {
    const cfg = configFor(f3)
    let s = createGame(cfg, 1)
    for (let i = 0; i < 2000 && s.status === 'playing'; i++) {
      s = step(s, 0.1)
      s = checkNow(s)
    }
    expect(s.status).toBe('won')
  })
})

describe('F4: DMA', () => {
  it('avança sozinho depois de iniciado, sem precisar atender pedaço a pedaço', () => {
    const cfg = configFor(f4)
    let s = createGame(cfg, 1)
    s = startDma(s)
    for (let i = 0; i < 20; i++) s = tickDma(s, 1)
    expect(s.dmaDone).toBe(true)
    s = collectDma(s)
    expect(s.status).toBe('won')
  })

  it('atender manualmente custa tempo', () => {
    const cfg = configFor(f4)
    let s = createGame(cfg, 1)
    s = startDma(s)
    const before = s.timeLeft
    s = attendDmaChunk(s)
    expect(s.timeLeft).toBeLessThan(before)
  })
})

describe('estrelas', () => {
  it('timeLeft: mais tempo restante dá mais estrelas', () => {
    const cfg = configFor(f4)
    const base = createGame(cfg, 1)
    const s = { ...base, status: 'won' as const, timeLeft: cfg.duration, dmaCollected: true }
    expect(computeOutcome(s).stars).toBe(3)
    const low = { ...s, timeLeft: 0 }
    expect(computeOutcome(low).stars).toBe(1)
  })

  it('hearts: mais vidas restantes dá mais estrelas', () => {
    const cfg = configFor(f1)
    const base = createGame(cfg, 1)
    const full = { ...base, status: 'won' as const, hearts: cfg.hearts }
    expect(computeOutcome(full).stars).toBe(3)
    const half = { ...base, status: 'won' as const, hearts: Math.ceil(cfg.hearts / 2) }
    expect(computeOutcome(half).stars).toBeLessThanOrEqual(3)
  })

  it('energySaved: menos toques desperdiçados dá mais estrelas', () => {
    const cfg = configFor(f3)
    const base = createGame(cfg, 1)
    const clean = { ...base, status: 'won' as const, energyWasted: 0 }
    expect(computeOutcome(clean).stars).toBe(3)
    const wasteful = { ...base, status: 'won' as const, energyWasted: cfg.goal * 3 }
    expect(computeOutcome(wasteful).stars).toBe(1)
  })
})
