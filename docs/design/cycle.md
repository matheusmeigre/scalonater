# Design doc: O ciclo da CPU (`cycle`)

> Depende de `src/games/shared/memory/` (estação Memória). Este doc assume a API descrita em
> `docs/design/memory.md`, seção "Módulo compartilhado `src/games/shared/memory/`" — leia-a
> antes de implementar.

## Objetivo didático

Depois de jogar, o jogador entende que a CPU não "sabe" o programa de uma vez: ela repete, uma
instrução por vez, o ciclo **buscar → decodificar → executar**, usando o **contador de
programa** para saber onde está e **registradores** para guardar o que está calculando. Um
programa é só uma lista de instruções guardada na mesma memória que guarda dados.

## Mecânica principal

As instruções do miniprograma ficam em gavetas da RAM (reaproveitando `MemoryShelf` de
`shared/memory`, com `renderValue` mostrando o mnemônico em vez do número puro). O jogador leva
cada instrução, uma a uma, por três estações dispostas em linha — **Buscar → Decodificar →
Executar** — tocando em cada uma na ordem:

1. **Buscar:** a gaveta apontada pelo **contador de programa (PC)** pisca; o jogador toca nela.
   O valor "viaja" (via `MemoryTrip`) até a estação Buscar.
2. **Decodificar:** uma paleta com as peças de instrução (`CARREGA`, `SOMA`, `GUARDA`, `PULA`,
   `PULASZ`) aparece; o jogador toca a peça que corresponde ao mnemônico mostrado na estação
   Buscar.
3. **Executar:** o jogador toca o botão "Executar", que aplica o efeito (atualiza o
   **acumulador (ACC)**, grava na memória ou muda o PC) com uma animação no registrador ou na
   gaveta afetada.

Só toque e teclado (Tab percorre Buscar → Decodificar → Executar na ordem; Enter confirma); não
há arraste. O kit `src/ui/dnd` não é usado — a progressão em três estações já força a ordem certa
sem precisar soltar peças em lugares variáveis.

### Conjunto de instruções (fixo para toda a estação)

| Mnemônico | Efeito                              | Operando  |
| --------- | ------------------------------------ | --------- |
| `CARREGA` | `ACC ← mem[endereço]`                | endereço  |
| `SOMA`    | `ACC ← ACC + mem[endereço]`          | endereço  |
| `GUARDA`  | `mem[endereço] ← ACC`                | endereço  |
| `PULA`    | `PC ← endereço`                      | endereço  |
| `PULASZ`  | se `ACC ≠ 0`: `PC ← endereço`        | endereço  |

Cada instrução é codificada como um único número (`opcode * 100 + endereço`, endereço de 0 a 99)
para caber no `number | null` das gavetas de `shared/memory`; `content.ts` guarda a função de
decodificação usada pelo `renderValue` (ex.: `201` → `"SOMA 01"`).

## O que cada fase ensina

| Fase     | Ideia nova                                             | Como vencer                                    | Como perder                               |
| -------- | -------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------- |
| Tutorial | As três estações do ciclo, com uma única instrução       | Completar `CARREGA` (buscar, decodificar, executar) | (nunca)                                      |
| Fase 1   | O PC avança sozinho depois de cada execução              | Rodar um programa de 4 instruções (`CARREGA`, `SOMA`) até o fim | 2 decodificações erradas                      |
| Fase 2   | Registrador/acumulador acumulando valores de várias instruções | Rodar um programa de 6 instruções usando `CARREGA`/`SOMA`/`GUARDA` e bater a meta de ACC final | 3 decodificações erradas ou 2 execuções no registrador errado |
| Fase 3   | Desvio e laço (`PULA`/`PULASZ`)                            | Rodar um programa de 8 instruções com um laço que repete 3 vezes antes de sair | 3 erros, ou deixar o laço passar de 6 repetições (loop infinito) |
| Fase 4   | O relógio acelera: menos tempo por estação                | Completar um programa de 6 instruções com metade do tempo por estação da Fase 2 | 2 erros (qualquer estação)                   |

Detalhes de cada fase:

- **Tutorial** — 4 gavetas visíveis (só a instrução ocupa uma; o resto fica vazio para não
  distrair), sem relógio. Etapas guiadas: `select` (tocar a gaveta do PC), `select` (tocar a
  peça `CARREGA` certa), `done` (tocar Executar) — mesma convenção `advanceOn` do Núcleos.
- **Fase 1** — programa de 4 instruções (`CARREGA 00`, `SOMA 01`, `GUARDA 02`, `PULA 00`, para
  demonstrar que o PC volta ao início só nesta fase é usado como "fim de rodada", não como laço
  propriamente — a ideia nova aqui é só "o PC não pergunta, ele avança"); 8s por estação.
