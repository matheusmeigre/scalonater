/**
 * Regras do Núcleos como funções puras: (estado, entrada) → novo estado.
 * Cada função trabalha numa cópia ("rascunho") e devolve os eventos que gerou,
 * para a cena tocar sons, mudar a fala do Kernel e avançar o tutorial.
 */
import { createRng, roller } from '@/engine/random'
import { addPoints, breakCombo, emptyCombo, registerHit } from '@/engine/scoring/scoring'
import { countdown } from '@/engine/loop/timer'
import {
  APP_TASKS,
  type AppId,
  type CoresConfig,
  type CoresState,
  type PlaceHow,
  type Slot,
  type Thread,
} from './model'

// Constantes do jogo (herdadas do protótipo, já testadas com jogadores).
export const RULES = {
  quickPlaceSeconds: 3,
  quickPlacePoints: 25,
  slowPlacePoints: 10,
  hotCachePoints: 40,
  donePoints: 100,
  comboStepPoints: 25,
  idleWarningSeconds: 3,
  smtSpeed: 0.6,
  hotCacheSpeed: 1.3,
  ioWaitSeconds: 3.5,
  ioMinOffCore: 1.5,
  lowPatience: 0.35,
  patienceRecoverPerSecond: 0.5,
  /** Segundos de paciência a 100% de dreno: Render aguenta mais. */
  patienceSeconds: { render: 14, other: 9 },
  tickFromSecond: 10,
} as const

// ---------------------------------------------------------------------------
// criação

export function createGame(config: CoresConfig, seed: number): CoresState {
  const s: CoresState = {
    config,
    threads: {},
    queue: [],
    io: [],
    slots: [],
    selected: null,
    timeLeft: config.duration,
    elapsed: 0,
    done: 0,
    hearts: config.hearts,
    scoring: emptyCombo(),
    idleTimer: 0,
    busyAcc: 0,
    timeAcc: 0,
    spawnTimer: 0.3,
    nextId: 1,
    rng: createRng(seed),
    status: 'playing',
    lostReason: null,
    events: [],
  }
  for (let c = 0; c < config.cores; c++)
    for (let i = 0; i < config.slotsPerCore; i++)
      s.slots.push({ core: c, index: i, threadId: null, since: 0 })
  for (let n = 0; n < config.initialThreads; n++) spawn(s)
  s.events = []
  return s
}

function draft(s: CoresState): CoresState {
  const threads: Record<number, Thread> = {}
  for (const id of [...s.queue, ...s.io]) threads[id] = { ...s.threads[id]! }
  for (const sl of s.slots)
    if (sl.threadId !== null) threads[sl.threadId] = { ...s.threads[sl.threadId]! }
  return {
    ...s,
    threads,
    queue: [...s.queue],
    io: [...s.io],
    slots: s.slots.map((x) => ({ ...x })),
    events: [],
  }
}

function spawn(d: CoresState) {
  const roll = roller(d)
  const { config } = d
  let apps: AppId[] = ['game', 'browser', 'music']
  if (config.renderChance > 0 && roll() < config.renderChance) apps = ['render']
  const app = apps[Math.floor(roll() * apps.length)]!
  const render = app === 'render'
  const t: Thread = {
    id: d.nextId++,
    app,
    task: Math.floor(roll() * APP_TASKS[app]),
    work: render ? 9 + roll() * 4 : 2.5 + roll() * 2.5,
    progress: 0,
    patience: 1,
    lastCore: -1,
    wait: 0,
    blockAt: config.io && !render && roll() < config.blockChance ? 0.3 + roll() * 0.4 : null,
    ioTimer: 0,
    blocked: false,
    where: 'queue',
  }
  d.threads[t.id] = t
  d.queue.push(t.id)
  d.events.push({ type: 'spawn' })
}

// ---------------------------------------------------------------------------
// consultas

export const coreLoad = (s: CoresState, core: number) =>
  s.slots.filter((x) => x.core === core && x.threadId !== null).length

export const threadInSlot = (s: CoresState, slot: number): Thread | null => {
  const id = s.slots[slot]?.threadId
  return id == null ? null : (s.threads[id] ?? null)
}

