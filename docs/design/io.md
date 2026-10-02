# Design doc: Interrupções e E/S (`io`)

## Objetivo didático

A CPU não fica perguntando sem parar "já terminou?" para o disco, a rede, o teclado ou o
mouse (isso é *polling* e desperdiça CPU). Em vez disso, cada dispositivo **toca uma
campainha** (interrupção) só quando tem algo pronto, e a CPU guarda exatamente onde estava
antes de atender, para não perder o trabalho em andamento. A ideia-chave: **interromper é
mais barato que perguntar**, e esquecer de guardar o contexto custa caro.

## Mecânica principal

Verbo central: **tocar** (atender a campainha). Não há arraste obrigatório — toda a jornada
é jogável só com toque/clique/teclado, como pedido na seção 4 do planejamento. Uma alternativa
de arrastar existe para quem preferir (arrastar a "ficha de contexto" até a pilha), usando o
kit `src/ui/dnd` (`DragButton`/`DropTarget`), mas tocar sempre resolve a mesma ação.

Loop de uma interrupção:

1. Uma tarefa principal roda numa barra de progresso central ("Tarefa: Exportar vídeo").
2. Um dispositivo (teclado, mouse, disco ou rede) **toca a campainha**: o ícone pisca na borda
   da tela com `{hourglass}` e um som distinto por dispositivo.
3. O jogador toca em **"Guardar e atender"** (ação única: isso empilha uma ficha de contexto
   — nome da tarefa + progresso atual — numa pilha visível, e pausa a barra).
4. O jogador toca no dispositivo para atendê-lo: uma barrinha curta de atendimento enche.
5. Ao terminar, a ficha do topo da pilha volta automaticamente ("desempilhar"): a barra da
   tarefa retoma exatamente do ponto em que parou.

Se o jogador tocar direto no dispositivo **sem** guardar o contexto primeiro, a campainha é
atendida, mas a tarefa que estava rodando perde o progresso e **recomeça do zero** — é a
consequência visível de "esquecer o contexto" citada no rascunho do planejamento.

Com duas ou mais campainhas tocando ao mesmo tempo (F1 em diante), elas entram numa fila
visível à direita da pilha; o jogador escolhe a ordem de atendimento tocando em cada uma.

## O que cada fase ensina

| Fase               | Ideia nova                                                             | Como vencer                                                                      | Como perder                                                                |
| ------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Tutorial            | Uma campainha, guardar → atender → retomar                             | Completar o passo guiado (3 interrupções do teclado)                              | (nunca)                                                                    |
| F1 — Fila na porta  | Vários dispositivos chamam ao mesmo tempo; fila de espera               | Manter a tarefa em pelo menos `{goal}`% de progresso ao fim de `{time}` s         | A fila de campainhas passa de `{queueMax}` sem atendimento (perde vida)    |
| F2 — Quem não espera| Prioridade: teclado/mouse são urgentes, disco é tolerante               | Atender toda campainha urgente antes do limite de paciência dela                 | Uma campainha urgente expira sem ser atendida (perde vida)                 |
| F3 — Perguntar toda hora × campainha | Comparação direta: um trecho em *polling* (botão "verificar" repetido) e um trecho por interrupção, medindo energia desperdiçada | Terminar o trecho de polling gastando menos que `{goal}` toques de verificação perdidos | Gastar energia demais sem perceber o padrão (a fase não derrota por tempo, só pontua pior) |
| F4 — DMA            | O disco copia um arquivo grande sozinho; a CPU só é avisada no início e no fim, não a cada pedaço | Completar a transferência tocando só duas vezes (começar e recolher), sem precisar atender pedaço a pedaço | Tentar atender cada pedaço manualmente custa tempo e quase derrota a fase por tempo |

Observação de progressão: F1–F2 reaproveitam o mesmo campo de jogo (tarefa + pilha + fila);
F3 muda de layout por rodada (tela dividida em "antes" e "depois"); F4 volta ao layout padrão
com um quinto dispositivo visual (disco em modo DMA, com uma barra própria que anda sozinha).

## Falas do Kernel

Tom: direto, caloroso, nunca didático demais (igual ao Núcleos).

- **Abertura (3 falas):**
  1. "Lembra das threads esperando dados, lá nos Núcleos? Chegou a hora de saber como a CPU
     fica sabendo que o dado chegou."
  2. "Teclado, mouse, disco, rede... cada um pode tocar a campainha. E a CPU só para o que
     está fazendo quando alguém toca."
  3. "Antes de atender, guarde onde você estava. Esquecer isso custa a tarefa inteira."