- **Fase 2** — programa de 6 instruções sem `PULA`; o painel de registradores mostra PC e ACC
  sempre visíveis, com `pulse` no ACC a cada execução que o altera. Meta: ACC final = valor
  definido pela fase (ex.: 15), mostrado como `{goal}` no texto.
- **Fase 3** — programa de 8 instruções com um contador decrescente guardado numa gaveta
  (`GUARDA`) e `PULASZ` voltando ao início do laço enquanto o contador não chega a 0; o jogador
  vê o mesmo trecho de gavetas sendo percorrido 3 vezes. Um limite de 6 repetições do laço vira
  derrota (protege contra o jogador decodificar errado e criar um laço que nunca para).
- **Fase 4** — mesmo formato da Fase 2, mas com `secondsPerStation` pela metade; textualmente é
  "a CPU acelerou" (liga com a ideia de clock mais rápido), não uma mecânica nova de regra.

## Falas do Kernel

- Abertura:
  1. "Bem-vindo ao coração da CPU! Todo programa roda como uma dancinha de três passos."
  2. "**Buscar** a instrução na memória, **decodificar** o que ela quer dizer, **executar** o
     que ela manda. De novo, de novo, bilhões de vezes por segundo."
  3. "Vamos fazer isso devagarzinho, um passo por vez. Toca a gaveta que o contador de programa
     está apontando!"
- Dica (por fase, ao perder):
  - Fase 1: "Você decodificou a peça errada. Olha o mnemônico que apareceu em Buscar antes de
    escolher a peça."
  - Fase 2: "O acumulador guarda um valor só até a próxima conta — confere o que `CARREGA` e
    `SOMA` fazem com ele antes de executar."
  - Fase 3: "O `PULASZ` só volta se o acumulador não for zero. Se ele ficar voltando pra sempre,
    é sinal de que o contador não está chegando a zero — olha o `GUARDA` do laço."
  - Fase 4: "O relógio acelerou! Respira: o ciclo é o mesmo de antes, só que mais rápido."
- Conexão com a próxima estação: "Buscar na RAM toda hora é meio lento. E se a gente guardasse
  bem perto da CPU só o que ela usa mais? Próxima estação: o cache."

## Card de conceito

- `unlocksCard: 'instruction-cycle'` na Fase 1:
  - título "Buscar, decodificar, executar", termo técnico "Ciclo de instrução", resumo "O
    processador repete esses três passos para rodar cada linha de um programa", analogia "ler
    uma receita (buscar), entender o passo (decodificar) e fazer (executar), um de cada vez",
    fato real "processadores modernos começam a buscar a instrução seguinte antes de terminar a
    atual (pipeline), mas sempre seguindo esses três passos", ícone `'cycle'` (já existe em
    `src/ui/icons.tsx`).
- `unlocksCard: 'register'` na Fase 2:
  - título "A mesinha de trabalho da CPU", termo técnico "Registrador", resumo "Um espacinho
    minúsculo e superrápido dentro da própria CPU, para guardar o valor em que ela está
    trabalhando agora", analogia "a mão que segura a peça enquanto você monta um quebra-cabeça,
    em vez de ir até a caixa a cada peça", fato real "um registrador é muito mais rápido que a
    RAM — por isso a CPU evita ir até a memória sempre que pode", ícone `'alu'`.

## Layout mobile e desktop

```
celular em pé                        desktop / tablet deitado
┌──────────────────────┐             ┌──────────────────────────────────────┐
│ nível           ctrl │             │ nível                           ctrl  │
├──────────────────────┤             ├───────────┬────────────────────────────┤
│        HUD             │             │   HUD      │  PC: 03   ACC: 12          │
├──────────────────────┤             │ (regs)     │  ┌──────┐┌──────┐┌──────┐  │
│   PC: 03    ACC: 12    │             │            │  │Buscar││Decod.││Exec. │  │
│   (registradores)      │             │            │  └──────┘└──────┘└──────┘  │
├──────────────────────┤             │            │                             │
│ ┌────┐┌────┐┌────┐     │             │            │   estante de gavetas        │
│ │Busc││Deco││Exec│     │             │            │   (MemoryShelf, 4×2)        │
│ └────┘└────┘└────┘     │             ├───────────┴────────────────────────────┤
├──────────────────────┤             │              narrador                   │
│   estante de gavetas    │             └──────────────────────────────────────┘
│   (MemoryShelf, 2×N)    │
├──────────────────────┤
│      narrador           │
└──────────────────────┘
```

