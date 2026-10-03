# Design doc: Do clique ao pixel (`pixel`)

> **Nota de id:** o rascunho do planejamento (seção 4.11) chama esta estação de "Do clique ao
> pixel" e o pedido de trabalho usa o slug `clique-ao-pixel`. O `StationId` real já existente em
> `src/engine/types.ts` (`STATION_IDS`) e em `src/content/stations.ts`/`src/games/catalog.ts` é
> **`pixel`** — é esse id que `GameMeta.id`, a pasta do módulo (`src/games/pixel/`) e
> `e2e/pixel.spec.ts` precisam usar; não existe (nem deveria ser criado) um id `clique-ao-pixel`
> em `STATION_IDS`. Este arquivo mantém o nome de arquivo pedido
> (`docs/design/clique-ao-pixel.md`) só porque foi o nome explicitamente pedido para o doc; o
> conteúdo todo usa `pixel`.

## Objetivo didático

Depois de jogar, o jogador entende que um clique do mouse não "aparece" na tela por mágica: ele
**percorre o computador inteiro**, passando por cada peça que ele já conheceu nas dez estações
anteriores — campainha (interrupção), decisão (escalonador, ciclo, ULA), dados (cache, RAM,
disco) — até voltar como bits que acendem pixels na tela. É a mesma ideia da Fase 5 de **Bits**
("1 bit = 1 pixel"), agora fechando o círculo: o jogador via um desenho formado por bits isolados;
aqui ele vê **de onde esses bits vieram**.

## Mecânica principal

Tocar, numa jornada guiada em 4 capítulos (as fases), cada um com uma **microtarefa curta**
dentro de uma "versão mini" da cena de uma ou mais estações já jogadas. Não há arraste em
nenhum capítulo (todas as peças reaproveitadas aqui já oferecem a alternativa de toque, e esta
estação usa só essa alternativa — decisão deliberada para não herdar a configuração do
`dnd-kit` de cada estação de origem, que está amarrada à sessão completa daquele jogo, não à
versão mini). Teclado completo (Tab + Enter/Espaço) em cada microtarefa, igual ao padrão do
projeto.

O Kernel narra a jornada como "seguir um clique": cada capítulo abre nomeando a peça de onde ele
já conhece aquele pedaço ("Lembra do Cache? É esta caixinha aqui.") antes de pedir o toque.

## O que cada fase ensina

| Fase               | Ideia nova                                                                 | Como vencer                                                         | Como perder |
| ------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------ |
| Tutorial — Entrada  | Um clique do mouse gera uma **interrupção**: o sistema só reage quando ela toca a campainha. | Tocar o mouse e depois "atender" a campainha guiada (2 toques). | (nunca) |
| Fase 1 — Decisão    | A interrupção acordou uma thread; ela precisa de um núcleo livre (escalonador), e a CPU roda o pedido em três passos (ciclo) terminando numa conta da ULA. | Encaixar a thread num núcleo livre, tocar "Executar" nos 3 passos do ciclo (Buscar→Decodificar→Executar) e escolher a operação certa no seletor da ULA (Soma). | Tempo esgota (bem generoso — ver riscos) |
| Fase 2 — Dados      | O pedido do clique precisa de um dado: primeiro checa o cache (perto, rápido); se falhar, busca na RAM; a imagem do botão em si está guardada no disco. | Resolver 1 acerto e 1 falha de cache (vendo a viagem até a RAM) e "ler" os blocos certos do disco em sequência. | Tempo esgota |
| Fase 3 — Saída      | O resultado final chega como uma fileira de bits; cada bit acende um pixel — a mesma ideia de Bits Fase 5, agora como consequência de tudo que veio antes. | Reproduzir a imagem-alvo (8×8, a mesma do card de Bits ou uma nova, ver **Riscos**) bit a bit. | (nunca — ver riscos) |

Três fases além do tutorial (dentro do intervalo de 3–5 do README), um total de 4 "capítulos"
como pede o rascunho da seção 4.11 do `PLANEJAMENTO.md` (tutorial = capítulo 1 "Entrada").

Detalhes de cada fase:

- **Tutorial (Entrada)** — sem relógio, 100% guiado por `tutorial?: TutorialStep[]` (mesmo padrão
  de `io`/`network`/`memory`): `select` (tocar o mouse), `select` (tocar "Guardar e atender" na
  mini-campainha), `done` (ver a tarefa retomar).
