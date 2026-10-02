# Design doc: Memória (RAM) (`memory`)

## Objetivo didático

Depois de jogar, o jogador entende que **a memória principal (RAM) é uma estante de gavetas
numeradas**: cada gaveta tem um **endereço** (a numeração, fixa) e um **conteúdo** (o valor
guardado ali, que muda). Guardar e buscar um número são a mesma operação básica — "ir até o
endereço certo" — e essa estante **esquece tudo quando a energia falta**, ao contrário do
armazenamento (SSD/HD), que o jogador vai conhecer na estação 7.

## Mecânica principal

O jogador recebe **pedidos** numa fila (fichas, uma por vez em destaque): `GUARDAR 42 → gaveta
5` ou `LER gaveta 3`. A ação central é **tocar a ficha do pedido e depois tocar a gaveta de
destino** (ou direto na gaveta quando só existe um pedido em foco). Para `GUARDAR`, a ficha traz
o valor a escrever; tocar nela "pega" o valor (ela fica destacada/selecionada) e o próximo toque
numa gaveta o deposita ali, com animação de escrita. Para `LER`, tocar na gaveta já basta: o
valor sai animado da gaveta até o visor do pedido.

Não há arraste nesta estação — só toque e teclado (Tab até a ficha, Enter para selecionar; Tab
até a gaveta, Enter para confirmar), o que cobre "tocar → tocar" e teclado completo sem precisar
do kit `src/ui/dnd`. A pressão vem do tempo (uma barra por pedido, como a paciência do Núcleos);
o modo sem tempo desliga essa barra e roda a fila mais devagar.

## O que cada fase ensina

| Fase     | Ideia nova                                                               | Como vencer                                            | Como perder                                                      |
| -------- | ------------------------------------------------------------------------ | ------------------------------------------------------- | ----------------------------------------------------------------- |
| Tutorial | Endereço × conteúdo: a gaveta não muda de número, o que tem dentro muda | Completar os 3 pedidos guiados (guardar, ler, guardar)  | (nunca)                                                           |
| Fase 1   | Guardar e buscar em ritmo, sem guia                                     | Completar 8 pedidos antes do tempo acabar               | 3 pedidos expiram (perdem a barra) ou a sessão acaba sem atingir a meta |
| Fase 2   | Endereços em binário (liga com Bits)                                    | Completar 8 pedidos cujo endereço vem escrito em binário (`0101` = gaveta 5) | igual à Fase 1, mais errar a gaveta binária 2 vezes          |
| Fase 3   | Sobrescrever: o valor antigo se perde; variáveis que mudam              | Completar 10 pedidos, incluindo releituras de um "contador" que muda a cada rodada | sobrescrever sem perceber que a ficha pedia **somar**, não trocar (3 erros) |
| Fase 4   | Memória volátil: falta de energia apaga a estante                       | Sobreviver a 2 "quedas de energia" (recuperando o que for `GUARDAR` de novo depois) e completar 10 pedidos no total | não repor a tempo um valor crítico perdido na queda (o pedido seguinte de `LER` aquele endereço expira) |

Detalhes de cada fase:

- **Tutorial** — 4 gavetas visíveis, sem relógio, sem derrota. Três etapas guiadas por
  `useTutorialSteps`: `select` (tocar a ficha "guardar 7"), `place` (tocar a gaveta 2), `select`
  de novo (ficha "o que tem na gaveta 2?"), `place` (tocar a gaveta 2 de novo para ler).
- **Fase 1** — 8 gavetas, pedidos com endereço e valor em decimal (0–99), uma ficha por vez,
  barra de tempo de 6s por ficha (4,5s no modo sem tempo, mas aí o jogo roda a 75% da velocidade
  como o padrão do projeto).
- **Fase 2** — mesmas 8 gavetas, mas cada gaveta mostra o próprio número **em binário de 3
  bits** acima dela (`000`–`111`) e o pedido chega só em binário; o jogador converte de cabeça ou
  conta os bits. Não introduz um novo widget: é o mesmo `MemoryShelf` com
  `addressFormat="binary"` (ver módulo compartilhado).
- **Fase 3** — 10 gavetas; metade dos pedidos usa um endereço fixo (`contador`, gaveta 0) que é
  lido, incrementado "na mão" (o pedido diz o novo valor) e guardado de novo — o jogador vê o
  valor antigo desaparecer. Pedidos de escrita trazem o selo "sobrescreve" quando a gaveta já
  está ocupada.
- **Fase 4** — 10 gavetas; depois do 4º e do 8º pedido completados, a tela escurece por um
  instante (narração do Kernel: "a luz caiu!") e todas as gavetas esvaziam
  (`eraseAll`, ver módulo compartilhado) — **exceto** que o próximo pedido de `LER` que dependia
  de um valor perdido chega com uma barra de tempo maior, dando a chance de regravar antes.

