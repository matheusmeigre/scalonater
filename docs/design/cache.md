# Design doc: Cache (`cache`)

> Depende de `src/games/shared/memory/` (estação Memória), só para desenhar o lado "RAM" da cena
> (`MemoryShelf`/`Drawer`/`MemoryTrip`) e a viagem lenta até ela. Leia
> `docs/design/memory.md`, seção "Módulo compartilhado", antes de implementar. Os **espaços de
> cache** em si (acerto, falha, remoção) são um componente novo, próprio desta estação — não
> fazem parte do módulo compartilhado.

## Objetivo didático

Depois de jogar, o jogador entende que o **cache** é um espaço pequeno e rápido, perto da CPU,
que guarda cópias dos endereços usados recentemente — e que a estratégia de **o que manter e o
que descartar** é o que faz a diferença entre um computador ágil e um computador lento, muito
mais do que a velocidade de reflexo do jogador.

## Mecânica principal

A CPU pede endereços automaticamente, num ritmo constante (a cada ~1,5s, mais lento no modo sem
tempo). Para cada pedido, o jogo primeiro procura no **cache** (3 a 4 espaços, visualmente bem
perto do ícone da CPU):

- **Acerto (hit):** o espaço já tem aquele endereço — resposta quase instantânea, com um
  destaque verde e som curto.
- **Falha (miss):** o jogo mostra a **viagem lenta até a RAM** (`MemoryTrip`, ~900ms) buscando o
  valor em `shared/memory`, e o resultado entra num espaço do cache.

Quando a falha acontece e **todo espaço do cache já está ocupado**, o jogo pausa a chegada de
novos pedidos e pede ao jogador: **toque no espaço que deve sair** para abrir lugar ao que
chegou. É a única ação manual do jogador (toque; alvo também alcançável por teclado, Tab entre
os espaços + Enter) — por isso é "um jogo de decisão, não de reflexo": o cronômetro da partida
não acelera a cadência dos pedidos, só acumula o tempo total gasto (soma de acertos rápidos e
falhas lentas), que é a pontuação a minimizar.

## O que cada fase ensina

| Fase     | Ideia nova                                                | Como vencer                                                  | Como perder                                   |
| -------- | ------------------------------------------------------------ | --------------------------------------------------------------- | ------------------------------------------------ |
| Tutorial | Acerto × falha                                               | Viver os 2 primeiros pedidos (1 falha guiada, 1 acerto guiado) | (nunca)                                          |
| Fase 1   | Cache cheio: escolher quem sai                                | Responder 14 pedidos com tempo médio de acesso abaixo da meta  | tempo médio de acesso passa do limite de derrota |
| Fase 2   | Localidade temporal (endereços que se repetem)                 | Responder 16 pedidos, com 60% deles repetindo os últimos 4 endereços | igual à Fase 1                                   |
| Fase 3   | Localidade espacial: a falha traz a "linha" (vizinhos) inteira | Responder 16 pedidos, boa parte em sequência (ex.: 10, 11, 12, 13) | igual à Fase 1, com meta de tempo médio menor    |
| Fase 4   | Dois níveis: L1 (bem pequeno e rápido) e L2 (maior, rápido, mas não tanto quanto L1) | Responder 20 pedidos com tempo médio considerando os três níveis | igual à Fase 1, meta de tempo médio menor ainda |

Detalhes de cada fase:

- **Tutorial** — cache de 2 espaços, sem relógio, guiado: 1º pedido é falha garantida
  (`advanceOn: 'select'` ao ver a viagem até a RAM), 2º pedido repete o mesmo endereço e é acerto
  garantido (`advanceOn: 'done'`).
- **Fase 1** — cache de 3 espaços; a sequência de endereços é pseudoaleatória (sem repetição
  deliberada) para forçar o jogador a escolher quem sai sem nenhuma pista além de "o que acho
  menos provável de voltar". Meta de tempo médio e limite de derrota em `stars`/`maxAvgLatency`.
- **Fase 2** — cache de 3 espaços; a sequência de pedidos é gerada com 60% de chance de repetir
  um dos 4 endereços mais recentes (localidade temporal) — o jogador percebe que manter o que
  "voltou a ser pedido" compensa. O texto da fase chama atenção para isso sem dar a resposta
  pronta.
- **Fase 3** — a falha passa a trazer, de uma vez, um **bloco de 4 endereços vizinhos**
  (`blockSize: 4`, ex.: pedir o endereço 10 traz 8,9,10,11 — alinhado ao múltiplo de 4) ocupando
  mais de um espaço do cache (ou um "espaço de bloco" visualmente maior, ver layout); a sequência
  de pedidos passa a ter trechos sequenciais para o jogador sentir o ganho.
