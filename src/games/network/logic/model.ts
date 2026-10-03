import type { Rng } from '@/engine/random'
import type { ComboState, StarCount } from '@/engine/scoring/scoring'
import type { DifficultyId } from '@/engine/types'
import type { NetworkPhase, RouterLink, RouterNode } from '../phases'

export type PacketStatus = 'queued' | 'pending' | 'transit' | 'lost' | 'delivered' | 'wrongAddress'

export type PacketLocation =
  | { kind: 'tray' }
  | { kind: 'node'; id: string }
  | { kind: 'edge'; from: string; to: string; progress: number }

export interface Packet {
  id: string
  messageId: string
  /** Posição do pacote na mensagem original (1-based), para a remontagem. */
  seq: number
  status: PacketStatus
  location: PacketLocation
  resends: number
  /** Segundos desde que este pacote se perdeu, para o timeout de reenvio. */
  waitSinceLoss: number
}

export interface MessageState {
  id: string
  packetIds: string[]
}

export type NetworkEvent =
  | { type: 'selected'; packetId: string }
  | { type: 'sent'; packetId: string }
  | { type: 'blocked'; reason: 'no-edge' | 'dns-not-resolved' | 'not-selectable' }
  | { type: 'dropped'; packetId: string }
  | { type: 'lost'; packetId: string }
  | { type: 'arrived'; packetId: string; nodeId: string }
  | { type: 'delivered'; packetId: string }
  | { type: 'wrongAddress'; packetId: string }
  | { type: 'resent'; packetId: string }
  | { type: 'messageAssembled'; messageId: string }
  | { type: 'dnsResolved'; correct: boolean }
  | { type: 'won' }
  | { type: 'lostGame'; reason: 'timeout' | 'hearts' }

/** Quantas vidas toda fase com derrota começa. Só F2 (enlace cheio) costuma gastar alguma. */
export const START_HEARTS = 3
/** Segundos sem confirmação até o pacote perdido reaparecer na bandeja de saída. */
export const ACK_TIMEOUT_S = 6

export interface NetworkConfig {
  nodes: readonly RouterNode[]
  links: readonly RouterLink[]
  origin: string
  destination: string
  packetCount: number
  /** Meta de mensagens completas. */
  goal: number
  duration: number
  /** Falso no modo sem tempo (e sempre falso no tutorial, que nunca perde por tempo). */
  timed: boolean
  lossChance: number
  dns: boolean
  dnsName?: string
  dnsOptions?: readonly string[]
  dnsCorrectIndex?: number
  startHearts: number
  canLose: boolean
  stars: NetworkPhase['stars']
}

/** Sem ajuste por dificuldade (a estação não usa `hasDifficulty`); só o modo sem tempo importa. */
export function resolveConfig(
  phase: NetworkPhase,
  o: { difficulty: DifficultyId; untimed: boolean },
): NetworkConfig {
  return {
    nodes: phase.nodes,
    links: phase.links,
    origin: phase.origin,
    destination: phase.destination,
    packetCount: phase.packetCount,
    goal: Math.max(1, phase.goal),
    duration: phase.duration,
    timed: phase.kind !== 'tutorial' && !o.untimed,
    lossChance: phase.lossChance,
    dns: phase.dns,
    dnsName: phase.dnsName,
    dnsOptions: phase.dnsOptions,
    dnsCorrectIndex: phase.dnsCorrectIndex,
    startHearts: START_HEARTS,
    canLose: phase.canLose,
    stars: phase.stars,
  }
}

export interface NetworkState {
  config: NetworkConfig
  rng: Rng
  messages: MessageState[]
  /** Índice da mensagem sendo entregue agora (as próximas ainda não estão na bandeja). */
  activeIndex: number
  packets: Record<string, Packet>
  /** Quantos pacotes estão em trânsito em cada enlace agora, por chave `a>b` (ordenada). */
  linkLoad: Record<string, number>
  delivered: number
  hearts: number
  elapsed: number
  resends: number
  dnsResolved: boolean
  dnsCorrect: boolean
  /** Pacote tocado pelo jogador, esperando o toque no roteador de destino. */
  selected: string | null
  scoring: ComboState
  status: 'playing' | 'won' | 'lost'
  /** Eventos só deste passo (seleção/envio/tick); a cena os consome e descarta. */
  events: NetworkEvent[]
}

export interface NetworkOutcome {
  won: boolean
  stars: StarCount
  score: number
}
