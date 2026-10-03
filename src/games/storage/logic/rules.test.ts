import { describe, expect, it } from 'vitest'
import { PHASES, type StoragePhase } from '../phases'
import { computeOutcome } from './outcome'
import { allocate, applyOperation, createGame, defragment, free, seekCost } from './rules'

const tutorial = PHASES[0]!
const nivel1 = PHASES[1]!
const nivel2 = PHASES[2]!
const nivel3 = PHASES[3]!
const nivel4 = PHASES[4]!

// 10 operações-placebo: o suficiente para o teste nunca "vencer" por acidente
// (opIndex chegando ao fim de `operations`) enquanto só testa `allocate`/`free`
// ou a derrota por falta de espaço (que nunca avança `opIndex`).
const DUMMY_OPS = Array.from({ length: 10 }, (_, i) => ({
  kind: 'save' as const,
  fileId: `dummy${i}`,
  sizeBlocks: 1,
}))

function phaseWithBlocks(diskBlocks: number, reservedBlocks: readonly number[] = []): StoragePhase {
  return { ...tutorial, diskBlocks, reservedBlocks, operations: DUMMY_OPS }
}

describe('allocate', () => {
  it('primeiro-ajuste: usa o primeiro buraco contíguo grande o bastante', () => {
    const g = createGame(phaseWithBlocks(10))
    const { state, event } = allocate(g, 'A', 3)
    expect(event).toEqual({ type: 'allocated', fileId: 'A' })
    expect(state.files.A?.blocks).toEqual([0, 1, 2])
  })

  it('fragmenta quando não há um único buraco grande o bastante', () => {
    let g = createGame(phaseWithBlocks(10))
    g = allocate(g, 'A', 3).state // ocupa 0-2
    g = allocate(g, 'B', 4).state // ocupa 3-6
    g = free(g, 'A').state // libera 0-2, sobra 7-9 (3) + 0-2 (3): nenhum buraco >=5
    const { event, state } = allocate(g, 'C', 5)
    expect(event.type).toBe('fragmented')
    expect(state.files.C?.blocks.sort((a, b) => a - b)).toEqual([0, 1, 2, 7, 8])
    if (event.type === 'fragmented') {
      expect(event.chunks).toEqual([
        [0, 1, 2],
        [7, 8],
      ])
    }
  })

  it('sem espaço suficiente, devolve no-space e não altera o estado', () => {
    const g = createGame(phaseWithBlocks(4))
    const { state, event } = allocate(g, 'A', 5)
    expect(event).toEqual({ type: 'no-space', fileId: 'A' })
    expect(state).toBe(g)
  })
})

describe('free', () => {
  it('libera todos os blocos (inclusive fragmentados) e remove da tabela', () => {
    let g = createGame(phaseWithBlocks(10))
    g = allocate(g, 'A', 3).state
    g = allocate(g, 'B', 4).state
    g = free(g, 'A').state
    const { state } = free(g, 'B')
    expect(state.files.B).toBeUndefined()
    expect(state.disk.every((b) => b === null)).toBe(true)
    // os blocos livres podem ser reaproveitados por um allocate seguinte
    const after = allocate(state, 'C', 10)
    expect(after.event.type).toBe('allocated')
  })
})

describe('seekCost', () => {
  it('HD soma a distância entre blocos espalhados; SSD não varia com a posição', () => {
    const phase = { ...nivel3 }
    const spreadOut = [0, 10, 2]
    const contiguous = [0, 1, 2]
    const hdSpread = seekCost(spreadOut, 'hd', phase)
    const hdContiguous = seekCost(contiguous, 'hd', phase)
    expect(hdSpread).toBeGreaterThan(hdContiguous)

    const ssdSpread = seekCost(spreadOut, 'ssd', phase)
    const ssdContiguous = seekCost(contiguous, 'ssd', phase)
    expect(ssdSpread).toBe(ssdContiguous)
    expect(ssdSpread).toBe(phase.baseCostPerBlock * spreadOut.length)
  })
})

