# Design doc: A calculadora (ULA) (`alu`)

## Objetivo didático

Somar não é mágica: é só uma sequência de portas lógicas repetida bit a bit, com um "vai um" que
viaja de uma casa para a outra — exatamente como a soma com reserva que o jogador já faz à mão em
decimal. O jogador sai entendendo o que é a **ULA** (a parte do processador que faz contas) e o
que é o **carry** (vai-um) numa soma binária.

## Mecânica principal

Tocar, depois montar. Nas fases 1 e 3-4, a mecânica é tocar nas casas de um resultado binário para
preenchê-las com 0 ou 1 (reaproveitando `BitSwitch` de `shared/binary`), coluna a coluna, da
direita para a esquerda, vendo o "vai um" aparecer como uma ficha visual acima da próxima coluna.
Nas fases 2 e 3, a mecânica passa a ser **montar um circuito** encaixando portas em slots fixos
(reaproveitando `CircuitSlot`/`GatePiece` de `shared/circuit`, igual a Portas lógicas) para
construir o meio-somador e depois o somador completo — aqui o "vai um" passa a ser calculado pelo
próprio circuito montado, não mais digitado à mão. Usa o kit `src/ui/dnd` nas fases de montagem de
circuito (herdado de `shared/circuit`, que já o usa internamente).

## O que cada fase ensina

| Fase     | Ideia nova                                                                         | Como vencer                                                            | Como perder |
| -------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------ |
| Tutorial | 0+1=1 e 1+1=10 (o "vai um" aparece pela primeira vez, guiado).                        | Completar as 2 contas guiadas pelo Kernel.                               | (nunca)      |
| Fase 1   | Somar dois números de 4 bits **à mão**, coluna a coluna, marcando o "vai um" quando a coluna passa de 1. | Resolver corretamente 5 somas de 4 bits sorteadas.                       | Tempo esgota |
| Fase 2   | Montar o **meio-somador** (half adder): circuito fixo de 2 entradas (A, B) e 2 saídas (soma, vai-um), usando XOR (soma) e AND (vai-um) — as mesmas peças disponíveis em Portas lógicas, mais XOR como peça pronta aqui. | Encaixar as 2 portas certas e passar nos 4 casos da tabela-verdade (A, B → soma, vai-um). | Tempo esgota |
| Fase 3   | **Somador completo** (full adder): acrescentar a entrada `vai-um-de-entrada` ao meio-somador, encadeando 2 meios-somadores (peça "meio-somador" já pronta, reaproveitada da fase 2, mais 1 porta OR para combinar os dois vai-uns). O jogador vê o vai-um se propagar entre 2 somadores completos ligados em cadeia (4 bits = 4 somadores). | Passar nos 8 casos da tabela-verdade do somador completo (A, B, vai-um-de-entrada → soma, vai-um-de-saída). | Tempo esgota |
| Fase 4   | **Seletor de operação da ULA**: com o somador de 4 bits já montado nas fases anteriores, o jogador liga uma segunda função (AND bit a bit, OR bit a bit) ao mesmo barramento de entradas e usa um seletor de 2 bits para escolher qual operação passa para a saída, sem remontar o circuito. | Resolver corretamente 5 desafios que alternam entre pedir soma, AND ou OR dos mesmos dois números de 4 bits. | Tempo esgota |

Quatro fases além do tutorial, dentro do intervalo de 3–5 do README.

## Falas do Kernel

- Abertura:
  1. "Você já viu portas decidirem coisas. Mas sabia que, com só portas, dá para **somar
     números**?"
  2. "É assim que a parte calculadora do processador, a **ULA**, funciona por dentro."
  3. "Vamos somar 1 + 1 e descobrir por que vira '10' em binário."
- Dica (por fase):
  - Fase 1: "Igual na soma decimal: se a coluna passar de 1, escreve 0 e **leva 1** para a
    próxima coluna."
  - Fase 2: "XOR dá a soma de dois bits (ignorando o vai-um); AND dá o vai-um (só é 1 quando os
    dois são 1)."
  - Fase 3: "Agora tem **três** entradas: A, B e o vai-um que chegou da coluna anterior. Some os
    dois vai-uns possíveis com um OR."
  - Fase 4: "A ULA sabe fazer mais de uma conta — o seletor escolhe qual resultado sai no final,
    sem desmontar nada."
