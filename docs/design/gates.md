# Design doc: Portas lógicas (`gates`)

## Objetivo didático

Interruptores sozinhos só guardam valores. Combinados com **portas lógicas** (AND, OR, NOT, e
as derivadas NAND/XOR), eles **decidem**: um circuito pode acender uma lâmpada só quando certas
condições são verdadeiras. O jogador sai entendendo o que é uma porta lógica, como ler uma
tabela-verdade e como montar uma função booleana combinando poucas peças básicas.

## Mecânica principal

Montar: o jogador encaixa portas lógicas num circuito fixo de entradas (interruptores,
reaproveitando `BitSwitch` de `shared/binary`) e uma ou mais lâmpadas-alvo. A ação central é
**tocar numa porta disponível e depois no encaixe vazio** onde ela deve entrar (alternativa de
toque, sempre disponível); arrastar a porta até o encaixe também funciona, usando o kit
`src/ui/dnd` (`DragButton`/`DropTarget`). Uma tabela de casos ao lado mostra, para cada
combinação das entradas, se a lâmpada deveria estar acesa ou apagada; o circuito é **testado em
todos os casos** ao vencer a fase (não só no caso visível no momento), o que ensina que uma
função lógica precisa valer sempre, não só "parecer certa" numa combinação.

## O que cada fase ensina

| Fase     | Ideia nova                                                                  | Como vencer                                                         | Como perder                        |
| -------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------- |
| Tutorial | A porta **NOT**: inverte um valor. 1 entrada, 1 porta fixa, 1 lâmpada.      | Ligar/desligar a entrada e observar a lâmpada inverter (guiado).      | (nunca)                             |
| Fase 1   | Escolher entre **AND** e **OR** para um circuito de 2 entradas; o jogador vê a tabela-verdade do alvo e precisa decidir qual das duas portas bate com ela. | Encaixar a porta certa e passar nos 4 casos da tabela.                | Tempo esgota (ver `goalValues`)     |
| Fase 2   | Combinar duas portas em série para formar **NAND** (AND + NOT) a partir de peças separadas — não existe uma peça "NAND" pronta ainda. | Encaixar AND seguido de NOT na saída e passar nos 4 casos.             | Tempo esgota                        |
| Fase 3   | Montar um **XOR** (ou-exclusivo) só com AND, OR e NOT (3 entradas de porta: `(A OR B) AND NOT(A AND B)`), 3 portas, 2 entradas. | Passar nos 4 casos da tabela-verdade do XOR.                           | Tempo esgota                        |
| Fase 4   | **Estoque limitado de portas**: o jogador recebe só as peças exatas necessárias (ex. 1 AND, 1 OR, 1 NOT, nem uma a mais) para um circuito de 3 entradas e precisa decidir a topologia certa antes de gastar a última peça. | Passar nos 8 casos da tabela-verdade (3 entradas) usando exatamente as peças do estoque. | Tempo esgota, ou encaixar uma peça errada no único lugar que sobra e esgotar o estoque sem solução (o jogo detecta e oferece "desfazer a última peça" sem penalidade de vida) |

Quatro fases além do tutorial, dentro do intervalo de 3–5 do README.

## Falas do Kernel

- Abertura:
  1. "Lembra dos interruptores? Sozinhos, eles só guardam 0 e 1."
  2. "Mas e se eu quiser que uma lâmpada só acenda quando **os dois** interruptores estiverem
     ligados? Isso é **decidir**. Para isso existem as **portas lógicas**."
  3. "Vamos montar a primeira: a porta NOT, que inverte o que recebe."
- Dica (por fase):
  - Fase 1: "Olhe a tabela: a lâmpada só acende quando os dois estão ligados? É **AND**. Acende
    se **qualquer um** estiver ligado? É **OR**."
  - Fase 2: "NAND é só um AND seguido de um NOT — ele inverte o resultado do AND."
  - Fase 3: "XOR acende quando as entradas são **diferentes**. Tente: **(A ou B) e não (A e
    B)**."
  - Fase 4: "Você só tem as peças certas — não dá para desperdiçar nenhuma. Pense na tabela
    inteira antes de encaixar a última."
- Conexão com a próxima estação: "Com portas lógicas dá para decidir… e, surpresa, também para
  **fazer contas**. A próxima estação é uma calculadora feita só de portas: a **ULA**."