/** O núcleo está parado: tem thread travada esperando dados ocupando espaço. */
export const coreStalled = (s: CoresState, core: number) =>
  s.slots.some((x) => x.core === core && x.threadId !== null && s.threads[x.threadId]?.blocked)

/** Velocidade atual de uma thread rodando no espaço. */
export function slotSpeed(s: CoresState, slot: Slot): number {
  const t = slot.threadId === null ? null : s.threads[slot.threadId]
  if (!t || t.blocked) return 0
  let v = 1
  if (s.config.slotsPerCore > 1) {
    const active = s.slots.filter(
      (x) => x.core === slot.core && x.threadId !== null && !s.threads[x.threadId]?.blocked,
    ).length
    if (active >= 2) v *= RULES.smtSpeed
  }
  if (s.config.affinity && t.lastCore === slot.core) v *= RULES.hotCacheSpeed
  return v
}

/** Thread na fila com cache quente esperando por este núcleo. */
export const coreHasHotThread = (s: CoresState, core: number) =>
  s.config.affinity && s.queue.some((id) => s.threads[id]?.lastCore === core)

export const cpuUsage = (s: CoresState) => (s.timeAcc > 0 ? s.busyAcc / s.timeAcc : 0)

// ---------------------------------------------------------------------------
// ações do jogador

export type DragSource = { kind: 'queue'; threadId: number } | { kind: 'slot'; slot: number }
export type DropTarget = { kind: 'slot'; slot: number } | { kind: 'queue' } | { kind: 'io' }

function place(d: CoresState, t: Thread, slot: number, how: PlaceHow, moved = false) {
  const sl = d.slots[slot]!
  sl.threadId = t.id
  sl.since = 0
  t.where = 'run'
  d.queue = d.queue.filter((id) => id !== t.id)
  d.selected = null
  const hot = d.config.affinity && t.lastCore === sl.core
  const shared = d.config.slotsPerCore > 1 && coreLoad(d, sl.core) >= 2
  const wasteful = shared && d.slots.some((x) => x.threadId === null && coreLoad(d, x.core) === 0)
  const quick = t.wait < RULES.quickPlaceSeconds
  if (!moved)
    d.scoring = addPoints(
      d.scoring,
      (quick ? RULES.quickPlacePoints : RULES.slowPlacePoints) + (hot ? RULES.hotCachePoints : 0),
    )
  t.wait = 0
  d.events.push({ type: 'place', how, hot, wasteful, quick, moved })
  let busy = true
  for (let c = 0; c < d.config.cores; c++) if (coreLoad(d, c) === 0) busy = false
  if (busy) d.events.push({ type: 'allBusy' })
}

function unplace(d: CoresState, slot: number, to: 'queue' | 'io') {
  const sl = d.slots[slot]!
  const t = d.threads[sl.threadId!]!
  sl.threadId = null
  sl.since = 0
  t.lastCore = sl.core
  if (to === 'io') {
    t.where = 'io'
    t.ioTimer = Math.max(t.ioTimer, RULES.ioMinOffCore)
    d.io.push(t.id)
  } else {
    t.where = 'queue'
    t.wait = 0
    d.queue.push(t.id)
  }
  d.events.push({ type: 'unplace', to })
}

/** Toque numa thread da fila: seleciona ou desfaz a seleção. */
export function selectThread(s: CoresState, id: number): CoresState {
  if (s.status !== 'playing' || !s.queue.includes(id)) return s
  const d = draft(s)
  if (d.selected === id) {
    d.selected = null
    d.events.push({ type: 'deselect' })
  } else {
    d.selected = id
    d.events.push({ type: 'select', id })
  }
  return d
}

/**
 * Toque num espaço do núcleo. Vazio: recebe a thread escolhida (ou a primeira da
 * fila). Ocupado: a thread sai (para a espera de dados, se estiver travada).
 */