- Conexão com a próxima estação: "A ULA calcula rápido, mas ela não guarda nada — os números
  somem assim que a conta termina. Eles precisam ficar guardados em algum lugar enquanto isso:
  a **memória**."

## Card de conceito

1. `ula` — "ULA" / termo técnico **Unidade Lógica e Aritmética (ULA)** / resumo: "A parte do
   processador que faz contas e comparações — soma, subtração, AND, OR — sempre usando portas
   lógicas por dentro." / analogia: "Como a calculadora dentro de uma calculadora: todo o resto do
   processador só manda números para ela e espera o resultado." / mundo real: "Toda operação
   matemática que um programa faz, de um jogo a uma planilha, passa pela ULA." / ícone `alu`.
   Liberado na **Fase 2** (primeiro circuito-ULA de fato montado).
2. `vai-um` — "Vai-um (carry)" / termo técnico **Carry** / resumo: "Quando a soma de uma coluna
   passa do valor máximo daquela base, o excesso 'vai' para a próxima coluna — em binário, isso
   acontece a cada vez que 1+1." / analogia: "Igual juntar 10 moedas de 1 centavo e trocar por uma
   de 10: o 'excesso' vira uma unidade na casa seguinte." / mundo real: "Processadores têm um bit
   de 'carry' guardado justamente para isso, usado também para somar números maiores que o
   processador processa de uma vez (64 bits somados em pedaços)." / ícone `carry`. Liberado na
   **Fase 1**.

## Layout mobile e desktop

```
celular em pé (fase 1, soma à mão)   desktop / tablet deitado
┌──────────────────────┐             ┌────────────────────────────────────┐
│ nível            ctrl │             │ nível                        ctrl  │
├──────────────────────┤             ├───────────┬────────────────────-───┤
│  vai-um: 0 1 1 0      │             │  HUD      │   vai-um: 0 1 1 0       │
│    A:    0 1 0 1      │             │ (acertos, │     A:    0 1 0 1       │
│  + B:    0 0 1 1      │             │  tempo)   │   + B:    0 0 1 1       │
│  ──────────────────   │             │           │   ──────────────────   │
│    =  [0][1][0][0]    │             │           │     =  [0][1][0][0]    │
├──────────────────────┤             ├───────────┴────────────────────-───┤
│      narrador         │             │           narrador                │
└──────────────────────┘             └────────────────────────────────────┘

celular em pé (fase 2/3, circuito)    desktop (fase 2/3, circuito)
┌──────────────────────┐             ┌────────────────────────────────────┐
│ nível            ctrl │             │ nível                        ctrl  │
├──────────────────────┤             ├───────────┬────────────────────-───┤
│  tabela-verdade       │             │  tabela   │   [A]─┬─[XOR]─◉ soma   │
├──────────────────────┤             │           │   [B]─┼─┘               │
│ [A]─┬─[XOR]─◉ soma    │             │  estoque  │       └─[AND]─◉ vai-um │
│ [B]─┼─┘               │             │  de peças │                       │
│     └─[AND]─◉ vai-um  │             │           │                       │
├──────────────────────┤             ├───────────┴────────────────────-───┤
│      narrador         │             │           narrador                │
└──────────────────────┘             └────────────────────────────────────┘
```

Celular deitado: layout da Fase 1 com as 4 linhas (vai-um, A, B, resultado) lado a lado em vez de
empilhadas, para caber na altura reduzida; layout das Fases 2-3 como no celular em pé, mas
tabela-verdade e estoque movidos para a lateral esquerda (igual a Portas lógicas). A Fase 4
(seletor) acrescenta, acima do circuito, dois botões grandes "Soma / AND / OR" (ou um seletor
segmentado) que trocam a operação ativa sem alterar o layout geral.

## Contrato de dados das fases

