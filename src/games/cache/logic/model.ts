/**
 * Tipos e regras puras da estação Cache (`docs/design/cache.md`, seções
 * "Mecânica principal" e "Contrato de dados das fases"). Os "espaços de
 * cache" (acerto, falha, remoção) são um componente próprio desta estação —
 * só a estante da RAM e a viagem (`MemoryTrip`) de `src/games/shared/memory/`
 * são reusadas, na cena (`scene/`), não aqui.
 */
import { nextRandom, type Rng } from '@/engine/random'
import type { CachePhase, CacheRequestPattern } from '../phases'

export type CacheLevel = 'l1' | 'l2'

/** Um espaço do cache: vazio, ou ocupado por um bloco de `blockSize` endereços. */
export type CacheSlot = readonly number[] | null

export interface CacheConfig {
  l1Slots: number
  l2Slots: number
  blockSize: number
  pattern: CacheRequestPattern
  latency: { hit: number; l2Hit: number; miss: number }
  maxAvgLatency: number
  requestsGoal: number
  starThresholds: readonly [number, number]
}

export function resolveConfig(phase: CachePhase): CacheConfig {
  return {
    l1Slots: phase.l1Slots,
    l2Slots: phase.l2Slots,
    blockSize: phase.blockSize,
    pattern: phase.pattern,
    latency: phase.latency,
    maxAvgLatency: phase.maxAvgLatency,
    requestsGoal: phase.requestsGoal,
    starThresholds: phase.stars.thresholds,
  }
}

export interface CacheState {
  config: CacheConfig
  l1: CacheSlot[]
  l2: CacheSlot[]
  /** Próximo espaço do L2 a sobrescrever quando cheio (giro automático, sem decisão do jogador). */
  l2Cursor: number
  /** Endereços pedidos recentemente, o mais novo primeiro (limitado a `recentWindow`). */
  recent: number[]
  requestsDone: number
  totalLatency: number
  rng: Rng
  status: 'playing' | 'won' | 'lost'
}

/** Bloco alinhado de `blockSize` endereços que contém `address` (fase 3+). */
export function blockFor(address: number, blockSize: number): number[] {
  if (blockSize <= 1) return [address]
  const start = Math.floor(address / blockSize) * blockSize
  return Array.from({ length: blockSize }, (_, i) => start + i)
}

export function createCacheState(config: CacheConfig, rng: Rng): CacheState {
  return {
    config,
    l1: Array.from({ length: config.l1Slots }, () => null),
    l2: Array.from({ length: config.l2Slots }, () => null),
    l2Cursor: 0,
    recent: [],
    requestsDone: 0,
    totalLatency: 0,
    rng,
    status: 'playing',
  }
}

function slotIndexOf(slots: readonly CacheSlot[], address: number): number {
  return slots.findIndex((slot) => slot !== null && slot.includes(address))
}

/**
 * Percorre L1, depois L2 (se existir), depois declara falha. Só consulta:
 * nunca muda o estado.
 */
export function lookup(state: CacheState, address: number): CacheLevel | 'miss' {
  if (slotIndexOf(state.l1, address) !== -1) return 'l1'
  if (state.config.l2Slots > 0 && slotIndexOf(state.l2, address) !== -1) return 'l2'
  return 'miss'
}

export type CacheInsertEvent =
  | { type: 'inserted'; level: CacheLevel; block: readonly number[]; evicted: readonly number[] }
  | { type: 'need-eviction'; level: CacheLevel; block: readonly number[] }

/**
 * Insere o bloco de `address` no nível indicado. Se o nível está cheio e
 * `evictAddress` não foi informado, devolve `need-eviction` sem alterar o
 * estado — o sinal para a cena pausar e perguntar ao jogador. Com
 * `evictAddress`, remove o espaço que contém aquele endereço antes de
 * inserir; se o nível é o L1 e existe L2, o bloco removido desce para o L2
 * (giro automático, nunca uma segunda escolha manual do jogador).
 */