- **Dica por fase (ao perder):**
  - F1: "A fila cresceu demais! Atenda as campainhas mais rápido — toque em qualquer uma da
    lista, não precisa ser a primeira."
  - F2: "O teclado não espera muito. Quando ele toca, atenda **antes** do disco."
  - F3: "Perguntar toda hora gasta energia à toa. Deixe o aviso vir até você."
  - F4: "Você não precisa recolher pedaço por pedaço — espere o disco avisar que **terminou
    tudo**."
- **Conexão com a próxima estação:** "Um dos dispositivos que mais toca a campainha é a placa
  de rede. Ela também divide as coisas em pedacinhos — só que em pacotes. Próxima: a rede."

## Card de conceito

Dois cards principais (como no rascunho) e um terceiro liberado só no fim, para fechar a
progressão tutorial → F1 → F4 sem empilhar tudo de uma vez:

1. **"A campainha do computador" / Interrupção** — liberado na F1 (`unlocksCard: 'interrupt'`).
   - Resumo: um sinal que avisa a CPU na hora, sem ela precisar perguntar.
   - Analogia: campainha do apartamento em vez de ficar olhando pela janela a cada minuto.
   - Mundo real: toda tecla que você aperta gera uma interrupção.
2. **"Entrada e saída" / E/S (Entrada e Saída, *I/O*)** — liberado no tutorial
   (`unlocksCard: 'io'`).
   - Resumo: tudo que entra (teclado, mouse, rede, disco) ou sai (tela, som, rede, disco) do
     computador passa por aqui.
   - Analogia: as portas e janelas da casa — é por onde tudo entra e sai.
   - Mundo real: um disco (SSD) ainda é bem mais lento que a CPU; por isso ela faz outra coisa
     enquanto espera.
3. **"Copiar sem ajuda" / DMA (acesso direto à memória)** — liberado na F4
   (`unlocksCard: 'dma'`).
   - Resumo: alguns dispositivos copiam dados direto na memória, sem passar pela CPU o tempo
     todo.
   - Analogia: um garçom que mesmo que leve uma bandeja cheia, não precisa que o gerente
     acompanhe prato por prato — só avisa quando a mesa está servida.
   - Mundo real: é por isso que copiar um arquivo grande não deixa o computador 100% travado.

## Layout mobile e desktop

```
celular em pé                      desktop / tablet deitado
┌──────────────────────┐           ┌──────────────────────────────────┐
│ Fase: Fila na porta   ctrl│       │ Fase: Fila na porta        ctrl   │
├──────────────────────┤           ├───────────┬────────────────────────┤
│  HUD (vidas/progresso)│           │ HUD       │                        │
├──────────────────────┤           │           │   Tarefa (barra)       │
│   Tarefa (barra)      │           │ Pilha de  │                        │
├──────────────────────┤           │ contexto  ├────────────────────────┤
│  Pilha de contexto    │           │ (vertical)│  Dispositivos em volta │
│  (3 fichas no máx.)   │           │           │  (teclado/mouse/disco/ │
├──────────────────────┤           │           │  rede), fila à direita │
│ Dispositivos em       │           ├───────────┴────────────────────────┤
│ volta (ícones 2×2)    │           │            narrador                │
├──────────────────────┤           └────────────────────────────────────┘
│     narrador          │
└──────────────────────┘

celular deitado: mesma ordem do celular em pé, com a pilha de contexto e os dispositivos lado
a lado (a pilha à esquerda, os 4 dispositivos em grade 2×2 à direita), para caber na altura de
~375px sem rolagem.
```

A fase F3 (polling × interrupção) usa uma variação do campo: duas faixas lado a lado (ou uma
acima da outra no celular), cada uma com sua própria barra de tarefa e medidor de energia —
mas ainda dentro da mesma moldura (`GameFrame`) e das mesmas áreas `level`/`stats`/`ctrl`/`nar`.

## Contrato de dados das fases

