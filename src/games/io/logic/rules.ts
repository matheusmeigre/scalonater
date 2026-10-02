/**
 * Regras da estação Interrupções e E/S como funções puras:
 * (estado, entrada) → novo estado. Cada função trabalha numa cópia
 * ("rascunho") do estado e devolve os eventos que gerou, nos mesmos moldes
 * de `games/cores/logic/rules.ts`.
 */
import { countdown } from '@/engine/loop/timer'
import { createRng, roller } from '@/engine/random'
import { addPoints, breakCombo, emptyCombo, registerHit } from '@/engine/scoring/scoring'
import { isUrgent, urgentPatienceSeconds, type IoConfig, type IoState } from './model'
import type { IoDeviceId } from '../phases'

export const RULES = {
  /** Progresso da tarefa principal por segundo rodando (sem pausa). */
  taskRate: 1 / 30,
  attendPoints: 20,
  attendComboStep: 5,
  /** F3: tamanho do passo de progresso por acerto. */
  pollingChunk: 1 / 8,
  pollingReadyWindow: 2.2,
  pollingReadyEvery: 3.2,
  /** F4: progresso automático da transferência DMA por segundo. */
  dmaRate: 1 / 18,
  dmaManualBump: 0.05,
  dmaManualTimePenalty: 4,
} as const

// ---------------------------------------------------------------------------
// criação

export function createGame(config: IoConfig, seed: number): IoState {
  return {
    config,
    mainProgress: 0,
    contextStack: [],
    ringQueue: [],
    nextRingId: 1,
    ringTimer:
      config.ringEvery > 0 && config.ringEvery < 50
        ? config.ringEvery * 0.6
        : config.ringEvery === 0
          ? 1
          : 999,
    attendedCount: 0,
    hearts: config.hearts,
    pollingProgress: 0,
    interruptProgress: 0,
    pollingReady: false,
    pollingReadyTimer: RULES.pollingReadyEvery,
    energyWasted: 0,
    dmaStarted: false,
    dmaProgress: 0,
    dmaDone: false,
    dmaCollected: false,
    dmaManualTouches: 0,
    timeLeft: config.duration,
    elapsed: 0,
    scoring: emptyCombo(),
    rng: createRng(seed),
    status: 'playing',
    lostReason: null,
    events: [],
  }
}

function draft(s: IoState): IoState {
  return {
    ...s,
    contextStack: [...s.contextStack],
    ringQueue: s.ringQueue.map((r) => ({ ...r })),
    events: [],
  }
}

/**
 * Chama uma ação pura que também passa por `draft` (e por isso zeraria
 * `events`) sem perder os eventos já acumulados no passo atual.
 */
function chain<A extends unknown[]>(
  d: IoState,
  fn: (s: IoState, ...a: A) => IoState,
  ...args: A
): IoState {
  const before = d.events
  const next = fn(d, ...args)
  return next === d ? d : { ...next, events: [...before, ...next.events] }
}

function lose(d: IoState, reason: 'queue' | 'deadline' | 'time') {
  if (d.status !== 'playing') return
  d.status = 'lost'
  d.lostReason = reason
  d.events.push({ type: 'lost', reason })
}

function maybeWin(d: IoState) {
  if (d.status !== 'playing') return
  if (d.config.compareMode) {
    if (d.pollingProgress >= 1) {
      d.status = 'won'
      d.events.push({ type: 'won' })
    }
    return
  }
  if (d.config.dma) {
    if (d.dmaCollected) {
      d.status = 'won'
      d.events.push({ type: 'won' })
    }
    return
  }
  // tutorial e F1/F2: a meta é só checada no fim do tempo (ou no tutorial, por contagem).
  if (d.config.duration === 0 && !d.config.timed) {
    if (d.attendedCount >= d.config.goal) {
      d.status = 'won'
      d.events.push({ type: 'won' })
    }
  }
}

// ---------------------------------------------------------------------------
// ações do jogador: laço principal (tutorial, F1, F2)

/** Uma campainha nova entra na fila. Determinístico: não usa `rng` por fora. */
export function ringDevice(s: IoState, device: IoDeviceId): IoState {
  if (s.status !== 'playing') return s
  const d = draft(s)
  d.ringQueue.push({ id: d.nextRingId++, device, patience: 1 })
  d.events.push({ type: 'ring', device })
  return d
}