## Falas do Kernel

- Abertura:
  1. "Chegamos na **Memória**! Pensa numa estante enorme de gavetinhas numeradas."
  2. "Cada gaveta tem um **endereço** — o número dela, que nunca muda — e um **conteúdo**, que
     a gente troca o quanto quiser."
  3. "Sua missão: atender os pedidos antes que a ficha esfrie. Vamos guardar e buscar!"
- Dica (por fase, ao perder):
  - Fase 1: "Foi rápido demais! Toca primeiro na ficha do pedido, depois na gaveta certa."
  - Fase 2: "Binário é só contar em potências de 2: `100` são 4, `101` são 5. Olha o número
    embaixo da gaveta."
  - Fase 3: "Essa gaveta já tinha outro número dentro — guardar de novo apaga o que tinha. Lê
    o pedido com calma antes de confirmar."
  - Fase 4: "A luz caiu e a estante esqueceu tudo — é assim que a RAM funciona de verdade!
    Quando vier o pedido de novo, guarda rapidinho antes que o tempo acabe."
- Conexão com a próxima estação: "Na memória ficam números… e também o próprio programa que diz
  o que fazer com eles. Próxima estação: o ciclo da CPU."

## Card de conceito

- `unlocksCard: 'ram'` na Fase 1 (`PhaseBase.unlocksCard`):
  - título "A estante de gavetas", termo técnico "RAM (memória de acesso aleatório)", resumo
    "Onde o computador guarda, por pouco tempo, tudo que está usando agora", analogia "uma
    estante de gavetas numeradas que qualquer uma pode ser aberta na hora, em qualquer ordem",
    fato real "mais RAM deixa o computador abrir mais programas ao mesmo tempo sem travar",
    ícone `'memory'` (já existe em `src/ui/icons.tsx`).
- `unlocksCard: 'address'` na Fase 2:
  - título "O número da gaveta", termo técnico "Endereço de memória", resumo "O código que diz
    exatamente onde um dado está guardado, em binário por dentro do computador", analogia "o
    número da casa, mas a rua é sempre a mesma estante", fato real "um processador de 64 bits
    consegue numerar gavetas de até 2⁶⁴ posições", ícone `'bits'`.

## Layout mobile e desktop

```
celular em pé                    desktop / tablet deitado
┌──────────────────────┐         ┌──────────────────────────────────┐
│ nível           ctrl │         │ nível                       ctrl  │
├──────────────────────┤         ├───────────┬────────────────────────┤
│        HUD            │         │   HUD     │                        │
├──────────────────────┤         │  pedido    │                        │
│   ficha do pedido      │         │  (ticket)  │      estante           │
│   (ticket em destaque) │         │            │   (MemoryShelf,        │
├──────────────────────┤         │            │   grade 4×2 ou 4×3)    │
│                        │         │            │                        │
│   estante de gavetas    │         ├───────────┴────────────────────────┤
│   (MemoryShelf, grade   │         │            narrador                │
│   2 colunas × N linhas) │         └──────────────────────────────────┘
├──────────────────────┤
│      narrador          │
└──────────────────────┘
```

No celular deitado, a estante fica à direita e a ficha do pedido à esquerda, como no Núcleos
(regra geral de `cores.css`, seção "Interação, layout e acessibilidade" do `DECISIONS.md`). A
grade da estante usa `columns` (ver contrato abaixo) para caber sem rolagem horizontal: 2 colunas
no celular em pé, 4 no celular deitado e no tablet, 4–6 no desktop, sempre com gavetas de pelo
menos 44×44px.

## Contrato de dados das fases

```ts
export interface MemoryPhase extends PhaseBase {
  /** Tamanho da estante (quantidade de gavetas). */
  shelfSize: number
  /** Colunas da grade no layout "roomy" (desktop/tablet); o "compact" usa a metade, mínimo 2. */
  columns: number
  addressFormat: 'decimal' | 'binary'
  /** Quantos pedidos completados vencem a fase. */
  requestsGoal: number
  /** Segundos por ficha (ignorado no tutorial e reduzido a 75% no modo sem tempo). */
  secondsPerRequest: number
  /** Quantas fichas erradas/expiradas perdem a fase (0 = tutorial, nunca perde). */
  maxMistakes: number
  /** Fase 3: fração dos pedidos que reescrevem um endereço já ocupado. */
  overwriteShare: number
  /** Fase 4: índices do pedido (1-based) em que a energia cai e `eraseAll` roda. */
  powerLossAfter: readonly number[]
  stars: { metric: 'timeLeft' | 'mistakesLeft'; thresholds: readonly [number, number] }
}
```

`goalValues(phase, { difficulty, untimed })` devolve `{ goal: phase.requestsGoal, time:
phase.secondsPerRequest }` para preencher `{goal}`/`{time}` no texto de `content.ts`.

