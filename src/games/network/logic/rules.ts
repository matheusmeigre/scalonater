import { createRng, nextRandom, type Rng } from '@/engine/random'
import { breakCombo, emptyCombo, registerHit } from '@/engine/scoring/scoring'
import type { RouterLink } from '../phases'
import {
  ACK_TIMEOUT_S,
  type MessageState,
  type NetworkConfig,
  type NetworkEvent,
  type NetworkState,
  type Packet,
} from './model'

/** Divide uma mensagem em pacotes numerados (`<messageId>-p1`, `<messageId>-p2`...). */
export function splitMessage(messageId: string, packetCount: number): string[] {
  return Array.from({ length: Math.max(1, packetCount) }, (_, i) => `${messageId}-p${i + 1}`)
}

function linkKey(a: string, b: string): string {
  return [a, b].sort().join('>')
}

function findLink(config: NetworkConfig, a: string, b: string): RouterLink | undefined {
  return config.links.find((l) => (l.from === a && l.to === b) || (l.from === b && l.to === a))
}

/** Roteadores vizinhos de `nodeId` no grafo fixo da fase. */
export function neighbors(config: NetworkConfig, nodeId: string): string[] {
  return config.links
    .filter((l) => l.from === nodeId || l.to === nodeId)
    .map((l) => (l.from === nodeId ? l.to : l.from))
}

function currentNode(config: NetworkConfig, packet: Packet): string {
  return packet.location.kind === 'node' ? packet.location.id : config.origin
}

/** Em qual nó um pacote está agora, para a cena decidir quais roteadores destacar. */
export function packetNode(config: NetworkConfig, packet: Packet): string {
  if (packet.location.kind === 'edge') return packet.location.from
  return currentNode(config, packet)
}

export function createGame(config: NetworkConfig, seed: number): NetworkState {
  const rng = createRng(seed)
  const messages: MessageState[] = []
  const packets: Record<string, Packet> = {}
  for (let m = 0; m < config.goal; m++) {
    const messageId = `m${m}`
    const packetIds = splitMessage(messageId, config.packetCount)
    packetIds.forEach((id, i) => {
      packets[id] = {
        id,
        messageId,
        seq: i + 1,
        status: m === 0 ? 'pending' : 'queued',
        location: { kind: 'tray' },
        resends: 0,
        waitSinceLoss: 0,
      }
    })
    messages.push({ id: messageId, packetIds })
  }
  return {
    config,
    rng,
    messages,
    activeIndex: 0,
    packets,
    linkLoad: {},
    delivered: 0,
    hearts: config.startHearts,
    elapsed: 0,
    resends: 0,
    dnsResolved: !config.dns,
    dnsCorrect: !config.dns,
    selected: null,
    scoring: emptyCombo(),
    status: 'playing',
    events: [],
  }
}

/** Jogador toca num pacote (primeiro toque do "tocar → tocar"). `null` desseleciona. */
export function selectPacket(state: NetworkState, packetId: string | null): NetworkState {
  if (packetId === null) return { ...state, selected: null, events: [] }
  const packet = state.packets[packetId]
  if (!packet || packet.status !== 'pending') return { ...state, events: [] }
  return { ...state, selected: packetId, events: [{ type: 'selected', packetId }] }
}

/**
 * Jogador toca no roteador por onde o pacote selecionado deve seguir (segundo
 * toque). Valida a aresta e a capacidade do enlace; enlace cheio descarta o
 * pacote (reaparece para reenvio) e custa uma vida.
 */
export function forwardPacket(
  state: NetworkState,
  packetId: string,
  nextNodeId: string,
): NetworkState {
  if (state.status !== 'playing') return { ...state, events: [] }
  const packet = state.packets[packetId]
  if (!packet || packet.status !== 'pending') {
    return { ...state, events: [{ type: 'blocked', reason: 'not-selectable' }] }
  }
  if (state.config.dns && !state.dnsResolved) {
    return { ...state, events: [{ type: 'blocked', reason: 'dns-not-resolved' }] }
  }
  const from = currentNode(state.config, packet)
  const link = findLink(state.config, from, nextNodeId)
  if (!link) {
    return { ...state, events: [{ type: 'blocked', reason: 'no-edge' }] }
  }

  const key = linkKey(from, nextNodeId)
  const load = state.linkLoad[key] ?? 0
  if (load >= link.capacity) {
    const hearts = Math.max(0, state.hearts - 1)
    const packets = {
      ...state.packets,
      [packetId]: {
        ...packet,
        status: 'lost' as const,
        location: { kind: 'tray' as const },
        waitSinceLoss: 0,
      },
    }
    const outOfHearts = hearts <= 0 && state.config.canLose
    const events: NetworkEvent[] = [{ type: 'dropped', packetId }]
    if (outOfHearts) events.push({ type: 'lostGame', reason: 'hearts' })
    return {
      ...state,
      packets,
      hearts,
      selected: null,
      scoring: breakCombo(state.scoring),
      status: outOfHearts ? 'lost' : state.status,
      events,
    }
  }

  const packets = {
    ...state.packets,
    [packetId]: {
      ...packet,
      status: 'transit' as const,
      location: { kind: 'edge' as const, from, to: nextNodeId, progress: 0 },
    },
  }
  return {
    ...state,
    packets,
    linkLoad: { ...state.linkLoad, [key]: load + 1 },
    selected: null,
    scoring: registerHit(state.scoring, 10, 2),
    events: [{ type: 'sent', packetId }],
  }
}