- **Fase 4** — adiciona o L2 (4 espaços, mais lento que o L1 de 2 espaços, mas bem mais rápido
  que a RAM): a busca agora é L1 → L2 → RAM; uma falha no L1 que acerta no L2 é "média" (não
  precisa de `MemoryTrip` até a RAM, só um deslocamento curto entre as duas caixinhas).

## Falas do Kernel

- Abertura:
  1. "A CPU é rapidíssima, mas ir até a RAM toda vez é como ir à despensa a cada ingrediente."
  2. "O **cache** é a bancada da cozinha: um espacinho bem menor, mas do lado, com o que você
     usa toda hora."
  3. "Quando ele enche, alguém sai da bancada. Sua missão: decidir quem."
- Dica (por fase, ao perder):
  - Fase 1: "Toda falha custa tempo. Repara em quais endereços a CPU parece não voltar a pedir
    tão rápido antes de escolher quem tirar da bancada."
  - Fase 2: "Alguns endereços voltam a ser pedidos pouco depois. Tirar um desses da bancada
    costuma custar caro de novo."
  - Fase 3: "Quando dá uma falha, a gente já traz os vizinhos daquele endereço — eles tendem a
    ser pedidos em seguida."
  - Fase 4: "Antes de ir até a RAM, a gente passa pela bancada **de trás** (o L2) — mais lenta
    que a de perto, mas bem mais rápida que a despensa."
- Conexão com a próxima estação: "A RAM esquece tudo quando a luz apaga. Para guardar de
  verdade, mesmo sem energia: o armazenamento. Próxima estação."

## Card de conceito

- `unlocksCard: 'cache'` na Fase 1:
  - título "A bancada perto da CPU", termo técnico "Cache", resumo "Um espaço pequeno e rápido
    que guarda cópias do que foi usado recentemente, para não precisar ir até a RAM toda vez",
    analogia "a bancada da cozinha com os ingredientes do dia, em vez da despensa no fundo da
    casa", fato real "o cache L1 de um processador atual costuma ter menos de 100 KB, mas
    responde em menos de 1 nanossegundo", ícone `'cache'` (já existe em `src/ui/icons.tsx`).
- `unlocksCard: 'memory-hierarchy'` na Fase 4:
  - título "Quanto mais perto, menor e mais rápido", termo técnico "Hierarquia de memória",
    resumo "Registrador, cache L1, cache L2, RAM, armazenamento: cada nível é maior e mais lento
    que o anterior", analogia "a mão, a bancada, a despensa e o mercado — você vai mais longe só
    quando precisa", fato real "o L2 costuma ser 4 a 8 vezes maior que o L1, e bem mais lento",
    ícone `'memory'`.

## Layout mobile e desktop

```
celular em pé                       desktop / tablet deitado
┌──────────────────────┐            ┌────────────────────────────────────┐
│ nível           ctrl │            │ nível                         ctrl  │
├──────────────────────┤            ├───────────┬──────────────────────────┤
│        HUD             │            │   HUD      │   CPU → [L1][L1][L1]     │
├──────────────────────┤            │            │        (viagem animada) │
│   CPU → pedido atual    │            │            │                          │
│   [L1][L1][L1]          │            │            │   estante da RAM         │
├──────────────────────┤            │            │   (MemoryShelf, 4×2)      │
│   estante da RAM         │            ├───────────┴──────────────────────────┤
│   (MemoryShelf, 2×N)     │            │              narrador                │
├──────────────────────┤            └────────────────────────────────────┘
│      narrador            │
└──────────────────────┘
```

Na Fase 4 (dois níveis), o grupo `[L1][L1]` some para 2 espaços e aparece `[L2][L2][L2][L2]`
entre a CPU e a estante da RAM, mantendo a leitura "esquerda → direita" (ou "cima → baixo" no
celular) da hierarquia — a mesma ordem da fala "mão → bancada → despensa". O componente dos
espaços de cache (`scene/CacheSlots.tsx`) é próprio desta estação; só a estante da RAM e o token
da viagem vêm de `shared/memory`.

## Contrato de dados das fases