- **Fase 1 (Decisão)** — três microtarefas em sequência, cada uma emprestada de uma estação:
  1. tocar a thread pendente e depois um núcleo livre (mini-`cores`);
  2. tocar "Buscar", depois a instrução certa na paleta mini-`cycle`, depois "Executar";
  3. tocar o seletor "Soma" na mini-ULA e confirmar.
  Tempo generoso (ver riscos — mecânica que depende de reflexo); derrota só por abandono total do
  tempo da fase, nunca por "escolha ruim" recuperável (cada erro só pede para tentar de novo, sem
  perder vida, igual ao espírito de "jogo de decisão, não de reflexo" já usado por Cache/Rede).
- **Fase 2 (Dados)** — duas microtarefas:
  1. dois pedidos de endereço na mini-`cache` (1 acerto guiado, 1 falha guiada com a viagem até a
     RAM, reaproveitando `MemoryTrip`);
  2. "ler" 3 blocos em sequência de uma mini-grade de disco (`storage`), representando os bytes da
     imagem armazenada.
- **Fase 3 (Saída)** — sem relógio e sem derrota (fecha a jornada num tom de celebração, não de
  pressão): uma grade 8×8 de `BitSwitch` (igual à Fase 5 de Bits) já vem com a maior parte dos
  bits certos pré-marcados pela "jornada" que o jogador acabou de fazer, faltando só alguns bits
  para o jogador completar — reforça "você mesmo acendeu este desenho", sem repetir a mecânica
  inteira de Bits do zero.

## Falas do Kernel

- Abertura:
  1. "Você já viu cada peça do computador, uma por uma. Agora vamos ver todas juntas, de uma vez
     só."
  2. "Vou te mostrar o caminho de **um clique só** — do mouse até o pixel que acende na tela."
  3. "Pronto? Clica aí."
- Dica (por fase, ao perder — só aplicável às Fases 1 e 2):
  - Fase 1: "Lembra do escalonador, do ciclo e da ULA? É a mesma coisa, só que mais rápido —
    respira e segue o mesmo passo a passo de sempre."
  - Fase 2: "Primeiro o cache, só depois a RAM — exatamente como na estação Cache. Toque na
    caixinha certa."
- Conexão com a próxima estação: (não há — é a última estação da trilha antes do fechamento).
  A fala final, em vez de "conexão", celebra: "Era isso: um clique percorreu a campainha, a
  decisão, os dados e voltou como luz na tela. Você entendeu o computador inteiro."

## Card de conceito

1. `click-path` — **"O caminho de um clique"** / termo técnico **Pipeline de entrada e saída**
   (end-to-end) / resumo: "Um clique é interrupção, decisão (escalonador, ciclo, ULA), busca de
   dados (cache, RAM, disco) e, por fim, bits que acendem pixels — tudo em menos de um milésimo de
   segundo." / analogia: "Como uma corrida de revezamento: cada peça do computador passa o bastão
   para a próxima, bem rápido, sem nunca derrubar." / mundo real: "Um computador moderno faz esse
   percurso inteiro **bilhões** de vezes por segundo, para cada clique, tecla e quadro de tela."
   / ícone `pixel` (já existe em `src/ui/icons.tsx`, usado hoje só no mapa/Manual para a própria
   estação). Liberado na **Fase 3 (Saída)**, ao fim da jornada.

Só um card, de propósito: esta estação não ensina um conceito novo, ela **amarra** os onze já
ensinados — um card só, de síntese, evita repetir resumos que já têm o próprio card em outra
estação.

## Layout mobile e desktop

```
celular em pé (Fase 1, Decisão)        desktop / tablet deitado
┌──────────────────────┐              ┌──────────────────────────────────────┐
│ nível            ctrl │              │ nível                           ctrl │
├──────────────────────┤              ├───────────┬────────────────────────────┤
│        HUD             │              │   HUD      │  mini-cores → mini-cycle   │
├──────────────────────┤              │ (passo    │  → mini-alu (3 caixas em   │
│   passo 1: mini-cores  │              │  atual)    │  linha, a atual em destaque)│
│   (1 núcleo, 1 thread) │              │            │                             │
├──────────────────────┤              │            │                             │
│   passo 2: mini-cycle  │              ├───────────┴────────────────────────────┤
│   (Registers + 1 gaveta)│             │              narrador                   │
├──────────────────────┤              └──────────────────────────────────────┘
│   passo 3: mini-alu    │
│   (seletor Soma/AND/OR)│
├──────────────────────┤
│      narrador           │
└──────────────────────┘
```