export function tapSlot(s: CoresState, slot: number): CoresState {
  if (s.status !== 'playing' || !s.slots[slot]) return s
  const d = draft(s)
  const running = threadInSlot(d, slot)
  if (running) {
    unplace(d, slot, running.blocked ? 'io' : 'queue')
    return d
  }
  const id = d.selected !== null && d.queue.includes(d.selected) ? d.selected : d.queue[0]
  if (id === undefined) {
    d.events.push({ type: 'invalid', reason: 'emptyQueue' })
    return d
  }
  place(d, d.threads[id]!, slot, 'tap')
  return d
}

export function canDrop(s: CoresState, source: DragSource, target: DropTarget): boolean {
  if (s.status !== 'playing') return false
  const fromSlot = source.kind === 'slot' ? threadInSlot(s, source.slot) : null
  if (source.kind === 'slot' && !fromSlot) return false
  if (source.kind === 'queue' && !s.queue.includes(source.threadId)) return false
  switch (target.kind) {
    case 'slot':
      return (
        !!s.slots[target.slot] &&
        s.slots[target.slot]!.threadId === null &&
        !(source.kind === 'slot' && source.slot === target.slot)
      )
    case 'queue':
      return source.kind === 'slot'
    case 'io':
      return !!fromSlot?.blocked
  }
}

/** Soltar uma thread arrastada. Alvos inválidos não mudam nada. */
export function dropThread(s: CoresState, source: DragSource, target: DropTarget): CoresState {
  if (!canDrop(s, source, target)) return s
  const d = draft(s)
  if (target.kind === 'slot') {
    if (source.kind === 'queue') {
      place(d, d.threads[source.threadId]!, target.slot, 'drag')
    } else {
      const from = d.slots[source.slot]!
      const t = d.threads[from.threadId!]!
      from.threadId = null
      from.since = 0
      t.lastCore = from.core
      place(d, t, target.slot, 'drag', true)
    }
    return d
  }
  if (source.kind === 'slot') {
    const t = threadInSlot(d, source.slot)!
    unplace(d, source.slot, t.blocked || target.kind === 'io' ? 'io' : 'queue')
  }
  return d
}

// ---------------------------------------------------------------------------
// passo de simulação