## Card de conceito

1. `porta-logica` — "Porta lógica" / termo técnico **Porta lógica (AND, OR, NOT)** / resumo: "Uma
   porta lógica é um circuito minúsculo que decide um resultado (0 ou 1) a partir de uma ou duas
   entradas." / analogia: "AND é como duas chaves em série (as duas precisam estar viradas); OR é
   como duas chaves em paralelo (uma já basta)." / mundo real: "Um processador moderno tem
   **bilhões** dessas portinhas dentro de um chip do tamanho de uma moeda." / ícone `gate`.
   Liberado na **Fase 1**.
2. `tabela-verdade` — "Tabela-verdade" / termo técnico **Tabela-verdade** / resumo: "Uma tabela
   que lista, para cada combinação possível das entradas, qual deveria ser a saída — é como testar
   um circuito em todos os casos de uma vez." / analogia: "Como testar todas as combinações de uma
   fechadura de 2 chaves antes de confiar nela." / mundo real: "Compiladores e chips usam tabelas
   assim para verificar que um circuito está correto antes de ser fabricado." / ícone `table`.
   Liberado na **Fase 3** (quando o circuito já tem 4 casos relevantes de verdade).

## Layout mobile e desktop

```
celular em pé                      desktop / tablet deitado
┌─────────────────────┐            ┌───────────────────────────────────┐
│ nível          ctrl  │            │ nível                       ctrl  │
├─────────────────────┤            ├───────────┬─────────────────────-─┤
│  tabela-verdade      │            │  HUD      │   [A]─┐               │
│  A B | saída         │            │  tabela   │       [AND]──◉ lâmp. │
│  0 0 | 0             │            │  (lista)  │   [B]─┘               │
│  0 1 | 0             │            │           │                       │
│  1 0 | 0             │            │  estoque  │   estoque de portas   │
│  1 1 | 1             │            │  de portas│   [AND][OR][NOT]      │
├─────────────────────┤            ├───────────┴─────────────────────-─┤
│ [A]──┐               │            │            narrador               │
│      [AND]──◉ lâmp.  │            └───────────────────────────────-──┘
│ [B]──┘               │
├─────────────────────┤
│ estoque: [AND][OR]   │
├─────────────────────┤
│      narrador        │
└─────────────────────┘
```

Celular deitado: tabela-verdade e estoque de portas ficam numa coluna estreita à esquerda; o
circuito (entradas → encaixes → lâmpada) ocupa a coluna da direita, lido de cima para baixo em
vez de esquerda para direita, para caber na altura reduzida. Desktop/tablet deitado: três colunas
(tabela, circuito, estoque) dentro do campo do `GameFrame`. O circuito sempre se desenha em fluxo
horizontal esquerda→direita (entradas à esquerda, lâmpada à direita), com os fios desenhados em
SVG inline (`stroke` sólido quando "1", tracejado/claro quando "0" — nunca só cor, também o
traço).

## Contrato de dados das fases

```ts
export type GateType = 'AND' | 'OR' | 'NOT'

export interface GatesPhase extends PhaseBase {
  /** Número de entradas booleanas do circuito desta fase. */
  inputCount: 2 | 3
  /** Topologia fixa de encaixes vazios que o jogador preenche (ver shared/circuit). */
  template: CircuitTemplate
  /** Portas disponíveis para encaixar. 'unlimited' nas fases 1 a 3; lista exata na fase 4. */
  stock: GateType[] | 'unlimited'
  /** Função booleana-alvo, usada para gerar a tabela-verdade exibida e validar a vitória. */
  targetTruthTable: readonly boolean[]
  secondsLimit: number
}
```

`goalValues(phase, { difficulty, untimed })` devolve `time: phase.secondsLimit` (ajustado ±20%
pela dificuldade) e `goal: phase.targetTruthTable.length` (quantos casos da tabela precisam
passar — sempre `2^inputCount`), omitindo `time` se `untimed`.

### Módulo compartilhado `src/games/shared/circuit/` (criado por esta estação)

A ULA (`alu`) reusa este módulo inteiro para montar o meio-somador e o somador completo. A
interface abaixo é o contrato que a ULA pode assumir sem olhar a implementação:

