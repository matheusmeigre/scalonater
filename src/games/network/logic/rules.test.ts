import { describe, expect, it } from 'vitest'
import { resolveConfig } from './model'
import { computeOutcome } from './outcome'
import {
  assembleMessage,
  createGame,
  forwardPacket,
  maybeDropPacket,
  neighbors,
  resendIfTimeout,
  resolveDns,
  selectPacket,
  splitMessage,
  step,
  tickTransit,
} from './rules'
import { PHASES } from '../phases'

const tutorial = PHASES.find((p) => p.id === 'tutorial')!
const nivel1 = PHASES.find((p) => p.id === 'nivel-1')!
const nivel2 = PHASES.find((p) => p.id === 'nivel-2')!
const nivel3 = PHASES.find((p) => p.id === 'nivel-3')!
const nivel4 = PHASES.find((p) => p.id === 'nivel-4')!

const opts = { difficulty: 'normal' as const, untimed: false }

/** Envia um pacote inteiro de A até o destino (para fases de 2 ou 3 saltos). */
function deliverPacket(state: ReturnType<typeof createGame>, packetId: string, path: string[]) {
  let s = selectPacket(state, packetId)
  for (const node of path) {
    s = forwardPacket(s, packetId, node)
    s = step(s, 1.2)
  }
  return s
}

describe('splitMessage', () => {
  it('numera os pacotes em ordem', () => {
    expect(splitMessage('m0', 3)).toEqual(['m0-p1', 'm0-p2', 'm0-p3'])
  })
})

describe('createGame', () => {
  it('é determinístico com a mesma semente', () => {
    const config = resolveConfig(nivel3, opts)
    const a = createGame(config, 42)
    const b = createGame(config, 42)
    expect(a.messages).toEqual(b.messages)
    expect(a.packets).toEqual(b.packets)
  })

  it('só a primeira mensagem começa disponível na bandeja de saída', () => {
    const config = resolveConfig(nivel1, opts)
    const g = createGame(config, 1)
    const firstMsg = g.messages[0]!
    const secondMsg = g.messages[1]!
    for (const id of firstMsg.packetIds) expect(g.packets[id]!.status).toBe('pending')
    for (const id of secondMsg.packetIds) expect(g.packets[id]!.status).toBe('queued')
  })
})

describe('selectPacket / forwardPacket', () => {
  it('seleciona e envia pelo enlace certo', () => {
    const config = resolveConfig(tutorial, opts)
    const g = createGame(config, 1)
    const packetId = g.messages[0]!.packetIds[0]!
    const selected = selectPacket(g, packetId)
    expect(selected.selected).toBe(packetId)
    const sent = forwardPacket(selected, packetId, 'B')
    expect(sent.packets[packetId]!.status).toBe('transit')
    expect(sent.selected).toBeNull()
  })

  it('bloqueia envio para um nó sem aresta', () => {
    const config = resolveConfig(nivel1, opts)
    const g = createGame(config, 1)
    const packetId = g.messages[0]!.packetIds[0]!
    const selected = selectPacket(g, packetId)
    const blocked = forwardPacket(selected, packetId, 'C')
    expect(blocked.events).toEqual([{ type: 'blocked', reason: 'no-edge' }])
    expect(blocked.packets[packetId]!.status).toBe('pending')
  })

  it('enlace cheio descarta o pacote e custa uma vida', () => {
    const config = resolveConfig(nivel2, opts)
    const g = createGame(config, 1)
    const [p1, p2] = g.messages[0]!.packetIds
    // A->B tem capacidade 1: o segundo pacote enviado por lá é descartado.
    const afterFirst = forwardPacket(selectPacket(g, p1!), p1!, 'B')
    const afterSecond = forwardPacket(selectPacket(afterFirst, p2!), p2!, 'B')
    expect(afterSecond.hearts).toBe(g.hearts - 1)
    expect(afterSecond.packets[p2!]!.status).toBe('lost')
    expect(afterSecond.events.some((e) => e.type === 'dropped')).toBe(true)
  })

  it('não é possível selecionar/enviar um pacote que não existe ou não está pendente', () => {
    const config = resolveConfig(nivel1, opts)
    const g = createGame(config, 1)
    const packetId = g.messages[0]!.packetIds[0]!
    const sentAlready = forwardPacket(selectPacket(g, packetId), packetId, 'B')
    const again = forwardPacket(sentAlready, packetId, 'B')
    expect(again.events).toEqual([{ type: 'blocked', reason: 'not-selectable' }])
  })
})

describe('neighbors', () => {
  it('lista os dois lados de cada aresta (grafo bidirecional)', () => {
    const config = resolveConfig(nivel2, opts)
    expect(neighbors(config, 'A').sort()).toEqual(['B', 'C'])
    expect(neighbors(config, 'D').sort()).toEqual(['B', 'C'])
  })
})