describe('defragment', () => {
  it('compacta os arquivos a partir do bloco 0, na ordem de criação, sem mudar tamanho/id', () => {
    let g = createGame(phaseWithBlocks(10))
    g = allocate(g, 'A', 3).state // 0-2
    g = allocate(g, 'B', 3).state // 3-5
    g = free(g, 'A').state // libera 0-2
    g = allocate(g, 'C', 2).state // ocupa primeiro buraco livre: 0-1
    const defragged = defragment(g)
    // ordem de criação ainda ativa: B, C
    expect(defragged.files.B?.blocks).toEqual([0, 1, 2])
    expect(defragged.files.C?.blocks).toEqual([3, 4])
    expect(defragged.files.B?.sizeBlocks).toBe(3)
    expect(defragged.files.C?.sizeBlocks).toBe(2)
    // nenhum arquivo ficou fragmentado
    for (const f of Object.values(defragged.files)) {
      const sorted = [...f.blocks].sort((a, b) => a - b)
      for (let i = 1; i < sorted.length; i++) expect(sorted[i]).toBe(sorted[i - 1]! + 1)
    }
  })

  it('mantém os blocos de sistema nas próprias posições', () => {
    let g = createGame(phaseWithBlocks(10, [0, 1]))
    g = allocate(g, 'A', 3).state
    const defragged = defragment(g)
    expect(defragged.disk[0]).toBe('__system__')
    expect(defragged.disk[1]).toBe('__system__')
  })
})

describe('applyOperation', () => {
  it('determinismo: a mesma sequência de escolhas de blocos produz o mesmo layout e tempo', () => {
    const run = () => {
      let g = createGame(nivel3)
      const choices: Record<string, number[] | undefined> = {}
      for (const op of nivel3.operations) {
        g = applyOperation(g, op, 'hd', choices[op.fileId])
      }
      return g
    }
    const a = run()
    const b = run()
    expect(a.disk).toEqual(b.disk)
    expect(a.totalTime).toBe(b.totalTime)
  })

  it('vence a fase 1 completando as 6 operações sem faltar espaço', () => {
    let g = createGame(nivel1)
    for (const op of nivel1.operations) g = applyOperation(g, op, 'hd')
    expect(g.status).toBe('won')
    expect(computeOutcome(g).won).toBe(true)
  })

  it('perde a fase 1 depois de 3 "sem espaço"', () => {
    let g = createGame(phaseWithBlocks(4))
    for (let i = 0; i < 3; i++) {
      g = applyOperation(g, { kind: 'save', fileId: `x${i}`, sizeBlocks: 5 }, 'hd')
    }
    expect(g.status).toBe('lost')
    expect(g.lostReason).toBe('space')
  })

  it('perde a fase 3 (HD) quando o tempo total passa do limite', () => {
    let g = createGame(nivel3)
    // Escolhas de bloco deliberadamente ruins (saltos grandes) para o primeiro pedido:
    // custo de deslocamento alto no HD, o suficiente para passar do limite da fase.
    const first = nivel3.operations[0]!
    g = applyOperation(g, first, 'hd', [0, 23, 1, 22])
    expect(g.status).toBe('lost')
    expect(g.lostReason).toBe('time')
  })

  it('fase 4: exige desfragmentar ao menos 1 vez para vencer dentro do tempo', () => {
    const playWithDefrag = (useDefrag: boolean) => {
      let g = createGame(nivel4)
      for (const op of nivel4.operations) {
        if (useDefrag && op.fileId === 'D' && op.kind === 'save') g = defragment(g)
        g = applyOperation(g, op, 'hd')
      }
      return g
    }
    const withDefrag = playWithDefrag(true)
    const withoutDefrag = playWithDefrag(false)
    expect(withDefrag.status).toBe('won')
    expect(withoutDefrag.status).toBe('lost')
  })
})

describe('fase 2 (fragmentação)', () => {
  it('força ao menos 2 fragmentações e ainda assim vence', () => {
    let g = createGame(nivel2)
    let fragmentations = 0
    for (const op of nivel2.operations) {
      g = applyOperation(g, op, 'hd')
      if (g.events.some((e) => e.type === 'fragmented')) fragmentations++
    }
    expect(fragmentations).toBeGreaterThanOrEqual(2)
    expect(g.status).toBe('won')
  })
})

describe('computeOutcome', () => {
  it('quem vence leva ao menos 1 estrela', () => {
    let g = createGame(nivel1)
    for (const op of nivel1.operations) g = applyOperation(g, op, 'hd')
    const o = computeOutcome(g)
    expect(o.won).toBe(true)
    expect(o.stars).toBeGreaterThanOrEqual(1)
  })

  it('quem perde não leva estrela', () => {
    let g = createGame(phaseWithBlocks(4))
    for (let i = 0; i < 3; i++) {
      g = applyOperation(g, { kind: 'save', fileId: `x${i}`, sizeBlocks: 5 }, 'hd')
    }
    expect(computeOutcome(g).stars).toBe(0)
  })
})