```ts
export interface CacheRequestPattern {
  /** Quantidade de endereços possíveis no "universo" da RAM simulada. */
  addressSpace: number
  /** Fases 2+: chance de repetir um dos últimos `recentWindow` endereços. */
  temporalRepeatChance: number
  recentWindow: number
  /** Fase 3+: chance de o próximo endereço ser vizinho do anterior (±1 a ±3). */
  spatialStreakChance: number
}

export interface CachePhase extends PhaseBase {
  l1Slots: number
  /** 0 = sem L2 (fases 1–3). */
  l2Slots: number
  /** 1 = sem localidade espacial (fases 1–2); 4 a partir da fase 3. */
  blockSize: 1 | 4
  requestsGoal: number
  pattern: CacheRequestPattern
  /** Custo de latência "simulado" em unidades de pontuação, não em ms reais de UI. */
  latency: { hit: number; l2Hit: number; miss: number }
  /** Tempo médio de acesso (unidades de `latency`) acima do qual a fase é perdida. */
  maxAvgLatency: number
  stars: { metric: 'avgLatency'; thresholds: readonly [number, number] }
}
```

`goalValues(phase, { difficulty, untimed })` devolve `{ goal: phase.requestsGoal, time:
phase.maxAvgLatency }`. Diferente das outras estações, `stars.metric` é sempre `'avgLatency'`
aqui: quanto **menor** o valor, melhor — `starsFor` recebe `1 - avgLatency / maxAvgLatency`
clampado em `[0, 1]`.

## Regras puras a testar

- `lookup(state, address)` — percorre L1, depois L2 (se existir), depois declara falha; devolve
  o nível onde acertou (`'l1' | 'l2' | 'miss'`) e não muda o estado por si só (só consulta).
- `insert(state, address, level, evictAddress?)` — insere o endereço (ou o bloco de
  `blockSize` endereços, a partir da Fase 3) no nível indicado; se o nível está cheio e
  `evictAddress` não foi informado, devolve um evento `'need-eviction'` em vez de alterar o
  estado (é o sinal para a cena pausar e perguntar ao jogador); com `evictAddress`, remove aquele
  endereço antes de inserir.
- `generateRequest(rng, pattern, recent)` — pseudoaleatório, determinístico por semente: dado o
  mesmo `rng` e o mesmo histórico `recent`, sempre devolve o mesmo próximo endereço; teste cobre
  os três ramos (repetição temporal, sequência espacial, aleatório puro) checando a proporção ao
  longo de muitas chamadas com uma semente fixa.
- `resolveRequest(state, address)` — função de mais alto nível que chama `lookup`, soma a
  latência certa (`latency.hit`/`l2Hit`/`miss`) ao total, e devolve o evento para a animação
  (`'hit' | 'l2-hit' | 'miss'`), sem decidir remoção (isso é `insert`, separado, para poder testar
  cada parte isoladamente).
- `computeOutcome(state)` — `avgLatency = totalLatency / requestsDone`; vitória quando
  `requestsDone >= phase.requestsGoal` e `avgLatency <= phase.maxAvgLatency`; derrota quando
  `avgLatency` ultrapassa o limite mesmo faltando pedidos (corte antecipado, para não obrigar o
  jogador a terminar uma fase já perdida); estrelas pelo `avgLatency` final, sempre ≥ 1 em
  vitória.

## Riscos

- **Jogador não entender por que precisa escolher quem sai:** a pausa para eviction é explícita
  (o jogo para de avançar, os espaços cheios ficam destacados, a narração pede a escolha) —
  nunca uma decisão tomada "no susto" durante o fluxo automático.
- **Localidade temporal/espacial parecerem aleatórias demais para perceber:** os textos de fase
  (Fases 2 e 3) descrevem o padrão em palavras simples antes de começar, e a dica de derrota
  repete a dica central (quem "costuma voltar" / quem "tem vizinho pedido depois").
- **Fase 4 (dois níveis) sobrecarregar a tela:** manter os mesmos 3–4 espaços de L1 das fases
  anteriores (não crescer os dois níveis ao mesmo tempo) e usar o mesmo visual de "espaço de
  cache" para L1 e L2, só numa caixa mais afastada da CPU.
- **Pontuação por "tempo médio" ser abstrata:** o HUD mostra o número com uma unidade concreta
  no texto (ex.: "tempo médio: 3,2" com um ícone de relógio), não só um número solto, e o card de
  conceito reforça a ideia com o fato real (nanossegundos de um L1 verdadeiro).
- **Dependência de `shared/memory` para a estante da RAM:** segue o mesmo contrato do doc da
  Memória; mudanças necessárias são pedido à base, não edição direta.
- **Acessibilidade:** acerto/falha/"precisa escolher quem sai" nunca só por cor — ícone (raio
  para acerto, relógio de areia para falha) e texto no `aria-label` de cada espaço de cache.
