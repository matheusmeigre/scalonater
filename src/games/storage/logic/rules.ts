import { breakCombo, emptyCombo, registerHit } from '@/engine/scoring/scoring'
import type { StorageDevice, StorageOperation, StoragePhase } from '../phases'
import { SYSTEM_FILE, type FileEntry, type StorageEvent, type StorageState } from './model'

/** Quantas vezes faltar espaço derrota a fase (fases 1–2). */
const NO_SPACE_LIMIT = 3
/** Custo de tempo fixo de usar "Desfragmentar" (a pausa de ~2s do design doc). */
const DEFRAG_TIME_COST = 10

export function createGame(phase: StoragePhase): StorageState {
  const disk: (string | null)[] = Array.from({ length: phase.diskBlocks }, (_, i) =>
    phase.reservedBlocks.includes(i) ? SYSTEM_FILE : null,
  )
  return {
    phase,
    diskBlocks: phase.diskBlocks,
    disk,
    files: {},
    createdOrder: [],
    opIndex: 0,
    device: phase.deviceModes[0] ?? 'hd',
    totalTime: 0,
    defragUsed: 0,
    noSpaceCount: 0,
    scoring: emptyCombo(),
    status: 'playing',
    lostReason: null,
    events: [],
  }
}

function freeBlocksInOrder(disk: readonly (string | null)[]): number[] {
  const out: number[] = []
  for (let i = 0; i < disk.length; i++) if (disk[i] === null) out.push(i)
  return out
}

function isContiguous(blocks: readonly number[]): boolean {
  const sorted = [...blocks].sort((a, b) => a - b)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1]! + 1) return false
  }
  return true
}

/** Agrupa blocos (já em qualquer ordem) em trechos contíguos, para mostrar "continua no bloco X". */
export function chunksOf(blocks: readonly number[]): number[][] {
  const sorted = [...blocks].sort((a, b) => a - b)
  const chunks: number[][] = []
  let current: number[] = []
  for (const b of sorted) {
    const last = current[current.length - 1]
    if (current.length === 0 || last === undefined || b === last + 1) current.push(b)
    else {
      chunks.push(current)
      current = [b]
    }
  }
  if (current.length > 0) chunks.push(current)
  return chunks
}

function place(
  state: StorageState,
  fileId: string,
  sizeBlocks: number,
  blocks: readonly number[],
  fragmented: boolean,
): { state: StorageState; event: StorageEvent } {
  const disk = state.disk.slice()
  for (const b of blocks) disk[b] = fileId
  const entry: FileEntry = { id: fileId, sizeBlocks, blocks: [...blocks] }
  const files = { ...state.files, [fileId]: entry }
  const createdOrder = [...state.createdOrder, fileId]
  const next: StorageState = { ...state, disk, files, createdOrder }
  const event: StorageEvent = fragmented
    ? { type: 'fragmented', fileId, chunks: chunksOf(blocks) }
    : { type: 'allocated', fileId }
  return { state: next, event }
}

/**
 * Primeiro-ajuste (first-fit): percorre os blocos livres em ordem e usa o
 * primeiro buraco contíguo grande o bastante. Sem buraco único que baste,
 * fragmenta preenchendo com os buracos livres disponíveis em ordem. Sem
 * blocos livres suficientes no total, devolve `no-space` sem alterar o estado.
 */
export function allocate(
  state: StorageState,
  fileId: string,
  sizeBlocks: number,
): { state: StorageState; event: StorageEvent } {
  const disk = state.disk
  let runStart = -1
  let runLen = 0
  for (let i = 0; i < disk.length; i++) {
    if (disk[i] === null) {
      if (runLen === 0) runStart = i
      runLen++
      if (runLen >= sizeBlocks) break
    } else {
      runLen = 0
      runStart = -1
    }
  }
  if (runLen >= sizeBlocks && runStart >= 0) {
    const blocks = Array.from({ length: sizeBlocks }, (_, k) => runStart + k)
    return place(state, fileId, sizeBlocks, blocks, false)
  }
  const free = freeBlocksInOrder(disk)
  if (free.length < sizeBlocks) {
    return { state, event: { type: 'no-space', fileId } }
  }
  const blocks = free.slice(0, sizeBlocks)
  return place(state, fileId, sizeBlocks, blocks, !isContiguous(blocks))
}

/** Libera todos os blocos (inclusive fragmentados) do arquivo e remove da tabela. */
export function free(
  state: StorageState,
  fileId: string,
): { state: StorageState; event: StorageEvent } {
  const entry = state.files[fileId]
  if (!entry) return { state, event: { type: 'freed', fileId } }
  const disk = state.disk.slice()
  for (const b of entry.blocks) disk[b] = null
  const files = { ...state.files }
  delete files[fileId]
  const createdOrder = state.createdOrder.filter((id) => id !== fileId)
  return { state: { ...state, disk, files, createdOrder }, event: { type: 'freed', fileId } }
}

/**
 * Soma as distâncias entre blocos consecutivos tocados vezes
 * `hdSeekCostPerBlock` no HD; no SSD, só `baseCostPerBlock * blocksInOrder.length`
 * (sem custo de posição).
 */
