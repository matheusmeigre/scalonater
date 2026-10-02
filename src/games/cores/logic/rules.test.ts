import { describe, expect, it } from 'vitest'
import { PHASES } from '../phases'
import { resolveConfig, type CoresConfig, type CoresState } from './model'
import { computeOutcome } from './outcome'
import {
  RULES,
  canDrop,
  coreLoad,
  createGame,
  dropThread,
  selectThread,
  slotSpeed,
  step,
  tapSlot,
} from './rules'

const phase = (id: string) => PHASES.find((p) => p.id === id)!
const config = (id: string, o: Partial<CoresConfig> = {}): CoresConfig => ({
  ...resolveConfig(phase(id), { difficulty: 'normal', untimed: false }),
  ...o,
})
/** Roda a simulação em passos pequenos. */
const run = (s: CoresState, seconds: number, dt = 0.05) => {
  for (let t = 0; t < seconds && s.status === 'playing'; t += dt) s = step(s, dt)
  return s
}
const types = (s: CoresState) => s.events.map((e) => e.type)

describe('configuração', () => {
  it('o tutorial não tem relógio nem derrota', () => {
    const c = resolveConfig(phase('tutorial'), { difficulty: 'hard', untimed: false })
    expect(c.timed).toBe(false)
    expect(c.canLose).toBe(false)
    expect(c.goal).toBe(phase('tutorial').goal)
  })

  it('a dificuldade muda tempo e meta', () => {
    const easy = resolveConfig(phase('io-wait'), { difficulty: 'easy', untimed: false })
    const hard = resolveConfig(phase('io-wait'), { difficulty: 'hard', untimed: false })
    expect(easy.duration).toBeGreaterThan(hard.duration)
    expect(easy.goal).toBeLessThan(hard.goal)
  })

  it('no modo sem tempo as estrelas medem o uso da CPU', () => {
    const c = resolveConfig(phase('io-wait'), { difficulty: 'normal', untimed: true })
    expect(c.timed).toBe(false)
    expect(c.starMetric).toBe('cpuUsage')
  })

  it('Render só aparece em fases com paciência', () => {
    expect(config('io-wait').renderChance).toBe(0)
    expect(config('time-slice').renderChance).toBeGreaterThan(0)
  })
})

describe('criação', () => {
  it('monta núcleos, espaços e a fila inicial', () => {
    const s = createGame(config('smt-cache'), 1)
    expect(s.slots).toHaveLength(8)
    expect(s.queue).toHaveLength(3)
    expect(s.events).toEqual([])
  })

  it('é determinístico para a mesma semente', () => {
    const a = run(createGame(config('time-slice'), 5), 5)
    const b = run(createGame(config('time-slice'), 5), 5)
    expect(a.queue).toEqual(b.queue)
    expect(a.threads).toEqual(b.threads)
  })
})

describe('tocar e colocar', () => {
  it('tocar num espaço vazio sem escolha manda a primeira da fila', () => {
    const s0 = createGame(config('tutorial'), 1)
    const first = s0.queue[0]
    const s = tapSlot(s0, 0)
    expect(s.slots[0]!.threadId).toBe(first)
    expect(s.queue).not.toContain(first)
    expect(types(s)).toContain('place')
    expect(s.scoring.score).toBe(RULES.quickPlacePoints)
  })

  it('tocar numa thread e depois num espaço manda a escolhida', () => {
    let s = createGame(config('tutorial'), 1)
    const chosen = s.queue[2]!
    s = selectThread(s, chosen)
    expect(s.selected).toBe(chosen)
    expect(types(s)).toEqual(['select'])
    s = tapSlot(s, 3)
    expect(s.slots[3]!.threadId).toBe(chosen)
    expect(s.selected).toBeNull()
  })

  it('tocar duas vezes na mesma thread desfaz a escolha', () => {
    let s = createGame(config('tutorial'), 1)
    s = selectThread(selectThread(s, s.queue[0]!), s.queue[0]!)
    expect(s.selected).toBeNull()
    expect(types(s)).toEqual(['deselect'])
  })

  it('fila vazia gera evento de toque inválido', () => {
    let s = createGame(config('tutorial', { initialThreads: 0 }), 1)
    s = tapSlot(s, 0)
    expect(s.events).toEqual([{ type: 'invalid', reason: 'emptyQueue' }])
  })

  it('tocar num núcleo ocupado devolve a thread ao fim da fila, com o progresso', () => {
    let s = tapSlot(createGame(config('tutorial'), 1), 0)
    const id = s.slots[0]!.threadId!
    s = step(s, 0.5)
    const progress = s.threads[id]!.progress
    s = tapSlot(s, 0)
    expect(s.slots[0]!.threadId).toBeNull()
    expect(s.queue.at(-1)).toBe(id)
    expect(s.threads[id]!.progress).toBe(progress)
    expect(s.threads[id]!.lastCore).toBe(0)
  })

  it('avisa quando todos os núcleos estão ocupados', () => {
    let s = createGame(config('tutorial', { initialThreads: 4 }), 1)
    for (let i = 0; i < 3; i++) s = tapSlot(s, i)
    s = tapSlot(s, 3)
    expect(types(s)).toEqual(['place', 'allBusy'])
  })
})

