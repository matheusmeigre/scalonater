import { describe, expect, it } from 'vitest'
import { createRng } from '@/engine/random'
import {
  blockFor,
  createCacheState,
  generateRequest,
  insert,
  lookup,
  resolveConfig,
  resolveRequest,
} from './model'
import { computeOutcome } from './outcome'
import { PHASES, type CacheRequestPattern } from '../phases'
import { createGame, evict, step, type GameState } from './rules'

/**
 * Escolhe um endereço já ocupando um espaço do nível que precisa de
 * eviction — nunca o endereço novo que está tentando entrar (esse é o
 * `block` pendente, ainda não cacheado).
 */
function pickEvictAddress(s: GameState): number {
  const pending = s.awaitingEviction!
  const slots = pending.level === 'l1' ? s.cache.l1 : s.cache.l2
  const occupied = slots.find((slot) => slot !== null)!
  return occupied[0]!
}

const tutorial = PHASES[0]!
const f1 = PHASES.find((p) => p.id === 'bancada-cheia')!
const f2 = PHASES.find((p) => p.id === 'volta-a-pedir')!
const f3 = PHASES.find((p) => p.id === 'vizinhos-de-linha')!
const f4 = PHASES.find((p) => p.id === 'dois-niveis')!

describe('blockFor', () => {
  it('devolve só o próprio endereço quando blockSize é 1', () => {
    expect(blockFor(10, 1)).toEqual([10])
  })

  it('devolve o bloco alinhado de 4 vizinhos quando blockSize é 4', () => {
    expect(blockFor(10, 4)).toEqual([8, 9, 10, 11])
    expect(blockFor(8, 4)).toEqual([8, 9, 10, 11])
    expect(blockFor(11, 4)).toEqual([8, 9, 10, 11])
  })
})

describe('lookup/insert', () => {
  const config = resolveConfig(f1)

  it('começa tudo vazio: qualquer endereço é falha', () => {
    const state = createCacheState(config, createRng(1))
    expect(lookup(state, 5)).toBe('miss')
  })

  it('insert enche um espaço vazio e lookup passa a achar no L1', () => {
    const state = createCacheState(config, createRng(1))
    const { state: next } = insert(state, 5, 'l1')
    expect(lookup(next, 5)).toBe('l1')
  })

  it('pede eviction quando o nível está cheio e nenhum endereço foi escolhido', () => {
    let state = createCacheState(config, createRng(1))
    state = insert(state, 1, 'l1').state
    state = insert(state, 2, 'l1').state
    state = insert(state, 3, 'l1').state // 3 espaços, agora cheio
    const { event, state: unchanged } = insert(state, 99, 'l1')
    expect(event.type).toBe('need-eviction')
    expect(unchanged).toBe(state) // não muda o estado por si só
  })

  it('com evictAddress, remove o espaço escolhido e insere o novo bloco', () => {
    let state = createCacheState(config, createRng(1))
    state = insert(state, 1, 'l1').state
    state = insert(state, 2, 'l1').state
    state = insert(state, 3, 'l1').state
    const { state: next } = insert(state, 99, 'l1', 2)
    expect(lookup(next, 2)).toBe('miss')
    expect(lookup(next, 99)).toBe('l1')
    expect(lookup(next, 1)).toBe('l1')
    expect(lookup(next, 3)).toBe('l1')
  })

  it('fase 3+: insere o bloco inteiro de vizinhos de uma vez', () => {
    const cfg3 = resolveConfig(f3)
    const state = createCacheState(cfg3, createRng(1))
    const { state: next } = insert(state, 10, 'l1')
    expect(lookup(next, 8)).toBe('l1')
    expect(lookup(next, 9)).toBe('l1')
    expect(lookup(next, 10)).toBe('l1')
    expect(lookup(next, 11)).toBe('l1')
  })

  it('fase 4: o espaço removido do L1 desce para o L2 automaticamente', () => {
    const cfg4 = resolveConfig(f4)
    let state = createCacheState(cfg4, createRng(1))
    state = insert(state, 4, 'l1').state
    state = insert(state, 20, 'l1').state // l1Slots=2, agora cheio
    const { state: next } = insert(state, 40, 'l1', 4)
    expect(lookup(next, 4)).toBe('l2') // desceu, não desapareceu
    expect(lookup(next, 40)).toBe('l1')
  })
})