export function step(s: CoresState, dt: number): CoresState {
  if (s.status !== 'playing' || dt <= 0) return s
  const d = draft(s)
  const roll = roller(d)
  const { config } = d

  if (config.timed) {
    const c = countdown(d.timeLeft, dt)
    d.timeLeft = c.remaining
    if (c.crossedSecond !== null && c.crossedSecond > 0 && c.crossedSecond <= RULES.tickFromSecond)
      d.events.push({ type: 'tick', second: c.crossedSecond })
  }
  d.elapsed += dt

  // chegada de threads
  d.spawnTimer -= dt
  if (d.spawnTimer <= 0) {
    d.spawnTimer = config.spawnEvery * (0.7 + roll() * 0.6)
    if (d.queue.length < config.maxQueue) spawn(d)
  }

  // dados chegando para quem espera fora do núcleo
  for (const id of [...d.io]) {
    const t = d.threads[id]!
    t.ioTimer -= dt
    if (t.ioTimer <= 0) {
      t.ioTimer = 0
      t.blocked = false
      t.where = 'queue'
      t.wait = 0
      d.io = d.io.filter((x) => x !== id)
      d.queue.push(id)
      d.events.push({ type: 'ioReturn' })
    }
  }

  // paciência na fila
  for (const id of d.queue) {
    const t = d.threads[id]!
    t.wait += dt
    if (!config.patience) continue
    const before = t.patience
    const span = t.app === 'render' ? RULES.patienceSeconds.render : RULES.patienceSeconds.other
    t.patience -= (dt * config.patienceDrain) / span
    if (before >= RULES.lowPatience && t.patience < RULES.lowPatience && t.patience > 0)
      d.events.push({ type: 'lowPatience' })
    if (t.patience <= 0) {
      t.patience = 1
      d.hearts -= 1
      d.scoring = breakCombo(d.scoring)
      d.events.push({ type: 'appFroze', app: t.app })
    }
  }

  // núcleos trabalhando (velocidades calculadas antes de alguém terminar neste passo)
  const speeds = d.slots.map((sl) => slotSpeed(d, sl))
  d.slots.forEach((sl, i) => {
    if (sl.threadId === null) return
    const t = d.threads[sl.threadId]!
    sl.since += dt
    if (config.patience) t.patience = Math.min(1, t.patience + dt * RULES.patienceRecoverPerSecond)
    if (t.blocked) {
      t.ioTimer -= dt
      if (t.ioTimer <= 0) {
        t.ioTimer = 0
        t.blocked = false
        d.events.push({ type: 'ioReturn' })
      }
      return
    }
    t.progress += (speeds[i]! * dt) / t.work
    if (t.blockAt !== null && t.progress >= t.blockAt) {
      t.progress = t.blockAt
      t.blockAt = null
      t.blocked = true
      t.ioTimer = RULES.ioWaitSeconds
      d.events.push({ type: 'blocked' })
      return
    }
    if (t.progress >= 1) {
      sl.threadId = null
      sl.since = 0
      delete d.threads[t.id]
      d.done += 1
      d.scoring = registerHit(d.scoring, RULES.donePoints, RULES.comboStepPoints)
      d.events.push({ type: 'done', combo: d.scoring.combo })
    }
  })

  // uso da CPU e núcleo ocioso com gente na fila (quebra o combo)
  let busy = 0
  let idleCore = false
  for (let c = 0; c < config.cores; c++) {
    const here = d.slots.filter((x) => x.core === c && x.threadId !== null)
    if (here.some((x) => !d.threads[x.threadId!]!.blocked)) busy++
    if (here.length === 0) idleCore = true
  }
  d.busyAcc += (busy / config.cores) * dt
  d.timeAcc += dt
  if (idleCore && d.queue.length > 0) {
    d.idleTimer += dt
    if (d.idleTimer >= RULES.idleWarningSeconds) {
      d.idleTimer = 0
      d.scoring = breakCombo(d.scoring)
      d.events.push({ type: 'idleWarning' })
    }
  } else d.idleTimer = 0

  if (d.selected !== null && !d.queue.includes(d.selected)) d.selected = null

  if (config.autoplay) autoPlay(d)

  // fim de partida
  if (d.done >= config.goal) {
    d.status = 'won'
    d.events.push({ type: 'won' })
  } else if (config.canLose && config.patience && d.hearts <= 0) {
    d.status = 'lost'
    d.lostReason = 'hearts'
    d.events.push({ type: 'lost', reason: 'hearts' })
  } else if (config.canLose && config.timed && d.timeLeft <= 0) {
    d.status = 'lost'
    d.lostReason = 'time'
    d.events.push({ type: 'lost', reason: 'time' })
  }
  return d
}

// ---------------------------------------------------------------------------
// o escalonador automático (rodada "ver o sistema jogar sozinho")

function autoPlay(d: CoresState) {
  d.slots.forEach((sl, i) => {
    if (sl.threadId !== null && d.threads[sl.threadId]!.blocked) unplace(d, i, 'io')
  })
  const byPatience = () =>
    [...d.queue].sort((a, b) => d.threads[a]!.patience - d.threads[b]!.patience)
  const q = byPatience()
  const free = () => d.slots.map((sl, i) => [sl, i] as const).filter(([sl]) => sl.threadId === null)
  // revezamento: alguém impaciente e tudo ocupado → tira quem roda há mais tempo
  if (q.length && d.threads[q[0]!]!.patience < 0.55 && free().length === 0) {
    const victim = d.slots
      .map((sl, i) => [sl, i] as const)
      .filter(([sl]) => sl.threadId !== null && sl.since > 1.2)
      .sort((a, b) => b[0].since - a[0].since)[0]
    if (victim) unplace(d, victim[1], 'queue')
  }
  for (const id of byPatience()) {
    const f = free()
    if (!f.length) break
    const t = d.threads[id]!
    const pick =
      f.find(([sl]) => sl.core === t.lastCore && coreLoad(d, sl.core) === 0) ??
      f.find(([sl]) => coreLoad(d, sl.core) === 0) ??
      f.find(([sl]) => sl.core === t.lastCore) ??
      f[0]!
    place(d, t, pick[1], 'auto')
  }
}