describe('arrastar', () => {
  it('da fila para um espaço livre', () => {
    const s0 = createGame(config('tutorial'), 1)
    const id = s0.queue[1]!
    const s = dropThread(s0, { kind: 'queue', threadId: id }, { kind: 'slot', slot: 2 })
    expect(s.slots[2]!.threadId).toBe(id)
    expect(s.events[0]).toMatchObject({ type: 'place', how: 'drag', moved: false })
  })

  it('não solta em espaço ocupado nem na espera de dados sem estar travada', () => {
    const s = tapSlot(createGame(config('io-wait'), 1), 0)
    const id = s.queue[0]!
    expect(canDrop(s, { kind: 'queue', threadId: id }, { kind: 'slot', slot: 0 })).toBe(false)
    expect(canDrop(s, { kind: 'slot', slot: 0 }, { kind: 'io' })).toBe(false)
    expect(dropThread(s, { kind: 'queue', threadId: id }, { kind: 'slot', slot: 0 })).toBe(s)
  })

  it('mover entre núcleos não dá pontos de novo', () => {
    let s = tapSlot(createGame(config('tutorial'), 1), 0)
    const score = s.scoring.score
    s = dropThread(s, { kind: 'slot', slot: 0 }, { kind: 'slot', slot: 1 })
    expect(s.slots[1]!.threadId).not.toBeNull()
    expect(s.slots[0]!.threadId).toBeNull()
    expect(s.scoring.score).toBe(score)
  })
})