export function insert(
  state: CacheState,
  address: number,
  level: CacheLevel,
  evictAddress?: number,
): { state: CacheState; event: CacheInsertEvent } {
  const block = blockFor(address, state.config.blockSize)
  const slots = level === 'l1' ? state.l1 : state.l2
  let nextSlots = slots
  let evicted: number[] = []

  let targetIndex = slots.findIndex((slot) => slot === null)
  if (targetIndex === -1) {
    if (evictAddress === undefined) {
      return { state, event: { type: 'need-eviction', level, block } }
    }
    targetIndex = slotIndexOf(slots, evictAddress)
    if (targetIndex === -1) {
      return { state, event: { type: 'need-eviction', level, block } }
    }
    evicted = [...(slots[targetIndex] ?? [])]
  }

  nextSlots = slots.map((slot, i) => (i === targetIndex ? block : slot))

  let nextState: CacheState = {
    ...state,
    l1: level === 'l1' ? nextSlots : state.l1,
    l2: level === 'l2' ? nextSlots : state.l2,
  }

  if (level === 'l1' && evicted.length > 0 && state.config.l2Slots > 0) {
    nextState = demoteToL2(nextState, evicted)
  }

  return { state: nextState, event: { type: 'inserted', level, block, evicted } }
}

/**
 * Desce um bloco removido do L1 para o L2 (fase 4): ocupa um espaço vazio,
 * ou substitui o espaço mais antigo (giro automático) se o L2 já está
 * cheio. Nunca pede decisão do jogador — a única escolha manual é a do L1.
 */
function demoteToL2(state: CacheState, block: readonly number[]): CacheState {
  const emptyIndex = state.l2.findIndex((slot) => slot === null)
  const targetIndex = emptyIndex !== -1 ? emptyIndex : state.l2Cursor % state.l2.length
  const l2 = state.l2.map((slot, i) => (i === targetIndex ? block : slot))
  const l2Cursor = emptyIndex !== -1 ? state.l2Cursor : (state.l2Cursor + 1) % state.l2.length
  return { ...state, l2, l2Cursor }
}

/**
 * Pseudoaleatório, determinístico por semente: dado o mesmo `rng` e o mesmo
 * histórico `recent`, sempre devolve o mesmo próximo endereço. Três ramos,
 * checados em ordem fixa: repetição temporal, sequência espacial, aleatório
 * puro.
 */
export function generateRequest(
  rng: Rng,
  pattern: CacheRequestPattern,
  recent: readonly number[],
): { address: number; rng: Rng } {
  const [r1, rng1] = nextRandom(rng)
  if (recent.length > 0 && r1 < pattern.temporalRepeatChance) {
    const window = recent.slice(0, Math.max(1, pattern.recentWindow))
    const [r2, rng2] = nextRandom(rng1)
    const address = window[Math.floor(r2 * window.length)]!
    return { address, rng: rng2 }
  }

  const [r2, rng2] = nextRandom(rng1)
  if (recent.length > 0 && r2 < pattern.spatialStreakChance) {
    const [r3, rng3] = nextRandom(rng2)
    const delta = 1 + Math.floor(r3 * 3) // ±1..3
    const [r4, rng4] = nextRandom(rng3)
    const signed = r4 < 0.5 ? -delta : delta
    const address = Math.min(
      pattern.addressSpace - 1,
      Math.max(0, recent[0]! + signed),
    )
    return { address, rng: rng4 }
  }

  const [r3, rng3] = nextRandom(rng2)
  const address = Math.floor(r3 * pattern.addressSpace)
  return { address, rng: rng3 }
}

export type ResolveEvent = { type: 'hit' | 'l2-hit' | 'miss'; address: number }

/**
 * Função de mais alto nível: chama `lookup`, soma a latência certa ao
 * total, e devolve o evento para a animação, sem decidir remoção (isso é
 * `insert`, separado).
 */
export function resolveRequest(
  state: CacheState,
  address: number,
): { state: CacheState; event: ResolveEvent } {
  const level = lookup(state, address)
  const latency =
    level === 'l1' ? state.config.latency.hit : level === 'l2' ? state.config.latency.l2Hit : state.config.latency.miss
  const eventType: ResolveEvent['type'] = level === 'l1' ? 'hit' : level === 'l2' ? 'l2-hit' : 'miss'
  const recent = [address, ...state.recent].slice(0, Math.max(1, state.config.pattern.recentWindow))
  const next: CacheState = {
    ...state,
    recent,
    requestsDone: state.requestsDone + 1,
    totalLatency: state.totalLatency + latency,
  }
  return { state: next, event: { type: eventType, address } }
}