```ts
export type AluMode = 'manual' | 'half-adder' | 'full-adder' | 'alu-select'
export type AluOp = 'add' | 'and' | 'or'

export interface AluPhase extends PhaseBase {
  mode: AluMode
  /** Número de bits dos operandos (4 em todas as fases além do tutorial). */
  bitCount: number
  /** Só para mode 'manual': quantas somas sorteadas o jogador precisa resolver. */
  targetCount?: number
  /** Só para mode 'half-adder' | 'full-adder': a tabela-verdade completa a validar
   *  (reaproveita truthTable de shared/circuit) e o CircuitTemplate com os slots. */
  template?: CircuitTemplate
  targetTruthTable?: readonly boolean[]
  /** Só para mode 'alu-select': operações que o seletor precisa resolver, nesta ordem. */
  challenges?: readonly { a: number; b: number; op: AluOp }[]
  secondsLimit: number
}
```

`goalValues(phase, { difficulty, untimed })`: para `manual`/`alu-select`, `goal` é
`phase.targetCount`/`phase.challenges.length`; para `half-adder`/`full-adder`, `goal` é
`phase.targetTruthTable.length` (número de casos, igual ao contrato de `gates`). `time` é
`phase.secondsLimit`, ajustado ±20% pela dificuldade, omitido se `untimed`.

### Reuso de `src/games/shared/circuit/` e `src/games/shared/binary/`

A ULA **não cria** módulo compartilhado próprio — ela é a consumidora final de `shared/circuit`
(criado por `gates`) e `shared/binary` (criado por `bits`). Decisões concretas de reuso para quem
for implementar:

- O **meio-somador** (Fase 2) é montado como um `Circuit` de `shared/circuit`:
  `InputNode`s `a`, `b`; `GateNode`s `xorNode` (`XOR`, inputs `[a, b]`) e `andNode` (`AND`, inputs
  `[a, b]`); `OutputNode`s `sum` (input `xorNode`) e `carryOut` (input `andNode`). O
  `CircuitTemplate` da fase deixa `xorNode.gate` e `andNode.gate` como slots vazios
  (`{ kind: 'slot', id, inputs }`) para o jogador preencher via `CircuitSlot`/`GatePiece`.
- O **somador completo** (Fase 3) é montado como dois meios-somadores encadeados: o primeiro
  recebe `a`, `b`; o segundo recebe a `sum` do primeiro e o `carryIn` externo; o `carryOut` final é
  `OR(carryOut1, carryOut2)`. Isso é expresso como um único `Circuit` maior (não dois objetos
  `Circuit` separados) — concatenando os nós do meio-somador 1, do meio-somador 2 e um `GateNode`
  `OR` final, todos com `id`s únicos (prefixados, ex. `ha1_xorNode`, `ha2_xorNode`).
- A **cadeia de 4 bits** (visual da Fase 3, "o vai-um se propaga") é só uma questão de cena: avaliar
  o `Circuit` do somador completo 4 vezes com `evaluateCircuit` (uma por posição de bit),
  alimentando o `carryOut` da posição `i` como `carryIn` da posição `i+1`. Não precisa de um
  `Circuit` de 4 bits unificado — `shared/circuit` não precisa de nenhuma mudança para isso.
- A **Fase 4 (seletor)** não usa `evaluateCircuit`/`truthTable` em tempo real — a lógica pura da
  ULA (`logic/rules.ts`, só desta estação) calcula soma/AND/OR direto com `fromBits`/`toBits` de
  `shared/binary`, já que o circuito completo de seleção (um multiplexador de 4 bits) está fora do
  escopo didático desta estação. Se depois for necessário representar visualmente o seletor como
  circuito de portas, isso é um pedido futuro, não bloqueia esta estação.
- Nenhuma mudança de assinatura é necessária em `shared/circuit`/`shared/binary` para a ULA. Se
  durante a implementação aparecer uma necessidade real, ela vira "pedido à base"/"pedido ao
  agente de Portas lógicas" no relatório final, conforme a seção 2.2 do PLANEJAMENTO — a ULA não
  edita esses módulos diretamente.

## Regras puras a testar

`src/games/alu/logic/rules.ts`:

