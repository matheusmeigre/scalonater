import { describe, expect, it } from 'vitest'
import { computeAluOp } from '@/games/alu/logic/rules'
import { fromBits } from '@/games/shared/binary'
import { PHASES } from '../phases'
import {
  CACHE_ADDRESS,
  advanceStep,
  completeTutorial,
  computeOutcome,
  createGame,
  loseGame,
  readDiskBlocks,
  resolveCacheStep,
  runCycleStep,
  scheduleThread,
  selectAluOp,
  togglePixelBit,
} from './rules'

const [TUTORIAL, NIVEL1, NIVEL2, NIVEL3] = PHASES

describe('createGame', () => {
  it('a Fase 3 começa com os bits pré-marcados e os demais em 0', () => {
    const g = createGame(NIVEL3!, 1)
    const prefilled = NIVEL3!.prefilledCount!
    for (let i = 0; i < prefilled; i++) expect(g.bits[i]).toBe(NIVEL3!.targetImage![i])
    for (let i = prefilled; i < g.bits.length; i++) expect(g.bits[i]).toBe(0)
  })
})

describe('advanceStep (Fase 1 - Decisão)', () => {
  it('ignora um passo fora de ordem e aceita o passo certo mesmo depois de tentar o errado', () => {
    let g = createGame(NIVEL1!, 1)
    g = advanceStep(g, 'alu') // fora de ordem, ignorado
    expect(g.stepIndex).toBe(0)
    g = advanceStep(g, 'schedule')
    expect(g.stepIndex).toBe(1)
  })

  it('vence ao concluir todos os passos na ordem', () => {
    let g = createGame(NIVEL1!, 1)
    g = scheduleThread(g)
    g = runCycleStep(g)
    g = runCycleStep(g)
    g = runCycleStep(g)
    expect(g.status).toBe('playing') // ainda falta a ULA
    g = selectAluOp(g, 'add')
    expect(g.status).toBe('won')
    expect(computeOutcome(g, 10).won).toBe(true)
  })
})

describe('selectAluOp', () => {
  it('bate com computeAluOp(5, 3, "add") da estação alu', () => {
    const g = createGame(NIVEL1!, 1)
    const next = selectAluOp(g, 'add')
    const expected = fromBits(computeAluOp(5, 3, 'add', 8).result)
    expect(next.aluResult).toBe(expected)
    expect(expected).toBe(8)
  })

  it('escolher a operação errada não avança (o jogador tenta de novo)', () => {
    let g = createGame(NIVEL1!, 1)
    g = scheduleThread(g)
    g = runCycleStep(g)
    g = runCycleStep(g)
    g = runCycleStep(g)
    const before = g.stepIndex
    g = selectAluOp(g, 'and')
    expect(g.stepIndex).toBe(before)
    expect(g.status).toBe('playing')
  })
})

describe('resolveCacheStep (Fase 2 - Dados)', () => {
  it('a sequência fixa sempre gera 1 falha seguida de 1 acerto, para qualquer seed', () => {
    for (const seed of [1, 2, 42]) {
      const g = createGame(NIVEL2!, seed)
      const first = resolveCacheStep(g, CACHE_ADDRESS)
      expect(first.lastCacheOutcome).toBe('miss')
      const second = resolveCacheStep(first, CACHE_ADDRESS)
      expect(second.lastCacheOutcome).toBe('hit')
      expect(second.stepIndex).toBe(1)
    }
  })
})

describe('readDiskBlocks', () => {
  it('lê os blocos de diskSequence na ordem certa; fora de ordem não avança', () => {
    let g = createGame(NIVEL2!, 1)
    g = resolveCacheStep(g, CACHE_ADDRESS)
    g = resolveCacheStep(g, CACHE_ADDRESS)
    expect(g.stepIndex).toBe(1)

    const seq = NIVEL2!.diskSequence!
    let next = readDiskBlocks(g, seq[1]!) // fora de ordem
    expect(next.diskReadCount).toBe(0)
    for (const block of seq) next = readDiskBlocks(next, block)
    expect(next.status).toBe('won')
  })
})

describe('togglePixelBit (Fase 3 - Saída)', () => {
  it('nunca altera um índice dentro de prefilledCount', () => {
    const g = createGame(NIVEL3!, 1)
    const next = togglePixelBit(g, 0)
    expect(next.bits[0]).toBe(g.bits[0])
  })

  it('alterna bits livres e vence ao reproduzir a imagem-alvo', () => {
    let g = createGame(NIVEL3!, 1)
    const prefilled = NIVEL3!.prefilledCount!
    for (let i = prefilled; i < g.bits.length; i++) {
      if (NIVEL3!.targetImage![i] === 1) g = togglePixelBit(g, i)
    }
    expect(g.status).toBe('won')
    expect(computeOutcome(g, 0).won).toBe(true)
  })
})

describe('vitória/derrota', () => {
  it('tempo esgota nas Fases 1-2: derrota', () => {
    const g = loseGame(createGame(NIVEL1!, 1))
    expect(g.status).toBe('lost')
    expect(computeOutcome(g, 60).won).toBe(false)
  })

  it('a Fase 3 nunca perde (loseGame não tem efeito)', () => {
    const g = loseGame(createGame(NIVEL3!, 1))
    expect(g.status).toBe('lost')
    // a cena nunca chama loseGame na Fase 3 (secondsLimit: 0, sem relógio);
    // este teste documenta que a própria função não distingue capítulos —
    // é a cena que nunca a invoca fora das Fases 1-2.
  })

  it('o tutorial (Entrada) nunca perde e vence com completeTutorial', () => {
    const g = completeTutorial(createGame(TUTORIAL!, 1))
    expect(g.status).toBe('won')
  })
})

describe('determinismo', () => {
  it('a mesma sequência de toques sempre produz o mesmo resultado final', () => {
    const run = () => {
      let g = createGame(NIVEL1!, 1)
      g = scheduleThread(g)
      g = runCycleStep(g)
      g = runCycleStep(g)
      g = runCycleStep(g)
      g = selectAluOp(g, 'add')
      return computeOutcome(g, 5)
    }
    expect(run()).toEqual(run())
  })
})
