/**
 * Estado de uma partida como máquina de passos (igual a
 * `games/io/logic/rules.ts`): o laço automático da CPU pedindo endereços, a
 * viagem até a RAM numa falha e a pausa para o jogador escolher quem sai —
 * tudo em cima das funções puras de `logic/model.ts`.
 */
import { createRng } from '@/engine/random'
import { breakCombo, emptyCombo, registerHit, type ComboState } from '@/engine/scoring/scoring'
import {
  createCacheState,
  generateRequest,
  insert,
  resolveRequest,
  type CacheConfig,
  type CacheLevel,
  type CacheState,
} from './model'
import { REQUEST_EVERY_SECONDS, TRAVEL_SECONDS } from '../phases'

export const RULES = {
  hitPoints: 25,
  l2HitPoints: 15,
  comboStep: 10,
  /**
   * Pedidos mínimos antes de checar a derrota por tempo médio. Sem isso, a
   * primeira falha (a bancada sempre começa vazia, então o 1º pedido é
   * sempre falha) já deixaria `avgLatency` acima de `maxAvgLatency` em
   * fases com `latency.miss` perto do limite, derrotando o jogador antes
   * de qualquer escolha dele. A vitória não tem esse piso.
   */
  minRequestsForLoss: 4,
} as const

export type CacheEvent =
  | { type: 'hit'; address: number }
  | { type: 'l2-hit'; address: number }
  | { type: 'miss'; address: number }
  | { type: 'arrived'; address: number }
  | { type: 'need-eviction'; address: number }
  | { type: 'evicted'; address: number }
  | { type: 'won' }
  | { type: 'lost' }

export interface PendingEviction {
  level: CacheLevel
  address: number
  block: readonly number[]
}

export interface GameState {
  cache: CacheState
  requestTimer: number
  travel: { address: number; remaining: number } | null
  /** Cresce a cada viagem nova até a RAM; usado pela cena para disparar o `MemoryTrip` só em falhas. */
  travelSeq: number
  awaitingEviction: PendingEviction | null
  scoring: ComboState
  elapsed: number
  events: CacheEvent[]
}

export function createGame(config: CacheConfig, seed: number): GameState {
  return {
    cache: createCacheState(config, createRng(seed)),
    // primeiro pedido chega um pouco antes do intervalo cheio, como nas
    // outras estações com chegada automática (ver `games/io/logic/rules.ts`).
    requestTimer: REQUEST_EVERY_SECONDS * 0.6,
    travel: null,
    travelSeq: 0,
    awaitingEviction: null,
    scoring: emptyCombo(),
    elapsed: 0,
    events: [],
  }
}

function draft(s: GameState): GameState {
  return { ...s, events: [] }
}

/**
 * Vitória/derrota como no design doc: `avgLatency = totalLatency /
 * requestsDone`; derrota quando `avgLatency` passa do limite mesmo faltando
 * pedidos (corte antecipado); vitória quando a meta de pedidos é alcançada
 * sem passar do limite.
 */
function checkOutcome(d: GameState): GameState {
  if (d.cache.status !== 'playing' || d.cache.requestsDone === 0) return d
  const avgLatency = d.cache.totalLatency / d.cache.requestsDone
  if (d.cache.requestsDone >= RULES.minRequestsForLoss && avgLatency > d.cache.config.maxAvgLatency) {
    d.cache = { ...d.cache, status: 'lost' }
    d.events.push({ type: 'lost' })
    return d
  }
  if (d.cache.requestsDone >= d.cache.config.requestsGoal) {
    d.cache = { ...d.cache, status: 'won' }
    d.events.push({ type: 'won' })
  }
  return d
}

function issueRequest(d: GameState): GameState {
  const { address, rng } = generateRequest(d.cache.rng, d.cache.config.pattern, d.cache.recent)
  const { state: resolved, event } = resolveRequest({ ...d.cache, rng }, address)
  d.cache = resolved

  if (event.type === 'hit') {
    d.scoring = registerHit(d.scoring, RULES.hitPoints, RULES.comboStep)
    d.events.push({ type: 'hit', address })
  } else if (event.type === 'l2-hit') {
    d.scoring = registerHit(d.scoring, RULES.l2HitPoints, RULES.comboStep)
    d.events.push({ type: 'l2-hit', address })
  } else {
    d.scoring = breakCombo(d.scoring)
    d.events.push({ type: 'miss', address })
    d.travel = { address, remaining: TRAVEL_SECONDS }
    d.travelSeq += 1
  }
  return checkOutcome(d)
}

function settleTravel(d: GameState): GameState {
  const address = d.travel!.address
  d.travel = null
  const { state: next, event } = insert(d.cache, address, 'l1')
  d.cache = next
  if (event.type === 'need-eviction') {
    d.awaitingEviction = { level: event.level, address, block: event.block }
    d.events.push({ type: 'need-eviction', address })
    return d
  }
  d.events.push({ type: 'arrived', address })
  return checkOutcome(d)
}

/**
 * Avança `dt` segundos. Congela (não cronometra novos pedidos) enquanto
 * espera a escolha manual do jogador (`awaitingEviction`); durante a
 * viagem até a RAM, só conta o tempo da própria viagem.
 */
export function step(state: GameState, dt: number): GameState {
  if (state.cache.status !== 'playing' || dt <= 0) return state
  const d = draft(state)
  d.elapsed += dt

  if (d.awaitingEviction) return d

  if (d.travel) {
    const remaining = d.travel.remaining - dt
    if (remaining > 0) {
      d.travel = { ...d.travel, remaining }
      return d
    }
    return settleTravel(d)
  }

  d.requestTimer -= dt
  if (d.requestTimer > 0) return d
  d.requestTimer += REQUEST_EVERY_SECONDS
  return issueRequest(d)
}

/** O jogador toca no espaço que deve sair (a única ação manual do jogo). */
export function evict(state: GameState, evictAddress: number): GameState {
  const pending = state.awaitingEviction
  if (!pending || state.cache.status !== 'playing') return state
  const d = draft(state)
  const { level, address } = pending
  const { state: next, event } = insert(d.cache, address, level, evictAddress)
  if (event.type === 'need-eviction') return state
  d.cache = next
  d.awaitingEviction = null
  d.events.push({ type: 'evicted', address: evictAddress })
  return checkOutcome(d)
}