/** Escolhe um endereço para o nome do DNS (F4). Chamar de novo corrige uma escolha errada. */
export function resolveDns(state: NetworkState, chosenAddress: string): NetworkState {
  if (!state.config.dns) return { ...state, events: [] }
  const correct = chosenAddress === state.config.dnsOptions?.[state.config.dnsCorrectIndex ?? 0]
  return {
    ...state,
    dnsResolved: true,
    dnsCorrect: correct,
    events: [{ type: 'dnsResolved', correct }],
  }
}

/** Decide, com a semente da partida, se um pacote se perde num salto. Puro e determinístico. */
export function maybeDropPacket(rng: Rng, lossChance: number): [boolean, Rng] {
  if (lossChance <= 0) return [false, rng]
  const [roll, next] = nextRandom(rng)
  return [roll < lossChance, next]
}

/** True quando todos os pacotes de uma mensagem chegaram, em qualquer ordem. */
export function assembleMessage(state: NetworkState, messageId: string): boolean {
  const msg = state.messages.find((m) => m.id === messageId)
  if (!msg) return false
  return msg.packetIds.every((id) => state.packets[id]?.status === 'delivered')
}

/** Confirmação e reenvio: pacote perdido sem ACK por `ACK_TIMEOUT_S` volta à bandeja de saída. */
export function resendIfTimeout(state: NetworkState, dt: number): NetworkState {
  let resends = state.resends
  const packets = { ...state.packets }
  const events: NetworkEvent[] = []
  for (const packet of Object.values(state.packets)) {
    if (packet.status !== 'lost') continue
    const waitSinceLoss = packet.waitSinceLoss + dt
    if (waitSinceLoss >= ACK_TIMEOUT_S) {
      resends += 1
      packets[packet.id] = {
        ...packet,
        status: 'pending',
        location: { kind: 'tray' },
        resends: packet.resends + 1,
        waitSinceLoss: 0,
      }
      events.push({ type: 'resent', packetId: packet.id })
    } else {
      packets[packet.id] = { ...packet, waitSinceLoss }
    }
  }
  return { ...state, packets, resends, events }
}

/** Avança pacotes em trânsito conforme a `latency` do enlace; remonta mensagens completas. */
export function tickTransit(state: NetworkState, dt: number): NetworkState {
  if (state.status !== 'playing') return { ...state, events: [] }
  const packets = { ...state.packets }
  const linkLoad = { ...state.linkLoad }
  let rng = state.rng
  let scoring = state.scoring
  const events: NetworkEvent[] = []

  for (const packet of Object.values(state.packets)) {
    if (packet.status !== 'transit' || packet.location.kind !== 'edge') continue
    const link = findLink(state.config, packet.location.from, packet.location.to)
    if (!link) continue
    const progress = packet.location.progress + dt / Math.max(0.1, link.latency)
    if (progress < 1) {
      packets[packet.id] = { ...packet, location: { ...packet.location, progress } }
      continue
    }

    const key = linkKey(packet.location.from, packet.location.to)
    linkLoad[key] = Math.max(0, (linkLoad[key] ?? 1) - 1)
    const nextNode = packet.location.to
    const [lost, nextRng] = maybeDropPacket(rng, state.config.lossChance)
    rng = nextRng
    if (lost) {
      packets[packet.id] = {
        ...packet,
        status: 'lost',
        location: { kind: 'tray' },
        waitSinceLoss: 0,
      }
      events.push({ type: 'lost', packetId: packet.id })
      continue
    }

    if (nextNode === state.config.destination) {
      if (state.config.dns && !state.dnsCorrect) {
        packets[packet.id] = {
          ...packet,
          status: 'wrongAddress',
          location: { kind: 'node', id: nextNode },
        }
        scoring = breakCombo(scoring)
        events.push({ type: 'wrongAddress', packetId: packet.id })
        continue
      }
      packets[packet.id] = {
        ...packet,
        status: 'delivered',
        location: { kind: 'node', id: nextNode },
      }
      scoring = registerHit(scoring, 40, 10)
      events.push({ type: 'delivered', packetId: packet.id })
      continue
    }

    packets[packet.id] = { ...packet, status: 'pending', location: { kind: 'node', id: nextNode } }
    events.push({ type: 'arrived', packetId: packet.id, nodeId: nextNode })
  }

  let delivered = state.delivered
  let activeIndex = state.activeIndex
  while (activeIndex < state.messages.length) {
    const msg = state.messages[activeIndex]!
    const complete = msg.packetIds.every((id) => packets[id]!.status === 'delivered')
    if (!complete) break
    delivered += 1
    events.push({ type: 'messageAssembled', messageId: msg.id })
    activeIndex += 1
    const next = state.messages[activeIndex]
    if (next) {
      for (const id of next.packetIds) {
        packets[id] = { ...packets[id]!, status: 'pending', location: { kind: 'tray' } }
      }
    }
  }

  const elapsed = state.elapsed + dt
  let status: NetworkState['status'] = state.status
  if (delivered >= state.messages.length) {
    status = 'won'
    events.push({ type: 'won' })
  } else if (state.config.timed && state.config.duration > 0 && elapsed >= state.config.duration) {
    status = 'lost'
    events.push({ type: 'lostGame', reason: 'timeout' })
  }

  return {
    ...state,
    packets,
    linkLoad,
    rng,
    scoring,
    delivered,
    activeIndex,
    elapsed,
    status,
    events,
  }
}

/** Um passo do relógio da partida: reenvio por timeout e depois o trânsito dos pacotes. */
export function step(state: NetworkState, dt: number): NetworkState {
  if (state.status !== 'playing') return { ...state, events: [] }
  const resent = resendIfTimeout(state, dt)
  const ticked = tickTransit(resent, dt)
  return { ...ticked, events: [...resent.events, ...ticked.events] }
}