No celular em pé, os três passos da Fase 1 ficam **empilhados e só o passo atual é interativo**
(os outros dois ficam esmaecidos/recolhidos — "feito"/"a seguir"), igual ao padrão de progressão
guiada do `cycle` (três estações Buscar→Decodificar→Executar). No desktop/tablet deitado, as três
caixas ficam lado a lado, lidas da esquerda para a direita, reforçando visualmente "um clique
atravessando a máquina".

A Fase 2 (Dados) segue o mesmo princípio em dois passos (mini-cache, depois mini-disco); a Fase 3
(Saída) usa a grade 8×8 cheia de `BitSwitch`, igual ao layout já aprovado em `docs/design/bits.md`
(Fase 5) — grade rolável verticalmente se precisar, nunca rolagem horizontal, células ≥44×44px.

## Contrato de dados das fases

```ts
export type PixelChapter = 'entrada' | 'decisao' | 'dados' | 'saida'

/** Passo de uma fase de vários passos (Fases 1 e 2): cada passo é a
 *  microtarefa de uma estação de origem. */
export interface PixelStep {
  id: string
  from: 'io' | 'cores' | 'cycle' | 'alu' | 'cache' | 'memory' | 'storage' | 'bits'
  /** O que conclui este passo (nomes alinhados ao `advanceOn` já usado por
   *  outras estações: 'select' | 'place' | 'done' | 'goal'). */
  advanceOn: 'select' | 'place' | 'done'
}

export interface PixelPhase extends PhaseBase {
  chapter: PixelChapter
  /** Passos desta fase, na ordem em que acontecem (vazio na Fase 3, que não
   *  tem passos de outra estação — é só a grade de bits). */
  steps: readonly PixelStep[]
  /** Imagem-alvo da Fase 3 (Saída): 64 bits, 0|1, mesma convenção de
   *  `BitsPhase.images` (design doc `bits.md`). */
  targetImage?: readonly (0 | 1)[]
  /** Fase 3: quantos desses 64 bits já chegam pré-marcados (o "resto da
   *  jornada já fez por você"), o jogador só completa o restante. */
  prefilledCount?: number
  secondsLimit: number
  tutorial?: TutorialStep[]
}
```

`goalValues(phase, { difficulty, untimed })` devolve `{ goal: phase.steps.length || 64, time:
phase.secondsLimit }` (omitido se `untimed` ou se a fase não tem relógio, como a Fase 3).

### Reuso por capítulo — componentes e funções exatas