Os registradores (PC, ACC) são um componente próprio desta estação (`scene/Registers.tsx`), não
fazem parte de `shared/memory` — eles não têm endereço, são "memória interna" da CPU. A estante
usa `MemoryShelf` com `renderValue` mostrando o mnemônico decodificado (ex.: `"SOMA 01"`) em vez
do número bruto, e `highlightAddress` seguindo o PC a cada busca.

## Contrato de dados das fases

```ts
export interface CycleInstruction {
  op: 'CARREGA' | 'SOMA' | 'GUARDA' | 'PULA' | 'PULASZ'
  address: number
}

export interface CyclePhase extends PhaseBase {
  /** Programa fixo da fase, já como instruções decodificadas (a codificação para a
   * gaveta — number — é feita por `encodeInstruction` em `logic/`). */
  program: readonly CycleInstruction[]
  /** Tamanho da estante exibida (>= program.length). */
  shelfSize: number
  columns: number
  secondsPerStation: number
  /** Meta de ACC ao final do programa, quando a fase pede um valor (fases 2 e 4). */
  goalAcc?: number
  /** Limite de repetições do laço antes de contar como derrota (fase 3). */
  maxLoopIterations?: number
  maxMistakes: number
  stars: { metric: 'timeLeft' | 'mistakesLeft'; thresholds: readonly [number, number] }
}
```

`goalValues(phase, { difficulty, untimed })` devolve `{ goal: phase.goalAcc ?? phase.program.length,
time: phase.secondsPerStation }`.

## Regras puras a testar

- `encodeInstruction`/`decodeInstruction` — ida e volta sem perda para as 5 operações e
  endereços 0–99.
- `loadProgram(phase)` — grava `phase.program` codificado nas gavetas via `writeMemory` do
  módulo compartilhado, a partir do endereço 0; teste confirma que `readMemory` devolve o número
  esperado em cada posição.
- `fetch(state)` — lê a gaveta do PC atual (usa `readMemory`), devolve a instrução decodificada
  e um evento `fetched`.
- `decode(state, chosenOp)` — compara `chosenOp` com a operação buscada; acerto avança para
  "pronto para executar", erro soma 1 a `mistakes` e quebra o combo.
- `execute(state)` — aplica o efeito da instrução (`CARREGA`/`SOMA`/`GUARDA` chamam
  `readMemory`/`writeMemory`; `PULA`/`PULASZ` mudam o PC) e avança o PC em 1 quando a instrução
  não é um desvio tomado; devolve o novo estado e um evento (`executed`, com o registrador ou a
  gaveta afetada, para a animação).
- `computeOutcome(state)` — vitória quando o PC passa do fim do programa (ou, na fase 3, quando
  o laço termina com o contador em 0) com `goalAcc` atingido se a fase define um; derrota ao
  atingir `maxMistakes` ou `maxLoopIterations`; estrelas por tempo restante médio por estação ou
  por erros restantes, sempre ≥ 1 em vitória.
- Determinismo: como o programa é fixo por fase (não há sorteio), o teste de determinismo aqui é
  que `loadProgram` + a mesma sequência de ações do jogador sempre produz o mesmo `ACC` final e
  os mesmos eventos, em vez de depender de semente aleatória.

## Riscos

- **Três estações em sequência confundirem com "três telas":** reforçar visualmente que é uma
  linha única (setas entre as caixas Buscar → Decodificar → Executar) e repetir a dica do Kernel
  sempre que o jogador tocar fora de ordem.
- **`PULASZ` ser o conceito mais difícil da trilha até aqui:** a Fase 3 usa um laço bem pequeno
  (3 repetições) e o `maxLoopIterations` evita frustração em caso de decodificação errada que
  criaria um laço infinito; a dica do Kernel aponta exatamente a causa mais comum (contador que
  não chega a zero).
- **Dependência de `shared/memory` atrasar o início desta estação:** o contrato já está fixado
  no doc da Memória; se algo faltar (ex.: um `renderValue` que não cobre o caso do mnemônico),
  isso é pedido à base/Memória, não edição direta do módulo.
- **Ritmo da Fase 4 ("relógio acelera") ficar baseado em reflexo:** a meta continua sendo a mesma
  da Fase 2 (não aumenta a quantidade de instruções nem exige precisão maior); só o tempo por
  estação cai, e o modo sem tempo neutraliza essa pressão por completo.
- **Acessibilidade:** o estado de cada estação (Buscar/Decodificar/Executar "pronta" ou "feita")
  nunca só por cor — usar ícone de check e texto no `aria-label` de cada caixa.