/**
 * "Guardar e atender": empilha a ficha de contexto (progresso atual) e pausa
 * a tarefa principal. Sem efeito se já há contexto guardado ou a fila está
 * vazia (nada para atender ainda).
 */
export function pushContext(s: IoState): IoState {
  if (s.status !== 'playing' || s.contextStack.length > 0 || s.ringQueue.length === 0) return s
  const d = draft(s)
  d.contextStack.push(d.mainProgress)
  d.events.push({ type: 'contextSaved' })
  return d
}

/** Retoma a tarefa do ponto salvo no topo da pilha. */
export function popContext(s: IoState): IoState {
  if (s.status !== 'playing' || s.contextStack.length === 0) return s
  const d = draft(s)
  const saved = d.contextStack.pop()!
  d.mainProgress = saved
  d.events.push({ type: 'resumed' })
  return d
}

/**
 * Jogador toca no dispositivo para atendê-lo. Sem contexto guardado, a
 * tarefa em andamento perde o progresso e recomeça do zero
 * (`contextLost`, nunca "quase zera" — sempre some por completo). Com
 * contexto guardado, a campainha é só removida (`attended`); quando a fila
 * de campainhas fica vazia, o contexto volta sozinho (`popContext`).
 */
export function attendDevice(s: IoState, device: IoDeviceId): IoState {
  if (s.status !== 'playing') return s
  const idx = s.ringQueue.findIndex((r) => r.device === device)
  if (idx === -1) return s
  let d = draft(s)
  d.ringQueue.splice(idx, 1)
  const guarded = d.contextStack.length > 0
  if (!guarded) {
    d.mainProgress = 0
    d.scoring = breakCombo(d.scoring)
    d.events.push({ type: 'contextLost' })
  } else {
    d.attendedCount += 1
    d.scoring = registerHit(d.scoring, RULES.attendPoints, RULES.attendComboStep)
    d.events.push({ type: 'attended', device })
  }
  if (guarded && d.ringQueue.length === 0) d = chain(d, popContext)
  maybeWin(d)
  return d
}

/** F2: a paciência das campainhas urgentes (teclado, mouse) esvazia com o tempo. */
export function expirePatience(s: IoState, dt: number): IoState {
  if (s.status !== 'playing' || !s.config.priority || dt <= 0) return s
  const d = draft(s)
  const keep: typeof d.ringQueue = []
  for (const r of d.ringQueue) {
    if (!isUrgent(r.device)) {
      keep.push(r)
      continue
    }
    const patience = r.patience - dt / urgentPatienceSeconds(r.device)
    if (patience <= 0) {
      d.hearts -= 1
      d.scoring = breakCombo(d.scoring)
      d.events.push({ type: 'missedDeadline', device: r.device })
    } else {
      keep.push({ ...r, patience })
    }
  }
  d.ringQueue = keep
  if (d.hearts <= 0) lose(d, 'deadline')
  return d
}

// ---------------------------------------------------------------------------
// F3: perguntar toda hora × campainha

/** Avança os relógios da comparação: quando a janela abre, o lado por interrupção reage sozinho. */
export function tickPolling(s: IoState, dt: number): IoState {
  if (s.status !== 'playing' || !s.config.compareMode || dt <= 0) return s
  const d = draft(s)
  d.pollingReadyTimer -= dt
  if (!d.pollingReady && d.pollingReadyTimer <= 0) {
    d.pollingReady = true
    d.pollingReadyTimer = RULES.pollingReadyWindow
    d.interruptProgress = Math.min(1, d.interruptProgress + RULES.pollingChunk)
    d.events.push({ type: 'interruptTick' })
  } else if (d.pollingReady && d.pollingReadyTimer <= 0) {
    d.pollingReady = false
    d.pollingReadyTimer = RULES.pollingReadyEvery
  }
  return d
}

/** Jogador toca em "verificar": sempre custa energia; só avança se o dado estava pronto. */
export function checkNow(s: IoState): IoState {
  if (s.status !== 'playing' || !s.config.compareMode) return s
  const d = draft(s)
  d.energyWasted += 1
  if (d.pollingReady) {
    d.pollingProgress = Math.min(1, d.pollingProgress + RULES.pollingChunk)
    d.pollingReady = false
    d.pollingReadyTimer = RULES.pollingReadyEvery
    d.events.push({ type: 'checked', hit: true })
  } else {
    d.events.push({ type: 'checked', hit: false })
  }
  maybeWin(d)
  return d
}

// ---------------------------------------------------------------------------
// F4: DMA