describe('simulação', () => {
  it('conclui threads, soma pontos e combo', () => {
    let s = createGame(config('tutorial', { initialThreads: 1, spawnEvery: 999 }), 3)
    s = tapSlot(s, 0)
    const work = Object.values(s.threads)[0]!.work
    s = run(s, work + 0.2)
    expect(s.done).toBe(1)
    expect(s.scoring.combo).toBe(1)
    expect(s.scoring.score).toBe(RULES.quickPlacePoints + RULES.donePoints)
  })

  it('núcleo parado com fila cheia zera o combo e gera dica', () => {
    let s = createGame(config('tutorial', { spawnEvery: 999 }), 3)
    s = { ...s, scoring: { score: 0, combo: 4, maxCombo: 4 } }
    const events: string[] = []
    for (let t = 0; t < RULES.idleWarningSeconds + 0.2; t += 0.1) {
      s = step(s, 0.1)
      events.push(...types(s))
    }
    expect(events).toContain('idleWarning')
    expect(s.scoring.combo).toBe(0)
    expect(s.scoring.maxCombo).toBe(4)
  })

  it('thread travada esperando dados ocupa o núcleo até sair para a espera', () => {
    let s = createGame(config('io-wait', { initialThreads: 1, spawnEvery: 999, blockChance: 1 }), 2)
    s = tapSlot(s, 0)
    const id = s.slots[0]!.threadId!
    let blocked = false
    for (let i = 0; i < 200 && !blocked; i++) {
      s = step(s, 0.05)
      blocked = s.events.some((e) => e.type === 'blocked')
    }
    expect(blocked).toBe(true)
    expect(slotSpeed(s, s.slots[0]!)).toBe(0)
    expect(canDrop(s, { kind: 'slot', slot: 0 }, { kind: 'io' })).toBe(true)
    // tocar na travada manda para a espera de dados, não para a fila
    s = tapSlot(s, 0)
    expect(s.io).toEqual([id])
    expect(s.events).toEqual([{ type: 'unplace', to: 'io' }])
    // quando o dado chega, ela volta sozinha para a fila
    s = run(s, RULES.ioWaitSeconds + 0.2)
    expect(s.io).toEqual([])
    expect(s.queue).toContain(id)
    expect(s.threads[id]!.blocked).toBe(false)
  })

  it('paciência esgotada custa uma vida e pode perder a fase', () => {
    let s = createGame(config('time-slice', { spawnEvery: 999, hearts: 1 }), 4)
    s = run(s, 30)
    expect(s.status).toBe('lost')
    expect(s.lostReason).toBe('hearts')
    expect(computeOutcome(s)).toMatchObject({ won: false, stars: 0, lostReason: 'hearts' })
  })

  it('o tempo acaba e a fase é perdida', () => {
    let s = createGame(config('io-wait', { duration: 2 }), 4)
    s = { ...s, timeLeft: 2 }
    s = run(s, 3)
    expect(s.status).toBe('lost')
    expect(s.lostReason).toBe('time')
  })

  it('o tutorial nunca é perdido', () => {
    let s = createGame(config('tutorial'), 4)
    s = run(s, 120)
    expect(s.status).toBe('playing')
  })

  it('tic nos últimos 10 segundos', () => {
    let s = createGame(config('io-wait'), 4)
    s = { ...s, timeLeft: 10.02 }
    s = step(s, 0.05)
    expect(s.events).toContainEqual({ type: 'tick', second: 10 })
  })

  it('SMT: dois no mesmo núcleo rodam a 60%; cache quente a 130%', () => {
    let s = createGame(config('smt-cache', { initialThreads: 2, spawnEvery: 999 }), 9)
    s = tapSlot(s, 0)
    s = tapSlot(s, 1)
    expect(coreLoad(s, 0)).toBe(2)
    expect(slotSpeed(s, s.slots[0]!)).toBeCloseTo(RULES.smtSpeed)
    const id = s.slots[0]!.threadId!
    s = tapSlot(s, 0) // volta à fila, lembrando o núcleo 0
    s = tapSlot(s, 1) // libera o espaço 1 também
    s = selectThread(s, id)
    s = tapSlot(s, 0)
    expect(s.events[0]).toMatchObject({ type: 'place', hot: true })
    expect(slotSpeed(s, s.slots[0]!)).toBeCloseTo(RULES.hotCacheSpeed)
  })

  it('dividir núcleo tendo núcleo vazio é sinalizado', () => {
    let s = createGame(config('smt-cache', { initialThreads: 2, spawnEvery: 999 }), 9)
    s = tapSlot(s, 0)
    s = tapSlot(s, 1)
    expect(s.events[0]).toMatchObject({ type: 'place', wasteful: true })
  })

  it('vence ao atingir a meta e calcula estrelas pelo tempo que sobrou', () => {
    let s = createGame(config('io-wait', { goal: 1, initialThreads: 1, blockChance: 0 }), 4)
    s = tapSlot(s, 0)
    s = run(s, 10)
    expect(s.status).toBe('won')
    const o = computeOutcome(s)
    expect(o.won).toBe(true)
    expect(o.stars).toBe(3)
    expect(o.cpuPercent).toBeGreaterThan(0)
  })
})

describe('escalonador automático', () => {
  it('joga sozinho e vence a fase mais difícil', () => {
    const c = resolveConfig(phase('smt-cache'), {
      difficulty: 'normal',
      untimed: false,
      autoplay: true,
    })
    expect(c.canLose).toBe(false)
    let s = createGame(c, 11)
    s = run(s, 120)
    expect(s.status).toBe('won')
  })
})