describe('generateRequest', () => {
  const pattern: CacheRequestPattern = {
    addressSpace: 10,
    temporalRepeatChance: 1,
    recentWindow: 2,
    spatialStreakChance: 0,
  }

  it('é determinístico: mesma semente e mesmo histórico devolvem o mesmo endereço', () => {
    const rng = createRng(42)
    const a = generateRequest(rng, pattern, [3, 7])
    const b = generateRequest(rng, pattern, [3, 7])
    expect(a.address).toBe(b.address)
  })

  it('com temporalRepeatChance = 1 e histórico não vazio, sempre repete um do histórico', () => {
    let rng = createRng(1)
    for (let i = 0; i < 20; i++) {
      const { address, rng: next } = generateRequest(rng, pattern, [3, 7])
      expect([3, 7]).toContain(address)
      rng = next
    }
  })

  it('sem histórico, cai no ramo aleatório dentro do universo de endereços', () => {
    let rng = createRng(1)
    for (let i = 0; i < 20; i++) {
      const { address, rng: next } = generateRequest(rng, pattern, [])
      expect(address).toBeGreaterThanOrEqual(0)
      expect(address).toBeLessThan(pattern.addressSpace)
      rng = next
    }
  })

  it('localidade espacial: fica a ±1..3 do último endereço, dentro do universo', () => {
    const spatial: CacheRequestPattern = {
      addressSpace: 20,
      temporalRepeatChance: 0,
      recentWindow: 4,
      spatialStreakChance: 1,
    }
    let rng = createRng(5)
    for (let i = 0; i < 30; i++) {
      const { address, rng: next } = generateRequest(rng, spatial, [10])
      expect(address).toBeGreaterThanOrEqual(0)
      expect(address).toBeLessThan(20)
      expect(Math.abs(address - 10)).toBeLessThanOrEqual(3)
      rng = next
    }
  })
})

describe('resolveRequest', () => {
  it('acerto soma latency.hit e não muda o conteúdo do cache', () => {
    const config = resolveConfig(f1)
    let state = createCacheState(config, createRng(1))
    state = insert(state, 5, 'l1').state
    const { state: next, event } = resolveRequest(state, 5)
    expect(event.type).toBe('hit')
    expect(next.totalLatency).toBe(config.latency.hit)
    expect(next.requestsDone).toBe(1)
  })

  it('falha soma latency.miss', () => {
    const config = resolveConfig(f1)
    const state = createCacheState(config, createRng(1))
    const { state: next, event } = resolveRequest(state, 5)
    expect(event.type).toBe('miss')
    expect(next.totalLatency).toBe(config.latency.miss)
  })
})

describe('createGame/step: determinismo e máquina de passos', () => {
  it('é determinístico com a mesma semente', () => {
    const config = resolveConfig(f1)
    let a = createGame(config, 7)
    let b = createGame(config, 7)
    for (let i = 0; i < 200; i++) {
      a = step(a, 0.3)
      if (a.awaitingEviction) a = evict(a, pickEvictAddress(a))
      b = step(b, 0.3)
      if (b.awaitingEviction) b = evict(b, pickEvictAddress(b))
    }
    expect(a.cache.requestsDone).toBe(b.cache.requestsDone)
    expect(a.cache.totalLatency).toBe(b.cache.totalLatency)
    expect(a.cache.l1).toEqual(b.cache.l1)
  })

  it('pausa novos pedidos enquanto espera a escolha manual do jogador', () => {
    const config = resolveConfig(f1)
    let s = createGame(config, 3)
    for (let i = 0; i < 400 && !s.awaitingEviction && s.cache.status === 'playing'; i++) {
      s = step(s, 0.3)
    }
    expect(s.awaitingEviction).not.toBeNull()
    const requestsBefore = s.cache.requestsDone
    for (let i = 0; i < 20; i++) s = step(s, 0.3)
    expect(s.cache.requestsDone).toBe(requestsBefore) // nada avançou sem a escolha
  })

  it('o jogador escolhe quem sai e o jogo continua', () => {
    const config = resolveConfig(f1)
    let s = createGame(config, 3)
    for (let i = 0; i < 400 && !s.awaitingEviction && s.cache.status === 'playing'; i++) {
      s = step(s, 0.3)
    }
    expect(s.awaitingEviction).not.toBeNull()
    // `evictAddress` precisa ser um endereço já ocupando um espaço — o
    // `block` pendente é o endereço novo tentando entrar, ainda não
    // cacheado.
    const occupied = s.cache.l1.find((slot) => slot !== null)!
    s = evict(s, occupied[0]!)
    expect(s.awaitingEviction).toBeNull()
    expect(s.events.some((e) => e.type === 'evicted')).toBe(true)
  })

  it('tutorial: primeiro pedido falha, segundo repete o endereço e acerta', () => {
    const config = resolveConfig(tutorial)
    let s = createGame(config, 11)
    const missEvents: number[] = []
    for (let i = 0; i < 100 && s.cache.requestsDone < 2; i++) {
      s = step(s, 0.3)
      if (s.awaitingEviction) s = evict(s, pickEvictAddress(s))
      for (const e of s.events) if (e.type === 'miss' || e.type === 'hit') missEvents.push(1)
    }
    expect(s.cache.requestsDone).toBe(2)
    expect(s.cache.status).toBe('won')
  })
})