## Módulo compartilhado `src/games/shared/memory/`

Esta estação **cria** este módulo (regra da seção 2.2 do `PLANEJAMENTO.md`); as estações Ciclo
da CPU e Cache só importam — não editam nada aqui. A API abaixo é o contrato que os dois agentes
seguintes podem assumir como estável.

### Lógica pura (`model.ts`)

```ts
export interface MemoryCell {
  address: number
  /** `null` = gaveta vazia. */
  value: number | null
}

export interface MemoryState {
  size: number
  cells: readonly MemoryCell[]
}

export type MemoryEvent =
  | { type: 'read'; address: number; value: number | null }
  | { type: 'write'; address: number; value: number; overwritten: number | null }
  | { type: 'erase-all' }

export function createMemory(size: number): MemoryState
export function isValidAddress(state: MemoryState, address: number): boolean
export function readMemory(
  state: MemoryState,
  address: number,
): { state: MemoryState; event: MemoryEvent }
export function writeMemory(
  state: MemoryState,
  address: number,
  value: number,
): { state: MemoryState; event: MemoryEvent }
/** Fase 4 (queda de energia) e qualquer estação que precise "zerar" a RAM (ex.: recomeço). */
export function eraseAll(state: MemoryState): { state: MemoryState; event: MemoryEvent }
```

`readMemory`/`writeMemory` nunca lançam erro para endereço inválido: devolvem o estado inalterado
e um evento com `value: null` (leitura) — quem chama decide se isso é derrota. O armazenamento
dos **valores** é só `number`; qualquer significado adicional (uma instrução do Ciclo, por
exemplo) é responsabilidade de quem usa o módulo, que codifica/decodifica fora dele.

### Componentes visuais (`components/`)

```ts
// MemoryShelf.tsx
export interface MemoryShelfProps {
  cells: readonly MemoryCell[]
  /** Colunas no layout atual (o chamador decide compact/roomy, como no resto do projeto). */
  columns: number
  addressFormat: 'decimal' | 'binary'
  /** Gaveta destacada (seleção atual do jogador ou do PC, no Ciclo). */
  highlightAddress?: number | null
  /** Gaveta que acabou de ser lida/escrita: dispara a animação do `Drawer`. */
  pulse?: { address: number; kind: 'read' | 'write' } | null
  /** Toque direto numa gaveta (ler, ou soltar um valor já selecionado). */
  onSelect?: (address: number) => void
  /** Rótulo de acessibilidade por gaveta; o padrão é "Gaveta {endereço}". */
  labelFor?: (cell: MemoryCell) => string
  /** Formata o conteúdo mostrado (o padrão mostra o número ou "vazia"). Usado
   * pelo Ciclo para mostrar o mnemônico da instrução em vez do número puro. */
  renderValue?: (value: number | null) => ReactNode
}
export function MemoryShelf(props: MemoryShelfProps): JSX.Element

// Drawer.tsx — exportado à parte para quem precisa de uma gaveta isolada
// (ex.: o Cache pode usar o mesmo visual para a "linha" trazida da RAM).
export interface DrawerProps {
  cell: MemoryCell
  addressFormat: 'decimal' | 'binary'
  highlighted?: boolean
  pulse?: 'read' | 'write' | null
  onSelect?: () => void
  label?: string
  renderValue?: (value: number | null) => ReactNode
}
export function Drawer(props: DrawerProps): JSX.Element
```

`MemoryShelf`/`Drawer` são elementos `<button>` (toque e teclado funcionam sem nada extra,
seguem o padrão "tocar → tocar" do projeto). `pulse` dispara uma animação CSS de **~400ms**
(`transform: scale()` + `opacity`, nunca propriedades de layout, conforme `DECISIONS.md`) e o
chamador é responsável por limpar o `pulse` depois desse tempo (ex.: com `setTimeout` ou um
efeito ligado ao evento) — o componente não guarda esse estado.

### Animação de viagem (`MemoryTrip.tsx`)

Usada por esta estação para o valor "sair" visualmente da gaveta até o visor do pedido (e
vice-versa), e reaproveitada pelo Cache para a "viagem lenta até a RAM" numa falha de cache:

```ts
export interface MemoryTripProps {
  /** Referências DOM de origem e destino; o componente mede `getBoundingClientRect()`. */
  from: RefObject<HTMLElement>
  to: RefObject<HTMLElement>
  /** Dispara a viagem quando muda (ex.: um contador incrementado a cada viagem). */
  tripKey: number
  durationMs: number
  label: ReactNode
  onArrive?: () => void
}
export function MemoryTrip(props: MemoryTripProps): JSX.Element | null
```