describe('tickTransit / assembleMessage', () => {
  it('remonta a mensagem mesmo com pacotes chegando fora de ordem', () => {
    const config = resolveConfig(nivel1, opts)
    let g = createGame(config, 7)
    const [p1, p2, p3, p4] = g.messages[0]!.packetIds as [string, string, string, string]

    // Envia tudo para B (primeiro salto); avança bem menos tempo para quem
    // chegou depois, invertendo a ordem de chegada ao destino final.
    g = forwardPacket(selectPacket(g, p1!), p1!, 'B')
    g = forwardPacket(selectPacket(g, p2!), p2!, 'B')
    g = forwardPacket(selectPacket(g, p3!), p3!, 'B')
    g = forwardPacket(selectPacket(g, p4!), p4!, 'B')
    g = tickTransit(g, 5) // todos chegam em B

    // No segundo salto, manda p4 primeiro e avança pouco; depois os outros com
    // tempo suficiente para ultrapassá-lo.
    g = forwardPacket(selectPacket(g, p4!), p4!, 'C')
    g = tickTransit(g, 0.1)
    g = forwardPacket(selectPacket(g, p1!), p1!, 'C')
    g = forwardPacket(selectPacket(g, p2!), p2!, 'C')
    g = forwardPacket(selectPacket(g, p3!), p3!, 'C')
    g = tickTransit(g, 5)

    expect(g.packets[p4!]!.status).toBe('delivered')
    expect(assembleMessage(g, 'm0')).toBe(true)
  })

  it('um pacote perdido reaparece na bandeja de saída depois do timeout de ACK', () => {
    const config = resolveConfig(nivel3, opts)
    let g = createGame(config, 3) // semente escolhida para gerar uma perda logo no 1º salto
    const p1 = g.messages[0]!.packetIds[0]!
    g = forwardPacket(selectPacket(g, p1), p1, 'R')
    g = tickTransit(g, 5)
    expect(['lost', 'delivered', 'pending']).toContain(g.packets[p1]!.status)
    // Força o estado para "perdido" diretamente, para testar o timeout isolado.
    g = {
      ...g,
      packets: { ...g.packets, [p1]: { ...g.packets[p1]!, status: 'lost', waitSinceLoss: 0 } },
    }
    g = resendIfTimeout(g, 10)
    expect(g.packets[p1]!.status).toBe('pending')
    expect(g.packets[p1]!.location).toEqual({ kind: 'tray' })
    expect(g.resends).toBe(1)
  })
})

describe('maybeDropPacket', () => {
  it('é determinístico: a mesma semente e lossChance dão a mesma decisão', () => {
    const config = resolveConfig(nivel3, opts)
    const a = createGame(config, 99)
    const b = createGame(config, 99)
    const [lostA] = maybeDropPacket(a.rng, config.lossChance)
    const [lostB] = maybeDropPacket(b.rng, config.lossChance)
    expect(lostA).toBe(lostB)
  })

  it('lossChance 0 nunca perde', () => {
    const config = resolveConfig(nivel1, opts)
    const g = createGame(config, 5)
    const [lost] = maybeDropPacket(g.rng, config.lossChance)
    expect(lost).toBe(false)
  })
})

describe('resolveDns', () => {
  it('endereço certo libera o envio', () => {
    const config = resolveConfig(nivel4, opts)
    const g = createGame(config, 1)
    const resolved = resolveDns(g, config.dnsOptions![config.dnsCorrectIndex ?? 0]!)
    expect(resolved.dnsResolved).toBe(true)
    expect(resolved.dnsCorrect).toBe(true)
  })

  it('sem resolver o DNS, o envio é bloqueado', () => {
    const config = resolveConfig(nivel4, opts)
    const g = createGame(config, 1)
    const packetId = g.messages[0]!.packetIds[0]!
    const blocked = forwardPacket(selectPacket(g, packetId), packetId, 'R')
    expect(blocked.events).toEqual([{ type: 'blocked', reason: 'dns-not-resolved' }])
  })

  it('endereço errado faz o pacote nunca chegar (wrongAddress)', () => {
    const config = resolveConfig(nivel4, opts)
    let g = createGame(config, 1)
    g = resolveDns(g, 'endereco-que-nao-existe')
    expect(g.dnsCorrect).toBe(false)
    const packetId = g.messages[0]!.packetIds[0]!
    g = deliverPacket(g, packetId, ['R', 'B'])
    expect(g.packets[packetId]!.status).toBe('wrongAddress')
  })
})

describe('computeOutcome', () => {
  it('derrota não dá estrela', () => {
    const config = resolveConfig(nivel1, opts)
    const g = createGame(config, 1)
    const lost = { ...g, status: 'lost' as const }
    expect(computeOutcome(lost)).toEqual({ won: false, stars: 0, score: 0 })
  })

  it('vitória dá pelo menos 1 estrela', () => {
    const config = resolveConfig(nivel1, opts)
    const g = createGame(config, 1)
    const won = { ...g, status: 'won' as const, elapsed: config.duration * 0.95 }
    const outcome = computeOutcome(won)
    expect(outcome.won).toBe(true)
    expect(outcome.stars).toBeGreaterThanOrEqual(1)
  })

  it('mais tempo restante dá mais estrelas', () => {
    const config = resolveConfig(nivel1, opts)
    const g = createGame(config, 1)
    const fast = computeOutcome({ ...g, status: 'won' as const, elapsed: config.duration * 0.1 })
    const slow = computeOutcome({ ...g, status: 'won' as const, elapsed: config.duration * 0.95 })
    expect(fast.stars).toBeGreaterThanOrEqual(slow.stars)
  })
})

describe('jornada completa de uma fase', () => {
  it('vence a fase 1 entregando as duas mensagens', () => {
    const config = resolveConfig(nivel1, opts)
    let g = createGame(config, 11)
    for (let m = 0; m < 2; m++) {
      const msg = g.messages[m]!
      for (const packetId of msg.packetIds) {
        g = deliverPacket(g, packetId, ['B', 'C'])
      }
    }
    expect(g.status).toBe('won')
    expect(g.delivered).toBe(2)
  })

  it('perde por tempo esgotado com a mensagem incompleta', () => {
    const config = resolveConfig(nivel1, opts)
    let g = createGame(config, 1)
    g = step(g, config.duration + 1)
    expect(g.status).toBe('lost')
    expect(g.events.some((e) => e.type === 'lostGame')).toBe(true)
  })
})