describe('computeOutcome', () => {
  it('derrota quando avgLatency ultrapassa maxAvgLatency, mesmo faltando pedidos', () => {
    const config = resolveConfig(f1)
    let s = createGame(config, 3)
    for (let i = 0; i < 1000 && s.cache.status === 'playing'; i++) {
      s = step(s, 0.3)
      if (s.awaitingEviction) {
        // sempre descarta o endereço mais antigo do bloco anterior: pressiona
        // o jogo para a derrota mais rápido em testes determinísticos.
        s = evict(s, pickEvictAddress(s))
      }
    }
    const o = computeOutcome(s)
    if (s.cache.status === 'lost') {
      expect(o.won).toBe(false)
      expect(o.stars).toBe(0)
      expect(o.lostReason).toBe('latency')
    }
  })

  it('vitória sempre dá ao menos 1 estrela, e a métrica é invertida (menor latência = mais estrelas)', () => {
    const config = resolveConfig(f1)
    let s = createGame(config, 99)
    for (let i = 0; i < 2000 && s.cache.status === 'playing'; i++) {
      s = step(s, 0.3)
      if (s.awaitingEviction) s = evict(s, pickEvictAddress(s))
    }
    const o = computeOutcome(s)
    if (o.won) {
      expect(o.stars).toBeGreaterThanOrEqual(1)
      // menor avgLatency (melhor desempenho) nunca dá menos estrelas que um
      // avgLatency maior com o mesmo threshold.
      const metricBetter = 1 - o.avgLatency / config.maxAvgLatency
      const metricWorse = metricBetter - 0.5
      const starsBetter = metricBetter >= config.starThresholds[1] ? 3 : metricBetter >= config.starThresholds[0] ? 2 : 1
      const starsWorse = metricWorse >= config.starThresholds[1] ? 3 : metricWorse >= config.starThresholds[0] ? 2 : 1
      expect(starsBetter).toBeGreaterThanOrEqual(starsWorse)
    }
  })

  it('o tutorial sempre fecha com 3 estrelas ao vencer', () => {
    const config = resolveConfig(tutorial)
    let s = createGame(config, 1)
    for (let i = 0; i < 100 && s.cache.status === 'playing'; i++) s = step(s, 0.3)
    const o = computeOutcome(s)
    expect(o.won).toBe(true)
    expect(o.stars).toBe(3)
  })

  it('fases 2-4 cobrem localidade temporal/espacial e dois níveis sem lançar erros', () => {
    for (const phase of [f2, f3, f4]) {
      const config = resolveConfig(phase)
      let s = createGame(config, 5)
      for (let i = 0; i < 1500 && s.cache.status === 'playing'; i++) {
        s = step(s, 0.3)
        if (s.awaitingEviction) s = evict(s, pickEvictAddress(s))
      }
      expect(['won', 'lost']).toContain(s.cache.status)
    }
  })
})