Internamente anima só `transform: translate()` e `opacity` (token posicionado com `position:
fixed`, sem afetar o layout ao redor), respeitando `prefers-reduced-motion`/"Menos animações"
(quando ativo, o token aparece e desaparece sem percurso, só com fade). O Cache usa `durationMs`
maior (ex.: 900ms) para a viagem à RAM do que esta estação usa para a leitura local (ex.: 350ms)
— a duração fica a critério de quem chama, não é fixa no componente.

### O que o Ciclo e o Cache podem (e não podem) fazer

- Podem importar `createMemory`, `readMemory`, `writeMemory`, `eraseAll`, `MemoryShelf`,
  `Drawer`, `MemoryTrip` e os tipos acima de `@/games/shared/memory`.
- Não editam nada em `src/games/shared/memory/**` — qualquer mudança necessária é um "pedido à
  base" (ou, neste caso, um pedido ao agente de Memória) registrado no relatório final, para
  entrar numa onda seguinte.
- O **layout** de cada estante (quantas colunas, se mostra endereço binário, se usa `renderValue`
  para mnemônicos) é decisão de quem chama — o módulo só fornece os blocos.
- O Cache **não** reaproveita o módulo para os próprios "espaços" de cache (eles têm regra
  diferente: tag, acerto/falha, remoção) — isso é um componente novo, próprio da estação Cache,
  que só usa `MemoryShelf`/`Drawer`/`MemoryTrip` para desenhar o lado "RAM" da cena.

## Regras puras a testar

Em `logic/` (lógica da própria estação, acima do módulo compartilhado):

- `enqueueRequest(state, rng)` — gera o próximo pedido (tipo, endereço, valor) deterministicamente
  a partir da semente; mesmo seed → mesma sequência (teste de determinismo).
- `submitRequest(state, action)` — resolve um pedido (`place`/`read` na gaveta escolhida):
  - acerto de `GUARDAR` chama `writeMemory` e pontua (`registerHit`);
  - acerto de `LER` chama `readMemory` e compara o valor mostrado com o esperado;
  - erro ou expiração soma 1 a `mistakes` e quebra o combo (`breakCombo`);
  - `mistakes >= phase.maxMistakes` (fora do tutorial) → `status: 'lost'`;
  - `requestsDone >= phase.requestsGoal` → `status: 'won'`.
- `applyPowerLoss(state)` (Fase 4) — chama `eraseAll` do módulo compartilhado no pedido certo
  (`powerLossAfter`) e confere que toda gaveta fica `value: null` depois.
- `computeOutcome(state)` — estrelas por `timeLeft` (fases 1–2) ou `mistakesLeft` (fases 3–4),
  sempre pelo menos 1 estrela em vitória; teste cobrindo os três limiares (1/2/3 estrelas).
- Testes do módulo compartilhado (`shared/memory/model.test.ts`, de responsabilidade desta
  estação): `createMemory` começa toda vazia; `writeMemory` seguido de `readMemory` devolve o
  valor escrito; `writeMemory` numa gaveta ocupada reporta `overwritten` com o valor antigo;
  `readMemory`/`writeMemory` com endereço fora da faixa não alteram o estado; `eraseAll` zera
  todas as células e preserva `size`.

## Riscos

- **Confusão endereço × conteúdo** (o cerne didático): mitigar mostrando sempre os dois números
  com estilos bem distintos (endereço pequeno e fixo acima da gaveta; conteúdo grande dentro
  dela) e reforçando na fala de abertura e no card.
- **Binário na Fase 2 travar o ritmo:** o texto do pedido mostra o binário **e** aceita o toque
  direto na gaveta (sem precisar "traduzir" antes) — o jogador pode contar bit a bit olhando as
  gavetas vizinhas já rotuladas. Dica de erro reforça o método (potências de 2).
- **Sobrescrever sem querer (Fase 3) parecer "injusto":** todo pedido que vai sobrescrever traz o
  selo visual "sobrescreve" (ícone + texto, nunca só cor) antes da confirmação.
- **Queda de energia (Fase 4) parecer um bug:** a narração do Kernel precisa anteceder o evento
  (fala passageira no momento exato) e a UI deve mostrar claramente "as gavetas esvaziaram" (um
  frame com todas em `pulse` de limpeza) em vez de sumirem sem explicação.
- **Dependência do módulo compartilhado atrasar Ciclo/Cache:** por isso a API acima já fixa
  assinaturas e componentes antes da implementação começar; qualquer mudança depois do merge
  desta estação é pedido formal para a onda seguinte, não edição direta.
- **Acessibilidade:** gaveta ocupada/vazia e o selo de "sobrescreve" nunca só por cor — usar
  ícone e texto (ex.: "cheia"/"vazia" no `aria-label` do `Drawer`, já citado como bônus no padrão
  do projeto de "informação nunca só por cor").