| Capítulo | De onde | O que já existe e pode ser importado direto | O que precisa de uma versão "mini" nova |
| -------- | ------- | --------------------------------------------- | ------------------------------------------ |
| 1. Entrada | `io` | ícone `io-mouse` (`src/games/io/icons.tsx`, registrado globalmente no boot pelo `registry.ts` — qualquer estação pode usar `<Icon name="io-mouse">` sem importar nada de `io`) | o painel "campainha + botão Guardar e atender" só existe dentro do default export `src/games/io/scene/IoScene.tsx`, acoplado a `useIoSession` (fila, paciência, DMA). **Pedido à base** (ver seção própria): extrair um componente de apresentação puro. |
| 2. Decisão (escalonador) | `cores` | — | `Processor`/`CoreBox`/`SlotView` (`src/games/cores/scene/Processor.tsx`) usam `useDraggable`/`useDroppable` do `dnd-kit` e os tipos `CoreModel`/`SlotModel`/`DragSource` de `useCoresSession`; não há uma via de leitura "só mostrar e tocar". **Pedido à base.** |
| 2. Decisão (ciclo) | `cycle` | `Registers` (`src/games/cycle/scene/Registers.tsx`) — componente puro, só `{ pc, acc, pulse }`, **reusável direto, sem pedido**; `MemoryShelf`/`Drawer` de `shared/memory` com `renderValue` mostrando o mnemônico (padrão já estabelecido por `cycle`) | as três caixas "Buscar/Decodificar/Executar" são markup inline em `src/games/cycle/scene/CycleScene.tsx` (não é um componente à parte). Simplificação adotada: a versão mini de `pixel` usa só `Registers` + **um** botão "Executar" (sem desenhar as três caixas), perdendo a ênfase visual no ciclo completo — aceitável porque o jogador já aprendeu isso na estação `cycle`. |
| 2. Decisão (ULA) | `alu` | `computeAluOp(a, b, op)` (`src/games/alu/logic/rules.ts`) — função pura, **reusável direto** para calcular o resultado por trás do seletor | o seletor visual "Soma/AND/OR" é markup dentro do único default export `src/games/alu/scene/AluScene.tsx`, misturado com os modos `manual`/`circuit` e o loop de tempo. **Pedido à base** (extrair `OpSelector`). |
| 3. Dados (cache) | `cache` | `CacheSlots` (`src/games/cache/scene/CacheSlots.tsx`) — componente puro, só `{ label, slots, awaitingEviction, flash, onEvict }`, **reusável direto, sem pedido** | — |
| 3. Dados (RAM) | `memory`/`shared/memory` | `MemoryShelf`, `Drawer`, `MemoryTrip`, `createMemory`/`readMemory`/`writeMemory` de `@/games/shared/memory` — todos **reusáveis direto, sem pedido** (já é o contrato pensado para múltiplos consumidores) | — |
| 3. Dados (disco) | `storage` | `applyOperation`/`allocate` de `src/games/storage/logic/rules.ts` são funções puras, mas **não precisam ser reusadas** — a versão mini não simula fragmentação/HD×SSD, só "ler" blocos em ordem fixa | a grade de blocos é markup inline em `src/games/storage/scene/StorageScene.tsx` (não há `DiskGrid` à parte; o estado também fica só lá, sem um hook `useStorageSession` separado). **Pedido à base** (extrair `DiskGrid` de apresentação). |
| 4. Saída | `bits`/`shared/binary` | `BitSwitch`, `BitRow`, `toBits`/`fromBits`/`formatBinary` de `@/games/shared/binary` — **reusáveis direto, sem pedido** (é exatamente o que a própria Fase 5 de `bits` já faz: `BitSwitch` numa grade CSS própria, não um componente de grade dedicado) | nada — a grade 8×8 de `pixel` é só CSS próprio (`pixel.css`, nos mesmos moldes de `.bits-grid`/`.bits-pixel` em `src/games/bits/scene/bits.css`), sem depender de nenhum componente exclusivo de `bits` além do que já é compartilhado. |

Resumo do padrão encontrado: os módulos **`shared/binary`**, **`shared/memory`** e os dois
componentes isolados **`Registers`** (cycle) e **`CacheSlots`** (cache) já são presentational e
"mini-prontos" hoje — foram desenhados (ou já nasceram simples o bastante) para serem consumidos
fora da própria sessão. As demais quatro origens (`io`, `cores`, `alu`, `storage`) guardam o
visual que `pixel` precisa **dentro do único componente de cena da estação**, misturado com o
hook de sessão completo (fila, drag-and-drop, tempo, derrota) — não há como importar só a parte
visual sem rodar o jogo inteiro por baixo. Isso é o cerne da seção **Pedidos à base**.

## Regras puras a testar

`src/games/pixel/logic/rules.ts` (estado → estado, eventos, sem React — mesmo padrão de todas as
outras estações):

- `advanceStep(state, stepId)` — confirma um passo de uma fase de vários passos (Fases 1 e 2) na
  ordem declarada em `phase.steps`; fora de ordem é ignorado (não há "erro fatal", só o Kernel
  repetindo a dica, igual ao padrão de tutorial "pular adiante" do projeto).
- `scheduleThread(state)` — mini-versão de `cores`: marca a thread única como "rodando" no único
  núcleo livre; sempre tem exatamente uma solução (não há fila nem concorrência, é só a ideia de
  "precisa de um núcleo livre").
- `runCycleStep(state)` — avança Buscar→Decodificar→Executar uma vez (reaproveita a tabela de
  opcodes de `cycle` só como referência visual no texto, sem reimplementar decodificação real:
  aqui só existe **uma** instrução fixa por fase).
- `selectAluOp(state, op)` — delega para `computeAluOp` de `alu/logic/rules.ts` (import direto,
  sem copiar a lógica) e confere `op === 'add'`.
- `resolveCacheStep(state, address)` — delega para `lookup`/`resolveRequest`-like de
  `cache/logic/rules.ts` num cache de 1 espaço só, com 1 acerto e 1 falha fixos (determinístico,
  sem sorteio — a sequência de endereços é fixa nos dados da fase).