```ts
export type IoDeviceId = 'teclado' | 'mouse' | 'disco' | 'rede'

export interface IoDevice {
  id: IoDeviceId
  /** Urgência: quanto menor, mais rápido expira na fila (usado na F2). */
  patience: number
}

export interface IoPhase extends PhaseBase {
  /** Dispositivos que podem tocar a campainha nesta fase. */
  devices: readonly IoDeviceId[]
  /** Duração em segundos (ignorada no tutorial e na F3, que não tem relógio). */
  duration: number
  /** Segundos médios entre uma campainha e outra. */
  ringEvery: number
  /** Tamanho máximo da fila de campainhas não atendidas antes de perder vida. */
  queueMax: number
  /** Prioridade liga a regra de expiração por paciência (F2). */
  priority: boolean
  /** Modo de comparação polling × interrupção (só a F3). */
  compareMode: boolean
  /** DMA liga o dispositivo de disco automático (só a F4). */
  dma: boolean
  /** % mínima de progresso da tarefa principal para disparar derrota (F1/F2/F4). */
  minProgress: number
  goal: number
  stars: { metric: 'timeLeft' | 'hearts' | 'energySaved'; thresholds: readonly [number, number] }
  tutorial?: TutorialStep[]
}
```

`goalValues` devolve, por fase: `{ goal }` (número de interrupções ou % de progresso-alvo),
`{ time }` (`duration` ajustado pela dificuldade) e `{ hearts }` (vidas da dificuldade atual,
reaproveitando a mesma tabela `DIFFICULTIES` do Núcleos como ponto de partida).

## Regras puras a testar

Em `logic/rules.ts` (estado → estado, devolvendo eventos, nos mesmos moldes de
`games/cores/logic/rules.ts`):

- `ringDevice(state, deviceId, seed)` — adiciona uma campainha à fila; determinístico com
  `engine/random.ts`.
- `pushContext(state)` — empilha a ficha da tarefa atual e pausa a barra; evento `contextSaved`.
- `attendDevice(state, deviceId)` — remove a campainha da fila; se não havia contexto
  empilhado para a tarefa em andamento, emite `contextLost` e zera o progresso da tarefa;
  senão emite `attended`.
- `popContext(state)` — retoma a tarefa do ponto salvo; evento `resumed`.
- `expirePatience(state, dt)` — reduz a paciência das campainhas urgentes (F2); emite
  `missedDeadline` e tira vida quando chega a zero.
- `tickPolling(state, dt)` / `checkNow(state)` — para a F3: cada toque em "verificar" soma ao
  contador de energia desperdiçada; comparar o total com o modo por interrupção (que não soma
  nada enquanto não há campainha).
- `tickDma(state, dt)` — avança a transferência sozinha; só emite `dmaDone` no final.
- Casos de teste: vitória com contexto sempre salvo; derrota por fila cheia; derrota por
  campainha urgente expirada; `attendDevice` sem `pushContext` sempre zera o progresso (nunca
  "quase zera"); mesma semente produz a mesma sequência de campainhas (determinismo); cálculo
  de estrelas nos três critérios (`timeLeft`, `hearts`, `energySaved`).

## Riscos

- **Confusão entre "guardar" e "atender":** são dois toques distintos, mas o jogador pode
  querer tocar direto no dispositivo. Mitigação: o tutorial trava nesse passo (`advanceOn:
  'place'` equivalente) até o jogador guardar o contexto pelo menos uma vez; a campainha fica
  visualmente "piscando" até ser atendida, e o botão "Guardar e atender" fica em destaque
  (gold) enquanto há campainha tocando.
- **Mecânica parecida com a fase "Esperando dados" do Núcleos:** para não parecer repetição,
  o campo visual é diferente (pilha de contexto + campainhas na borda, não núcleos/fila), e o
  Kernel nomeia a ligação explicitamente na abertura, tratando esta estação como "a resposta"
  para o que ficou em aberto lá.
- **F2 (prioridade) parecer depender de reflexo:** a paciência das campainhas urgentes precisa
  ser generosa (vários segundos, não frações de segundo) e o jogo permanece pausável; as
  estrelas medem decisão (ordem certa), não velocidade de toque — igual à orientação de
  "mecânica que depende de reflexo" na seção 7 do planejamento.
- **F3 (comparação polling × interrupção) ficar abstrata demais:** o medidor de energia
  desperdiçada precisa ser visual e imediato (uma barra que sobe a cada toque em "verificar"),
  não só um número ao final.
- **Acessibilidade:** campainha nunca é só sonora — sempre some com `{hourglass}` piscando e
  um anúncio para leitor de tela ("Rede está chamando"), seguindo o padrão já usado no Núcleos
  (`buildDndAnnouncements`-like, traduzido).
- **Novos ícones (teclado, mouse, disco) não existem em `src/ui/icons.tsx`:** ficam
  registrados via `icons` do `GameModule` (extensão criada na Etapa 0.5), sem tocar no mapa
  global de ícones.