export function startDma(s: IoState): IoState {
  if (s.status !== 'playing' || !s.config.dma || s.dmaStarted) return s
  const d = draft(s)
  d.dmaStarted = true
  d.events.push({ type: 'dmaStarted' })
  return d
}

/** Atender um pedaço manualmente: custa tempo, mas não é preciso fazer isso no DMA. */
export function attendDmaChunk(s: IoState): IoState {
  if (s.status !== 'playing' || !s.config.dma || !s.dmaStarted || s.dmaDone) return s
  const d = draft(s)
  d.dmaManualTouches += 1
  d.dmaProgress = Math.min(1, d.dmaProgress + RULES.dmaManualBump)
  d.timeLeft = Math.max(0, d.timeLeft - RULES.dmaManualTimePenalty)
  d.events.push({ type: 'dmaManualTouch' })
  if (d.dmaProgress >= 1) {
    d.dmaDone = true
    d.events.push({ type: 'dmaDone' })
  }
  return d
}

export function collectDma(s: IoState): IoState {
  if (s.status !== 'playing' || !s.config.dma || !s.dmaDone || s.dmaCollected) return s
  const d = draft(s)
  d.dmaCollected = true
  d.scoring = addPoints(d.scoring, 100)
  d.events.push({ type: 'dmaCollected' })
  maybeWin(d)
  return d
}

export function tickDma(s: IoState, dt: number): IoState {
  if (s.status !== 'playing' || !s.config.dma || dt <= 0 || !s.dmaStarted || s.dmaDone) return s
  const d = draft(s)
  d.dmaProgress = Math.min(1, d.dmaProgress + RULES.dmaRate * dt)
  if (d.dmaProgress >= 1) {
    d.dmaDone = true
    d.events.push({ type: 'dmaDone' })
  }
  return d
}

// ---------------------------------------------------------------------------
// passo de simulação

export function step(s: IoState, dt: number): IoState {
  if (s.status !== 'playing' || dt <= 0) return s
  let d = draft(s)
  const roll = roller(d)
  const { config } = d
  d.elapsed += dt

  if (config.timed) {
    const c = countdown(d.timeLeft, dt)
    d.timeLeft = c.remaining
    if (c.crossedSecond !== null && c.crossedSecond > 0 && c.crossedSecond <= 10)
      d.events.push({ type: 'tick', second: c.crossedSecond })
  }

  if (config.compareMode) {
    d = chain(d, tickPolling, dt)
  } else if (config.dma) {
    d = chain(d, tickDma, dt)
  } else {
    // tarefa principal: só anda quando não há contexto guardado.
    if (d.contextStack.length === 0)
      d.mainProgress = Math.min(1, d.mainProgress + RULES.taskRate * dt)

    // novas campainhas chegam sozinhas (jitter, como no Núcleos).
    if (config.ringEvery > 0 && config.ringEvery < 50) {
      d.ringTimer -= dt
      if (d.ringTimer <= 0) {
        d.ringTimer = config.ringEvery * (0.7 + roll() * 0.6)
        const device = config.devices[Math.floor(roll() * config.devices.length)]!
        d = chain(d, ringDevice, device)
      }
    } else if (config.ringEvery === 0) {
      // tutorial: nada de sorteio, só o dispositivo único tocando de novo
      // depois que a ficha anterior voltou, até a meta de interrupções.
      const idle = d.ringQueue.length === 0 && d.contextStack.length === 0
      if (idle && d.attendedCount < config.goal) {
        d.ringTimer -= dt
        if (d.ringTimer <= 0) {
          d.ringTimer = 1.2
          d = chain(d, ringDevice, config.devices[0]!)
        }
      }
    }

    d = chain(d, expirePatience, dt)

    if (d.status === 'playing' && d.ringQueue.length > config.queueMax) {
      d.ringQueue.shift()
      d.hearts -= 1
      d.scoring = breakCombo(d.scoring)
      d.events.push({ type: 'queueOverflow' })
      if (d.hearts <= 0) lose(d, 'queue')
    }
  }

  // fim de partida por tempo (F1/F2/F4, quando a fase tem relógio).
  if (d.status === 'playing' && config.timed && d.timeLeft <= 0) {
    const reachedGoal = config.dma ? d.dmaCollected : d.mainProgress >= config.goal / 100
    if (reachedGoal) {
      d.status = 'won'
      d.events.push({ type: 'won' })
    } else {
      lose(d, 'time')
    }
  }

  return d
}