- `readDiskBlocks(state, blockIndex)` — "lê" os blocos de `phase.diskSequence` (campo extra, não
  listado no contrato acima por ser só uma lista de 3 números fixos) na ordem certa; fora de
  ordem não avança.
- `togglePixelBit(state, index)` — alterna um bit não pré-marcado da grade 8×8 (bits em
  `prefilledCount` já vêm fixos e não podem ser alternados); delega a comparação final para
  `fromBits`/`toBits` de `shared/binary`, igual a `bits/logic/rules.ts`.
- `computeOutcome(state)` — vitória ao concluir todos os `steps` (Fases 1–2) ou toda a grade
  (Fase 3); estrelas sempre ≥ 1 em vitória, pela fórmula de tempo restante nas Fases 1–2 (réplica
  do padrão ≥30%→3, ≥12%→2) e, na Fase 3 (sem relógio), pelo número de bits que o próprio jogador
  precisou tocar (menos toques fora do alvo = mais estrelas, mesmo espírito do bônus de eficiência
  de `bits` Fase 3).

Casos de teste:

- `advanceStep` ignora um passo fora de ordem e aceita o passo certo mesmo que o jogador tente o
  errado antes.
- `selectAluOp(state, 'add')` bate com `computeAluOp(1, 1, 'add')` da estação `alu` (teste de
  integração leve entre os dois módulos de lógica, prova de que o import direto está correto).
- `resolveCacheStep`: a sequência fixa da fase sempre gera exatamente 1 acerto e 1 falha, nessa
  ordem, para qualquer seed (determinismo — aqui sem sorteio real, mas o teste documenta que não
  há variação).
- `togglePixelBit` nunca altera um índice dentro de `prefilledCount`.
- Vitória/derrota: réplica do padrão das outras estações (tempo esgota nas Fases 1–2 = derrota;
  Fase 3 nunca perde).
- Determinismo: como nenhuma fase desta estação sorteia nada (tudo é fixo nos dados, igual a
  `cycle`/`gates`), o teste de determinismo é "a mesma sequência de toques do jogador sempre
  produz o mesmo resultado final", sem depender de `engine/random.ts`.

## Riscos

- **Dependência de 10 módulos diferentes ao mesmo tempo:** esta é, de longe, a estação com mais
  acoplamento do projeto — qualquer uma das outras dez pode, em tese, travar a implementação desta
  (é por isso que o planejamento a coloca só na Onda 6, depois de todas as outras mergeadas). A
  tabela de reuso acima já é a mitigação principal: ela fixa exatamente o que é import direto
  (baixo risco) e o que precisa de um pedido à base resolvido **antes** de `pixel` entrar em
  construção (seção seguinte).
- **Manutenção futura se uma estação de origem mudar sua cena:** os quatro componentes "mini"
  pedidos (`io`, `cores`, `alu`, `storage`) ficam, por natureza, acoplados ao visual daquela
  estação. Se `cores` redesenhar `Processor` depois que `pixel` existir, o preview pode ficar
  visualmente desalinhado com o jogo real. Mitigação proposta: os componentes de preview devem
  **importar os mesmos tipos** (`CoreState`, `AppId`, cores de app etc.) da estação de origem, não
  duplicá-los — e qualquer estação que altere sua cena de verdade deve, no próprio PR, conferir
  (visualmente, não só por tipo) se o preview usado por `pixel` ainda faz sentido. Não há como
  automatizar isso com teste de tipo sozinho; vale um teste de regressão visual futuro (fora do
  escopo desta estação) ou, no mínimo, um apontamento no `DECISIONS.md` de quem mudar uma cena de
  origem.
- **Carga cognitiva: muita coisa familiar, rápido:** o risco contrário ao de todas as outras
  estações (que introduzem 1 ideia nova por vez) — aqui são **dez** ideias já vistas, relembradas
  em sequência. Mitigação: o Kernel sempre nomeia a estação de origem antes do toque ("Lembra do
  Cache?"), e os passos ficam sempre visíveis um a um (nunca as quatro fases ao mesmo tempo na
  tela), replicando o padrão "progresso guiado" de `cycle`/`io`.