- `addManual(aBits, bBits)`: soma bit a bit da direita para a esquerda, devolvendo, para cada
  coluna, `{ sum: 0|1, carryOut: 0|1 }` e o resultado final — usada para gerar o gabarito da Fase
  1 e validar a entrada do jogador coluna a coluna (`checkColumn(state, columnIndex, sum, carry)`).
- `checkCircuitPhase(state)` (Fases 2 e 3): monta o `Circuit` a partir do `CircuitTemplate` +
  portas colocadas pelo jogador e chama `truthTable`/`evaluateCircuit` de `shared/circuit`,
  igual ao `checkCircuit` de `gates` — mesma assinatura de eventos (`won`, `incomplete`,
  `mismatch`).
- `computeAluOp(a, b, op)` (Fase 4): soma usando `addManual`, AND/OR bit a bit usando
  `fromBits`/`toBits` de `shared/binary`; devolve o resultado e `{ type: 'answered', correct }`.

Casos de teste:

- `addManual`: `0001 + 0001 = 0010` com carry correto em cada coluna; `1111 + 0001 = 10000`
  (overflow de 4 bits, usado para explicar o limite de bits na dica do Kernel se acontecer).
- O `Circuit` do meio-somador montado via `shared/circuit` reproduz exatamente a tabela-verdade
  do meio-somador binário (A, B → soma = A XOR B, vai-um = A AND B) nos 4 casos.
- O `Circuit` do somador completo reproduz a tabela-verdade de 8 casos (A, B, carryIn → soma,
  carryOut) — inclui o caso 1+1+1=11 (soma 1, carry 1).
- Cadeia de 4 bits: encadear 4 avaliações do somador completo reproduz `addManual` para os mesmos
  operandos, em todos os bits testados (prova de consistência entre o modo manual e o modo
  circuito).
- `computeAluOp`: AND e OR bit a bit batem com o resultado esperado para pares fixos (0b1010,
  0b0110) → AND = 0b0010, OR = 0b1110.
- Vitória/derrota: réplica do padrão de `gates` (tempo esgota = derrota; completar o `goal` antes
  = vitória); estrelas pela fórmula de tempo restante (≥30% → 3, ≥12% → 2, vitória → 1).
- Determinismo: as somas sorteadas da Fase 1 e os desafios sorteados da Fase 4 usam
  `engine/random.ts` com semente; a mesma semente gera a mesma sequência.

## Riscos

- **Dependência direta de `gates` estar mergeada e estável:** esta estação só pode começar depois
  da Onda 4 (`shared/circuit` pronto). Qualquer atraso ou mudança de interface em `gates` depois
  do merge bloqueia `alu` — mitigado pela interface já detalhada no doc de `gates.md` com o caso de
  uso da ULA em mente (nomes de saída múltipla, `carryIn`/`carryOut`).
- **Carga cognitiva alta na Fase 3:** somador completo com 3 entradas e 2 meios-somadores
  encadeados é o ponto mais denso de toda a Onda 4-5. Mitigação: a cena mostra visualmente os dois
  meios-somadores como blocos distintos (não um emaranhado de 5 portas soltas) antes de revelar o
  circuito combinado completo.
- **Risco de a Fase 4 parecer "fora do padrão"** por não usar `shared/circuit` como as Fases 2-3 —
  decisão deliberada (ver seção de reuso) para não exigir um multiplexador visual sem ganho
  didático proporcional; revisar com o dono do projeto se a expectativa era "tudo em circuito"
  até o fim.
- **Overflow de 4 bits:** somar dois números de 4 bits pode passar de 15 (ex. 9+9=18, que não
  cabe em 4 bits). Mitigação: os desafios sorteados das Fases 1 e 4 são filtrados para nunca gerar
  overflow (checado em `addManual`/`computeAluOp` nos testes), evitando confundir o jogador com um
  "vai-um que não tem para onde ir".
- **Acessibilidade do "vai-um" visual:** a ficha de vai-um que "viaja" entre colunas precisa de
  texto alternativo (ex. "vai um para a próxima coluna"), não só animação, para não depender de
  percepção visual de movimento — também respeitar "Menos animações" tornando o deslocamento
  instantâneo quando ativado.