```ts
// src/games/shared/circuit/types.ts

export type GateType = 'AND' | 'OR' | 'NOT' | 'XOR' | 'NAND' | 'NOR'

/** Um nó do circuito: uma entrada nomeada, uma porta, ou uma saída nomeada. */
export type NodeId = string

export interface InputNode {
  kind: 'input'
  id: NodeId
  /** Nome exibido, ex. "A", "B", "vai-um". */
  label: string
}

export interface GateNode {
  kind: 'gate'
  id: NodeId
  gate: GateType
  /** Nós de origem, na ordem dos operandos da porta (NOT usa só 1). */
  inputs: readonly NodeId[]
}

export interface OutputNode {
  kind: 'output'
  id: NodeId
  label: string
  /** Nó de origem que alimenta esta saída. */
  input: NodeId
}

export type CircuitNode = InputNode | GateNode | OutputNode

/**
 * Um circuito é uma lista de nós. Deve ser acíclico: todo GateNode/OutputNode
 * só pode referenciar NodeIds já declarados antes dele na lista (ordem
 * topológica garantida por construção, não verificada em runtime por
 * desempenho — `validateCircuit` abaixo verifica, para uso em testes e nos
 * encaixes do editor).
 */
export type Circuit = readonly CircuitNode[]

/** Um "molde" de circuito com alguns GateNodes incompletos (porta a definir),
 *  usado pelas fases como `template`: o jogador preenche `gate` nos buracos. */
export interface CircuitTemplate {
  nodes: readonly (CircuitNode | { kind: 'slot'; id: NodeId; inputs: readonly NodeId[] })[]
}

// src/games/shared/circuit/evaluate.ts

/** Avalia um circuito para uma combinação de entradas. Lança erro se houver
 *  ciclo ou referência a um nó inexistente/posterior. */
export function evaluateCircuit(
  circuit: Circuit,
  inputValues: Record<NodeId, boolean>,
): Record<NodeId, boolean> // valor de TODO nó (entradas, portas e saídas), por id

/** Gera a tabela-verdade completa de um circuito (todas as 2^n combinações das
 *  entradas, na ordem binária crescente dos InputNodes na ordem em que
 *  aparecem no circuito). */
export function truthTable(circuit: Circuit): readonly boolean[][] // cada linha: [...entradas, ...saídas]

/** true se o circuito é acíclico e toda referência existe e é anterior. */
export function validateCircuit(circuit: Circuit): boolean

/** Avalia uma única porta (sem precisar montar um Circuit) — usado por testes
 *  e por fases que só precisam checar uma porta isolada. */
export function evaluateGate(gate: GateType, inputs: readonly boolean[]): boolean

// src/games/shared/circuit/CircuitSlot.tsx

export interface CircuitSlotProps {
  /** Porta atualmente encaixada, ou undefined se o encaixe está vazio. */
  gate?: GateType
  /** Rótulo acessível do encaixe, ex. "encaixe 2, porta AND, entradas A e B". */
  label: string
  disabled?: boolean
  /** Toque-para-selecionar: chamado quando o encaixe recebe uma porta pendente. */
  onDrop: (gate: GateType) => void
  onClear?: () => void
}

/**
 * Encaixe acessível para uma porta: aceita arraste (useDroppable do kit
 * src/ui/dnd) e toque (ao tocar, usa a porta previamente selecionada por
 * toque no estoque — o padrão "tocar → tocar" do kit). Alvo de toque mínimo
 * 44x44px. Mostra o nome da porta por texto, não só por ícone/cor.
 */
export function CircuitSlot(props: CircuitSlotProps): JSX.Element

// src/games/shared/circuit/GatePiece.tsx

export interface GatePieceProps {
  gate: GateType
  /** Quantas sobram no estoque; omitido = ilimitado. */
  remaining?: number
  disabled?: boolean
  onPick: () => void
}

/** Peça de porta arrastável/tocável no estoque (usa DragButton do kit de dnd). */
export function GatePiece(props: GatePieceProps): JSX.Element
```

Observações para quem for implementar a ULA (`alu`): o somador completo é montado como um
`Circuit` com `InputNode`s `A`, `B`, `carryIn` e `OutputNode`s `sum`, `carryOut`, usando
`evaluateCircuit` fase a fase para animar o "vai um" propagando (avalie o circuito do bit menos
significativo primeiro, leve o `carryOut` resultante como `carryIn` do próximo). `GateType` aqui
já inclui XOR, NAND e NOR mesmo que Portas lógicas só ofereça AND/OR/NOT ao jogador — são
variantes derivadas (`evaluateGate` as calcula a partir de AND/OR/NOT internamente) para a ULA
poder montar o meio-somador (`XOR` + `AND`) sem precisar que Portas lógicas "destrave" XOR como
peça jogável.