export function seekCost(
  blocksInOrder: readonly number[],
  device: StorageDevice,
  phase: StoragePhase,
): number {
  if (device === 'ssd') return phase.baseCostPerBlock * blocksInOrder.length
  let dist = 0
  for (let i = 1; i < blocksInOrder.length; i++) {
    dist += Math.abs(blocksInOrder[i]! - blocksInOrder[i - 1]!)
  }
  return dist * phase.hdSeekCostPerBlock
}

/**
 * Reescreve a tabela de arquivos compactando-os a partir do bloco 0, na
 * ordem em que foram criados, sem fragmentação. Blocos de sistema (fixos)
 * continuam nas próprias posições.
 */
export function defragment(state: StorageState): StorageState {
  const disk: (string | null)[] = new Array(state.diskBlocks).fill(null)
  for (let i = 0; i < disk.length; i++) {
    if (state.disk[i] === SYSTEM_FILE) disk[i] = SYSTEM_FILE
  }
  const files: Record<string, FileEntry> = {}
  let cursor = 0
  const nextFree = () => {
    while (cursor < disk.length && disk[cursor] !== null) cursor++
    return cursor
  }
  for (const id of state.createdOrder) {
    const entry = state.files[id]
    if (!entry) continue
    const blocks: number[] = []
    for (let k = 0; k < entry.sizeBlocks; k++) {
      const b = nextFree()
      disk[b] = id
      blocks.push(b)
      cursor = b + 1
    }
    files[id] = { ...entry, blocks }
  }
  return {
    ...state,
    disk,
    files,
    defragUsed: state.defragUsed + 1,
    totalTime: state.totalTime + DEFRAG_TIME_COST,
    events: [{ type: 'defragmented' }],
  }
}

function afterOperation(state: StorageState, advanced: boolean): StorageState {
  const phase = state.phase
  const next: StorageState = advanced ? { ...state, opIndex: state.opIndex + 1 } : state

  if (phase.maxTotalTime !== undefined && next.totalTime > phase.maxTotalTime) {
    return {
      ...next,
      status: 'lost',
      lostReason: 'time',
      events: [...next.events, { type: 'lost', reason: 'time' }],
    }
  }
  if (next.noSpaceCount >= NO_SPACE_LIMIT) {
    return {
      ...next,
      status: 'lost',
      lostReason: 'space',
      events: [...next.events, { type: 'lost', reason: 'space' }],
    }
  }
  if (next.opIndex >= phase.operations.length) {
    const defragOk = !phase.requireDefrag || next.defragUsed >= 1
    if (defragOk) {
      return { ...next, status: 'won', events: [...next.events, { type: 'won' }] }
    }
    return {
      ...next,
      status: 'lost',
      lostReason: 'time',
      events: [...next.events, { type: 'lost', reason: 'time' }],
    }
  }
  return next
}

/**
 * Função de alto nível: chama `allocate`/`free` e `seekCost`, acumula o
 * tempo total e avança o progresso da fase. Para `save`, usa os blocos
 * escolhidos pelo jogador quando válidos (livres e na quantidade certa);
 * senão cai para o primeiro-ajuste automático (`allocate`).
 */
export function applyOperation(
  state: StorageState,
  operation: StorageOperation,
  device: StorageDevice,
  blocksChosenByPlayer?: readonly number[],
): StorageState {
  if (state.status !== 'playing') return state
  const phase = state.phase

  if (operation.kind === 'delete') {
    const entry = state.files[operation.fileId]
    const blocksForCost = entry ? entry.blocks : []
    const { state: freed, event } = free(state, operation.fileId)
    const cost = seekCost(blocksForCost, device, phase)
    const scoring = registerHit(freed.scoring, 20, 5)
    const next: StorageState = {
      ...freed,
      device,
      totalTime: freed.totalTime + cost,
      scoring,
      events: [event],
    }
    return afterOperation(next, true)
  }

  const size = operation.sizeBlocks ?? 0
  const freeList = freeBlocksInOrder(state.disk)
  if (freeList.length < size) {
    const next: StorageState = {
      ...state,
      device,
      noSpaceCount: state.noSpaceCount + 1,
      scoring: breakCombo(state.scoring),
      events: [{ type: 'no-space', fileId: operation.fileId }],
    }
    return afterOperation(next, false)
  }

  const chosenValid =
    blocksChosenByPlayer &&
    blocksChosenByPlayer.length === size &&
    blocksChosenByPlayer.every((b) => state.disk[b] === null)
  const { state: placed, event } = chosenValid
    ? place(
        state,
        operation.fileId,
        size,
        blocksChosenByPlayer,
        !isContiguous(blocksChosenByPlayer),
      )
    : allocate(state, operation.fileId, size)
  const fragmented = event.type === 'fragmented'
  const entry = placed.files[operation.fileId]!
  const cost = seekCost(entry.blocks, device, phase)
  const scoring = registerHit(placed.scoring, fragmented ? 30 : 50, fragmented ? 5 : 15)
  const next: StorageState = {
    ...placed,
    device,
    totalTime: placed.totalTime + cost,
    scoring,
    events: [event],
  }
  return afterOperation(next, true)
}