- **Mecânica parecer repetitiva/"só clicar" sem o contexto de jogo original:** cada microtarefa
  perde a pressão e a profundidade da estação original (não há fila no mini-`cores`, não há
  fragmentação no mini-`storage`). Isso é intencional (ver "simplificações" na tabela de reuso),
  mas o texto precisa deixar claro que é "a mesma ideia, numa versão rápida" — não uma versão
  nova e mais fácil do próprio jogo.
- **Imagem-alvo da Fase 3 repetir ou não a de Bits:** reusar a mesma imagem-alvo de `bits` Fase 5
  fecha o círculo de forma mais clara, mas exige saber exatamente quais 64 bits aquela fase usa
  (`BitsPhase.images`, em `src/games/bits/phases.ts`) — como é um array de dados, não um
  componente, isso é só leitura (sem pedido à base), mas precisa ser decidido explicitamente
  antes da implementação (qual desenho, e se `prefilledCount` é fixo ou varia por dificuldade).
- **Acessibilidade das transições entre "passos":** cada passo escondido/revelado (esmaecer o
  passo anterior, destacar o atual) precisa de um anúncio de leitor de tela equivalente ao
  `aria-live` já usado no restante do projeto, nunca só uma transição visual.
- **Tempo generoso nas Fases 1–2 pode, ainda assim, parecer reflexo:** como o objetivo é celebrar,
  não desafiar, o modo sem tempo deveria ser o padrão sugerido de jogo (ligado por padrão?, a
  decidir com o dono do projeto) — ou, alternativamente, esta estação nem oferecer relógio em
  nenhuma fase (todas como a Fase 3). Fica como decisão pendente de aprovação deste doc, não
  resolvida aqui.

## Pedidos à base

Esta estação só pode ser implementada com segurança depois que, pelo menos, um destes pedidos for
resolvido (branch curta `base/mini-<id>` por estação de origem, como já previsto na seção
"Onda 6" do `PLANEJAMENTO.md`). Nenhuma mudança foi feita neste trabalho — são pedidos para o
orquestrador avaliar e decidir quem implementa:

1. **`io`** — extrair de `src/games/io/scene/IoScene.tsx` um componente de apresentação puro para
   o par "dispositivo piscando + botão Guardar e atender" (ex.: `IoDevicePreview({ device,
   ringing, guarded, onGuard, onAttend })`), sem `useIoSession`, sem fila, sem paciência. O ícone
   `io-mouse` já é reusável direto hoje (ver tabela); só falta o painel.
2. **`cores`** — extrair de `src/games/cores/scene/Processor.tsx` uma variante sem `dnd-kit`
   (sem `useDraggable`/`useDroppable`) dos mesmos `CoreBox`/`SlotView`, recebendo um estado
   estático (`CoreModel`/`SlotModel`, já exportados) e um `onTap(slot)` simples — sem fila de
   threads, sem SMT, sem pontuação. Útil não só para `pixel`: também serviria de ilustração
   estática em telas futuras (ex.: Manual).
3. **`alu`** — extrair de `src/games/alu/scene/AluScene.tsx` o seletor "Soma/AND/OR" da Fase 4
   (`OpSelector({ value, onChange, result })`) como componente isolado do modo `manual`/`circuit`
   e do loop de tempo. `computeAluOp` (a função pura) já é reusável direto hoje.
4. **`storage`** — extrair de `src/games/storage/scene/StorageScene.tsx` um `DiskGrid({ blocks,
   onBlockClick, highlightBlocks })` de apresentação pura, hoje markup inline. Como o estado da
   estação já fica só no próprio componente (não há `useStorageSession` separado para já migrar
   depois), esta extração é puramente de UI, sem tocar em hook.
5. **Pedido estrutural, para o orquestrador decidir (não é um pedido a uma estação específica):**
   considerar acrescentar um campo opcional `Preview?: ComponentType<...>` ao `GameModule`
   (`src/engine/types.ts`, hoje território da base/Etapa 0.5) como convenção formal para "versão
   mini sem lógica de derrota" — isso teria evitado a investigação ad hoc acima e evitaria o
   mesmo problema se uma estação 12+ precisar reaproveitar cenas no futuro. Não é bloqueante para
   `pixel` (os 4 pedidos específicos acima bastam), mas é uma lição desta etapa que vale registrar
   para quem mantiver o projeto depois da Etapa 12.

Nenhum destes pedidos exige mudança de `package.json`/dependências novas — são extrações de
componente dentro de pastas que já existem.