## Regras puras a testar

`src/games/gates/logic/rules.ts`:

- `placeGate(state, slotId, gate)`: preenche um slot vazio do `CircuitTemplate`, decrementa o
  estoque se `stock !== 'unlimited'`, devolve novo estado e `{ type: 'placed', slotId, gate }` ou
  `{ type: 'blocked', reason: 'sem-estoque' }`.
  - `clearGate(state, slotId)`: remove a porta de um slot preenchido, devolve a peça ao estoque.
  - `checkCircuit(state)`: monta o `Circuit` completo a partir do `CircuitTemplate` + portas
  colocadas, chama `truthTable` de `shared/circuit` e compara linha a linha com
  `phase.targetTruthTable`; devolve `{ type: 'won' }` se todas batem, `{ type: 'incomplete' }` se
  existe slot vazio, ou `{ type: 'mismatch', failingCases: number[] }`.

Casos de teste:

- `evaluateGate`: AND/OR/NOT/XOR/NAND/NOR batem com a tabela-verdade conhecida de cada uma (2 ou
  4 linhas).
- `evaluateCircuit` detecta ciclo e lança erro (circuito inválido construído propositalmente no
  teste).
- `truthTable` de um circuito "(A OR B) AND NOT(A AND B)" é idêntica à tabela do XOR, célula a
  célula.
- `checkCircuit` só devolve `won` quando **todos** os `2^inputCount` casos passam, não só o caso
  visível no momento do teste.
- Vitória/derrota: circuito completo e correto antes do tempo esgotar → vitória; tempo esgota
  (fases 1–3) ou estoque esgota sem solução (fase 4) → derrota.
- Estrelas: réplica da fórmula por tempo restante de Núcleos/Bits (≥30% → 3, ≥12% → 2, vitória →
  1); no modo sem tempo, por número de peças trocadas (`clearGate`) — zero trocas = 3 estrelas.
- Determinismo: a tabela-verdade-alvo de cada fase é fixa nos dados (não sorteada), então não há
  necessidade de teste de semente aqui — diferente de Bits.

## Riscos

- **Mecânica confusa: estoque limitado (Fase 4).** Travar o jogador numa configuração sem solução
  é frustrante. Mitigação: `clearGate` sem custo de vida, e a dica do Kernel nessa fase sempre
  nomeia a topologia completa se o jogador perder duas vezes.
- **Dependência crítica para a ULA:** como `shared/circuit` é a base da Etapa 3 inteira (Onda 5
  depende da Onda 4), qualquer mudança de assinatura depois do merge de `gates` vira pedido formal
  para a próxima onda (regra da seção 2.2 do PLANEJAMENTO) — a interface acima foi pensada para já
  cobrir o caso de uso do somador (múltiplas saídas, `carryIn`/`carryOut` como nós nomeados) sem
  precisar mudar depois.
- **XOR/NAND/NOR "escondidos":** o tipo `GateType` do módulo compartilhado inclui variantes que o
  jogador de `gates` nunca encaixa como peça (ele as monta combinando AND/OR/NOT). Isso pode
  confundir quem olhar o tipo achando que são jogáveis; documentado no comentário do código e
  aqui, mas vale revisão do dono do projeto se preferir dois tipos separados (`PlayableGateType`
  vs `GateType` interno).
- **Acessibilidade dos fios do circuito:** o estado "0"/"1" de cada fio precisa ser legível sem
  cor (traço sólido vs. tracejado, citado no layout) — testar contraste e também com
  "Menos animações" ativado, já que a animação do valor propagando pelos fios deve poder ficar
  instantânea.
- **Leitura da tabela-verdade em telas pequenas:** com `inputCount: 3` (Fase 4), a tabela tem 8
  linhas — testar se cabe sem scroll excessivo em 320px de largura; se não couber, considerar
  paginação por "caso atual" com indicador de progresso (ex. "caso 3 de 8") em vez da tabela
  inteira sempre visível.
