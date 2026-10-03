import type { PhaseBase } from '@/engine/types'
import type { CycleInstruction } from './logic/model'

/** O que faz uma etapa do tutorial avançar (mesma convenção do Núcleos/Memória). */
export type TutorialTrigger = 'fetch' | 'decode' | 'execute'
export type TutorialHighlight = 'pc' | 'palette' | 'execute-btn'

export interface TutorialStep {
  id: string
  advanceOn: TutorialTrigger
  highlight?: TutorialHighlight
}

/** Fases como dados (design doc, "Contrato de dados das fases"). */
export interface CyclePhase extends PhaseBase {
  /** Programa fixo da fase, já como instruções decodificadas. A codificação
   * para a gaveta (`number`) é feita por `encodeInstruction` em `logic/`. */
  program: readonly CycleInstruction[]
  /** Dados pré-carregados fora do programa (endereço × valor) — contadores e
   * operandos que `CARREGA`/`SOMA` leem. Extensão própria desta estação (o
   * contrato do design doc não cobre dados fora do programa). */
  data?: readonly { address: number; value: number }[]
  /** Tamanho da estante exibida (>= program.length + maior endereço de dado). */
  shelfSize: number
  columns: number
  secondsPerStation: number
  /** Meta de ACC ao final do programa, quando a fase pede um valor (fases 2 e 4). */
  goalAcc?: number
  /** Limite de repetições do laço antes de contar como derrota (fase 3). */
  maxLoopIterations?: number
  maxMistakes: number
  /** Quantas execuções completam a fase — conta as repetições de um laço, por
   * isso pode ser maior que `program.length` (extensão própria, necessária
   * porque o PC pode não "passar do fim" quando a última instrução é um
   * `PULA`/`PULASZ` que volta para trás — ver DECISIONS.md, Etapa 5). */
  totalExecutions: number
  stars: { metric: 'timeLeft' | 'mistakesLeft'; thresholds: readonly [number, number] }
  /** Etapas guiadas do tutorial (só a primeira fase tem). */
  tutorial?: readonly TutorialStep[]
}

/** No modo sem tempo não há relógio e a partida inteira corre a esta velocidade. */
export const UNTIMED_SPEED = 0.75

export const PHASES: readonly CyclePhase[] = [
  {
    id: 'tutorial',
    kind: 'tutorial',
    canLose: false,
    // 4 gavetas visíveis: só a instrução (endereço 0) e o dado que ela lê
    // (endereço 2) ocupadas — o resto fica vazio para não distrair.
    shelfSize: 4,
    columns: 2,
    program: [{ op: 'CARREGA', address: 2 }],
    data: [{ address: 2, value: 5 }],
    secondsPerStation: 0,
    maxMistakes: 0,
    totalExecutions: 1,
    stars: { metric: 'mistakesLeft', thresholds: [1, 1] },
    tutorial: [
      { id: 'tutorial-fetch', advanceOn: 'fetch', highlight: 'pc' },
      { id: 'tutorial-decode', advanceOn: 'decode', highlight: 'palette' },
      { id: 'tutorial-execute', advanceOn: 'execute', highlight: 'execute-btn' },
    ],
  },
  {
    id: 'nivel-1',
    kind: 'level',
    canLose: true,
    unlocksCard: 'instruction-cycle',
    shelfSize: 6,
    columns: 3,
    // CARREGA 04, SOMA 05, GUARDA 04, PULA 00: o PULA final volta ao início
    // só para mostrar "fim de rodada" (o PC não pergunta, ele avança) — a
    // vitória vem de completar as 4 execuções, não de o PC passar do fim.
    program: [
      { op: 'CARREGA', address: 4 },
      { op: 'SOMA', address: 5 },
      { op: 'GUARDA', address: 4 },
      { op: 'PULA', address: 0 },
    ],
    data: [
      { address: 4, value: 3 },
      { address: 5, value: 4 },
    ],
    secondsPerStation: 8,
    maxMistakes: 2,
    totalExecutions: 4,
    stars: { metric: 'timeLeft', thresholds: [0.4, 0.7] },
  },
  {
    id: 'nivel-2',
    kind: 'level',
    canLose: true,
    unlocksCard: 'register',
    shelfSize: 11,
    columns: 4,
    // CARREGA 06 (=5), SOMA 07 (+4=9), GUARDA 08, CARREGA 08 (=9 de volta),
    // SOMA 09 (+6=15), GUARDA 10: ACC final = 15 = goalAcc.
    program: [
      { op: 'CARREGA', address: 6 },
      { op: 'SOMA', address: 7 },
      { op: 'GUARDA', address: 8 },
      { op: 'CARREGA', address: 8 },
      { op: 'SOMA', address: 9 },
      { op: 'GUARDA', address: 10 },
    ],
    data: [
      { address: 6, value: 5 },
      { address: 7, value: 4 },
      { address: 9, value: 6 },
    ],
    secondsPerStation: 8,
    maxMistakes: 3,
    totalExecutions: 6,
    goalAcc: 15,
    stars: { metric: 'timeLeft', thresholds: [0.4, 0.7] },
  },
  {
    id: 'nivel-3',
    kind: 'level',
    canLose: true,
    shelfSize: 13,
    columns: 5,
    // Laço (endereços 0-3): decrementa o contador (gaveta 8, começa em 3)
    // somando -1 (gaveta 9) até zerar; PULASZ 00 repete enquanto ACC != 0.
    // Depois do laço (endereços 4-7): mais três contas, sem meta de ACC.
    program: [
      { op: 'CARREGA', address: 8 }, // 0
      { op: 'SOMA', address: 9 }, // 1
      { op: 'GUARDA', address: 8 }, // 2
      { op: 'PULASZ', address: 0 }, // 3
      { op: 'CARREGA', address: 10 }, // 4
      { op: 'SOMA', address: 11 }, // 5
      { op: 'GUARDA', address: 12 }, // 6
      { op: 'SOMA', address: 11 }, // 7
    ],
    data: [
      { address: 8, value: 3 },
      { address: 9, value: -1 },
      { address: 10, value: 10 },
      { address: 11, value: 5 },
    ],
    secondsPerStation: 9,
    maxMistakes: 3,
    // O laço correto repete 3 vezes (2 saltos de volta); a margem de segurança
    // evita frustração se uma decodificação errada criasse um laço sem fim.
    maxLoopIterations: 6,
    // 3 repetições × 4 instruções do laço + 4 instruções depois dele.
    totalExecutions: 16,
    stars: { metric: 'mistakesLeft', thresholds: [0.5, 1] },
  },
  {
    id: 'nivel-4',
    kind: 'level',
    canLose: true,
    shelfSize: 11,
    columns: 4,
    // Mesmo programa da Fase 2 ("a CPU acelerou" — mesma meta, metade do tempo).
    program: [
      { op: 'CARREGA', address: 6 },
      { op: 'SOMA', address: 7 },
      { op: 'GUARDA', address: 8 },
      { op: 'CARREGA', address: 8 },
      { op: 'SOMA', address: 9 },
      { op: 'GUARDA', address: 10 },
    ],
    data: [
      { address: 6, value: 5 },
      { address: 7, value: 4 },
      { address: 9, value: 6 },
    ],
    secondsPerStation: 4,
    maxMistakes: 2,
    totalExecutions: 6,
    goalAcc: 15,
    stars: { metric: 'timeLeft', thresholds: [0.5, 0.8] },
  },
] as const
