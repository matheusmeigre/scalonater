# Planejamento: da Etapa 0.5 à Etapa 12

Plano para construir as estações restantes da placa-mãe com **subagentes trabalhando em paralelo**.
A Etapa 0 (fundação + Núcleos) está concluída e mergeada na `master` (`ce8fe52`).

Leia antes: `README.md` (estrutura e como criar um minigame) e `DECISIONS.md` (decisões já tomadas).
Este documento não substitui o **mini design doc** de cada minigame: ele define a ordem, as
dependências, as regras de trabalho em paralelo e um rascunho de cada estação, que o design doc
vai detalhar.

---

## 1. Visão geral

| Etapa | Estação (trilha)        | Branch                         | Onda      | Depende de                 |
| ----- | ----------------------- | ------------------------------ | --------- | -------------------------- |
| 0     | Fundação + Núcleos (8)  | `etapa-0`                      | concluída | —                          |
| 0.5   | Base compartilhada v2   | `etapa-00b-base-compartilhada` | 1         | 0                          |
| —     | Design docs 1–7, 9, 10  | `etapa-docs-design`            | 2         | 0.5                        |
| 1     | Bits                    | `etapa-01-bits`                | 3         | 0.5 + doc aprovado         |
| 4     | Memória                 | `etapa-04-memoria`             | 3         | 0.5 + doc aprovado         |
| 7     | Armazenamento           | `etapa-07-armazenamento`       | 3         | 0.5 + doc aprovado         |
| 9     | Interrupções e E/S      | `etapa-09-interrupcoes`        | 3         | 0.5 + doc aprovado         |
| 2     | Portas lógicas          | `etapa-02-portas-logicas`      | 4         | 1 (binário compartilhado)  |
| 5     | O ciclo da CPU          | `etapa-05-ciclo-cpu`           | 4         | 4 (gavetas de memória)     |
| 6     | Cache                   | `etapa-06-cache`               | 4         | 4 (gavetas de memória)     |
| 10    | Rede                    | `etapa-10-rede`                | 4         | 0.5                        |
| 3     | A calculadora (ULA)     | `etapa-03-ula`                 | 5         | 2 (simulador de circuitos) |
| —     | Design doc 11           | `etapa-docs-design-11`         | 5         | 1–10 mergeadas             |
| 11    | Do clique ao pixel      | `etapa-11-clique-ao-pixel`     | 6         | todas + doc aprovado       |
| 12    | Fechamento e lançamento | `etapa-12-fechamento`          | 7         | todas                      |

O número da etapa é o mesmo da estação na trilha. O Núcleos (8) já foi feito na Etapa 0.

### Ordem da trilha

**Mantida como está.** Nenhuma mudança de ordem é proposta. Um ajuste pequeno de recorte (a
aprovar no design doc): a última fase de **Bits** desenha uma imagem com bits (1 bit = 1 pixel).
Ela já prepara a ideia de "a tela é feita de números", que o minigame final retoma.

### Gráfico de dependências

```
0 ──► 0.5 ──► docs ──┬─► 1 Bits ──────► 2 Portas ──► 3 ULA ─┐
                     ├─► 4 Memória ──┬─► 5 Ciclo ──────────┤
                     │               └─► 6 Cache ──────────┤
                     ├─► 7 Armazenamento ──────────────────┼─► doc 11 ─► 11 Clique ao pixel ─► 12
                     ├─► 9 Interrupções ───────────────────┤
                     └─► 10 Rede ──────────────────────────┘
```

As dependências entre jogos são de **código compartilhado**, não de progressão. A progressão do
jogador ("linear, com exceção") já é resolvida por `engine/phases/progression.ts`.

---

## 2. Regras para trabalhar em paralelo

### 2.1 Branches e merge

1. Cada etapa nasce da `master` atualizada, numa branch própria (nomes da tabela acima).
2. Cada subagente trabalha num **git worktree isolado** (`Agent` com `isolation: "worktree"`).
   Nunca dois agentes na mesma branch.
3. **No máximo 4 agentes construindo ao mesmo tempo.**
4. O orquestrador (a sessão principal) faz os merges **um de cada vez**, na ordem da trilha
   dentro da onda. Antes de cada merge:
   - rebase da branch sobre a `master` atual;
   - checagem completa (seção 5): tipos, lint, testes de unidade, e2e em todos os formatos e
     build;
   - `git merge --no-ff etapa-XX-...` com a mensagem `Etapa N: <estação>`, e push.
5. Depois de cada merge, as branches ainda abertas fazem rebase sobre a nova `master` antes do
   próprio merge.
6. Commits pequenos e descritivos, em português, terminando com a linha de atribuição da sessão.

### 2.2 Quem pode mexer em quê

Para quase não haver conflito, cada agente **só edita os caminhos que são dele**:

| Dono                     | Caminhos                                                                                                       |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Agente da estação `<id>` | `src/games/<id>/**`, `e2e/<id>.spec.ts`, `docs/design/<id>.md`, `public/games/<id>/**` (se precisar de assets) |
| Agente de Bits           | também `src/games/shared/binary/**` (criado por ele)                                                           |
| Agente de Memória        | também `src/games/shared/memory/**` (criado por ele)                                                           |
| Agente de Portas lógicas | também `src/games/shared/circuit/**` (criado por ele)                                                          |
| Etapa 0.5 (base)         | `src/engine/**`, `src/ui/**`, `src/shell/**`, `src/content/**`, configs, `e2e/helpers.ts`                      |

Arquivos compartilhados que os agentes de estação **não editam**: `package.json`,
`package-lock.json`, `src/engine/**`, `src/ui/**`, `src/shell/**`, `src/styles.css`,
`src/games/catalog.ts`, configs.

- Se um agente precisar de algo novo num desses arquivos, ele **não edita**: registra o pedido na
  seção "Pedidos à base" do relatório final. O orquestrador decide se faz o ajuste numa branch
  curta (`base/<assunto>`) mergeada antes.
- **Nenhuma dependência nova de npm** nas branches de estação. Se uma estação realmente precisar
  de uma, isso vira pedido à base (evita conflito no `package-lock.json`).
- Código de `src/games/shared/<x>/` pertence ao agente que o criou. Os outros só importam. Uma
  mudança necessária vira pedido para a próxima onda.

### 2.3 Lançamento controlado

Ao entrar na `master`, uma estação vai para produção. Com a progressão "linear, com exceção",
mergear Bits faria o Núcleos passar a exigir as estações 1–7 para quem ainda não o concluiu.
Por isso, a Etapa 0.5 cria o campo **`meta.released`**:

- `released: false` (padrão das estações novas): em produção, a estação aparece como "em
  construção" e não conta como pré-requisito;
- nos previews da Vercel (`VITE_SHOW_UNRELEASED=1`) e no `npm run dev`, tudo aparece liberado
  para revisão;
- **o dono do projeto decide quando virar `released: true`.** Isso pode ser estação por estação
  ou todas de uma vez na Etapa 12.

---

## 3. Ondas de execução

### Onda 1 — Etapa 0.5: Base compartilhada v2 (1 agente, sequencial)

Branch `etapa-00b-base-compartilhada`. Extrai do Núcleos o que todas as estações vão repetir e
elimina os pontos de conflito do trabalho paralelo. **Nada de jogo novo aqui.**

1. **Registro automático:** `src/games/registry.ts` passa a descobrir os módulos com
   `import.meta.glob('./*/index.ts', { eager: true })`, ignorando pastas que começam com `_`.
   Adicionar um jogo não toca mais em arquivo compartilhado. Inclui um teste que valida o
   registro: id existe em `STATION_IDS`, sem duplicatas.
2. **`meta.released`** + `VITE_SHOW_UNRELEASED` (seção 2.3), refletidos em
   `stationStatus`, no mapa e no Manual. O Núcleos fica `released: true`.
3. **`GameFrame`** (`src/ui/GameFrame.tsx`): moldura da partida com áreas nomeadas (nível, HUD,
   controles, campo, narrador), o painel da fase, os botões mudo/pausar/recomeçar e as áreas
   seguras. O layout do campo continua sendo de cada jogo. A cena do Núcleos passa a usá-la.
4. **Tutorial guiado genérico** (`src/engine/tutorial/`): `useTutorialSteps(steps, trigger)`
   com a regra de "pular adiante", extraído de `useCoresSession`.
5. **Narração** (`src/engine/narration/useNarration.ts`): fala atual, humor, falas passageiras
   que voltam à instrução, anúncio para leitor de tela.
6. **Kit tocar-ou-arrastar** (`src/ui/dnd/`): `DndContext` com anúncios em pt-BR, modificador
   "acima do dedo", colisão com ímã configurável, proteção de clique depois do arraste e
   componentes `DragButton`/`DropTarget` acessíveis. Toda estação com arraste usa este kit.
7. **Extensões por jogo:** `GameModule` aceita `icons` (ícones próprios, registrados num mapa
   global) e `sfx` (receitas próprias, registradas no `audio`). Os ícones e sons compartilhados
   não crescem por conflito.
8. **Testes de contrato** (`src/games/contract.test.ts`), que rodam para todos os módulos:
   - toda fase tem texto em `copy.phases`;
   - abertura com no máximo 3 falas;
   - `unlocksCard` aponta para um card que existe;
   - a primeira fase é tutorial com `canLose: false`;
   - de 3 a 5 fases além do tutorial;
   - toda string do `copy` é não vazia.
9. **e2e genérico:**
   - `e2e/helpers.ts` passa a ter `seedProgress(gameId, …)` e `startPhase(gameId, phase)`;
   - `e2e/layout.spec.ts` roda as checagens de layout (sem rolagem horizontal, alvos de 44px
     ou mais, nada cortado) para **cada fase de cada jogo registrado**;
   - porta configurável por `PORT` (cada worktree sobe o seu preview).
10. **Modelos:** `docs/design/_template.md` (o mini design doc) e `src/games/_template/`
    (esqueleto de módulo, ignorado pelo registro).
11. **CI no GitHub Actions:** tipos, lint, unidade, build e e2e (com shards) em todo push de
    branch `etapa-*`.
12. **Deploy:** resolver a pendência do `vercel login`, conferir o projeto da Vercel
    (Framework = Vite) e os previews por branch com `VITE_SHOW_UNRELEASED=1`.

**Pronto quando:** o Núcleos funciona igual (todos os testes atuais passam) usando a base nova,
e o esqueleto `_template` copiado para uma pasta qualquer aparece no mapa sem tocar em nenhum
outro arquivo.

### Onda 2 — Design docs 1–7, 9, 10 (3 agentes, em paralelo)

Branch única `etapa-docs-design`. Cada agente escreve `docs/design/<id>.md` a partir do modelo e
do rascunho da seção 4:

| Agente              | Docs                                  |
| ------------------- | ------------------------------------- |
| A — lógica digital  | `bits`, `gates`, `alu`                |
| B — memória         | `memory`, `cycle`, `cache`, `storage` |
| C — entrada e saída | `io`, `network`                       |

Cada doc cobre (exigência da especificação):

- objetivo didático;
- mecânica principal;
- o que cada fase ensina;
- falas do Kernel (abertura + dicas);
- card de conceito;
- layout mobile e desktop, com esboço ASCII;
- contrato de dados das fases;
- regras puras a testar;
- riscos.

**Portão:** o dono do projeto revisa e aprova os docs (pode aprovar em lotes). Uma estação só
entra em construção com o doc aprovado. Ajustes pedidos voltam ao mesmo agente.

### Onda 3 — Bits, Memória, Armazenamento, Interrupções (4 agentes)

Estações sem dependência entre si. Bits cria `src/games/shared/binary/` e Memória cria
`src/games/shared/memory/`, que as ondas seguintes usam. Ordem de merge: 1 → 4 → 7 → 9.

### Onda 4 — Portas lógicas, Ciclo da CPU, Cache, Rede (4 agentes)

Começa depois do merge de Bits e Memória:

- Portas lógicas usa `shared/binary` e cria `shared/circuit/` (simulador de circuitos), base da
  ULA;
- Ciclo e Cache reutilizam as gavetas de `shared/memory`;
- Rede é independente; entra nesta onda para equilibrar a carga.

Ordem de merge: 2 → 5 → 6 → 10.

### Onda 5 — ULA + design doc do minigame final (2 agentes)

- **ULA** (`etapa-03-ula`): usa `shared/circuit` das Portas lógicas.
- **Design doc 11** (`etapa-docs-design-11`): escrito depois que 1–10 existem, porque o final
  reaproveita peças de cada estação. Ele precisa listar exatamente quais componentes de cada
  jogo serão reusados. **Portão:** aprovação do dono do projeto.

### Onda 6 — Etapa 11: Do clique ao pixel (1 agente)

Sequencial. Pode pedir à base que cada estação exporte uma "versão mini" da sua cena. Esses
pedidos são feitos em branches `base/mini-<id>` antes ou junto, com o orquestrador
coordenando.

### Onda 7 — Etapa 12: Fechamento e lançamento (1 agente + dono do projeto)

- **Revisão de conteúdo** de ponta a ponta: tom do Kernel consistente, frases de conexão
  encadeadas de 1 a 11, Manual completo.
- **Aparelhos físicos:** Android intermediário (60fps no perfil de desempenho) e iPhone. Também
  áudio com a chave de silêncio e PWA instalado offline.
- **Lighthouse mobile** em todas as rotas de jogo.
- **Orçamento de bundle:** chunk de cada cena até 60 KB gzip, bundle principal até 170 KB gzip.
- **Lançamento:** `released: true` nas estações aprovadas, merge, verificação em produção.
- **Placa inteira acesa:** celebração final no mapa quando as 11 peças acendem.

---

## 4. Rascunho das estações

Rascunhos para os design docs partirem, não decisões finais. Todo jogo segue a jornada padrão:

1. abertura do Kernel (até 3 falas);
2. tutorial sem derrota;
3. de 3 a 5 fases, cada uma com **uma ideia nova** (não só mais velocidade);
4. resultado com estrelas e "O que você aprendeu";
5. card de conceito;
6. frase de conexão com a próxima estação.

Todo jogo também tem:

- **modo sem tempo**;
- **tocar → tocar** como alternativa a qualquer arraste;
- **teclado completo**;
- informação nunca transmitida só por cor ou só por som.

### 1 · Bits (Interruptores) — "tudo é 0 e 1"

- **Mecânica:** uma fileira de interruptores (bits) acende lâmpadas com o valor de cada casa
  (1, 2, 4, 8…). Um painel pede um número ou uma letra; o jogador liga e desliga até bater.
  Só toque/clique/teclado: não precisa de arraste.
- **Fases:**
  - Tutorial: 1 bit = 2 estados; 4 bits contam de 0 a 15.
  - F1, valor das casas: 8 bits, números até 255, com o valor de cada casa visível.
  - F2, sem cola: os valores das casas somem e o jogador soma de cabeça. Bônus por usar o mínimo
    de toques.
  - F3, letras: uma tabela de códigos (ASCII simplificado) para formar uma palavra curta.
  - F4, imagem: uma grade de bits vira um desenho de 8×8 pixels.
- **Card:** "Bit e byte"; "Código de caracteres (ASCII/Unicode)".
- **Compartilhado:** cria `shared/binary/` (conversões, `BitRow` acessível com `aria-pressed`).
- **Conexão:** "Interruptores guardam 0 e 1. Para **decidir** com eles, a gente combina
  interruptores: são as portas lógicas."

### 2 · Portas lógicas — "lógica booleana"

- **Mecânica:** um circuito com entradas (interruptores) e lâmpadas-alvo. O jogador coloca as
  portas AND, OR e NOT nos encaixes (tocar a porta e depois o encaixe, ou arrastar). Uma tabela
  de casos mostra quando a lâmpada deve acender; o circuito é testado em todos os casos.
- **Fases:**
  - Tutorial: NOT.
  - F1: escolher AND ou OR.
  - F2: combinar duas portas (NAND).
  - F3: montar um XOR com AND, OR e NOT.
  - F4: estoque limitado de portas.
- **Card:** "Porta lógica"; "Tabela-verdade".
- **Compartilhado:** cria `shared/circuit/` (simulador puro de circuito acíclico, avaliação de
  tabela-verdade e o componente de encaixe), usado pela ULA.
- **Conexão:** "Com portas dá para tomar decisões… e também fazer contas. Próxima: a
  calculadora."

### 3 · A calculadora (ULA) — "como a CPU faz contas"

- **Mecânica:** soma binária coluna a coluna, com o "vai um" visível. Depois, montar o somador
  com portas e ver o "vai um" correr pela cadeia de somadores.
- **Fases:**
  - Tutorial: 0+1 e 1+1=10.
  - F1: somas de 4 bits feitas à mão, com "vai um".
  - F2: montar um meio-somador (XOR + AND).
  - F3: somador completo encadeado (o "vai um" se propaga).
  - F4: seletor de operação da ULA (somar, AND, OR).
- **Card:** "ULA"; "Vai-um (carry)".
- **Conexão:** "A ULA calcula, mas onde ficam os números enquanto isso? Próxima: a memória."

### 4 · Memória (RAM) — "gavetas com endereço"

- **Mecânica:** uma estante de gavetas numeradas. Pedidos chegam em fila: "guarde 42 na gaveta
  5", "o que tem na gaveta 3?". O jogador toca no valor e depois na gaveta, ou toca na gaveta
  para ler. A pressão vem do tempo; o modo sem tempo existe.
- **Fases:**
  - Tutorial: endereço × conteúdo.
  - F1: guardar e buscar.
  - F2: endereços em binário (liga com Bits).
  - F3: sobrescrever (o valor antigo se perde) e variáveis que mudam.
  - F4: falta de energia apaga a RAM (memória volátil × armazenamento).
- **Card:** "RAM"; "Endereço de memória".
- **Compartilhado:** cria `shared/memory/` (estante de gavetas, endereços, leitura e escrita
  animadas), usado por Ciclo e Cache.
- **Conexão:** "Na memória ficam números… e também o próprio programa. Próxima: o ciclo da
  CPU."

### 5 · O ciclo da CPU — "buscar → decodificar → executar"

- **Mecânica:** um miniprograma de 5 a 8 instruções (conjunto de brinquedo: CARREGA, SOMA,
  GUARDA, PULA) fica nas gavetas. O jogador leva cada instrução pelas três estações: buscar (o
  contador de programa aponta a gaveta), decodificar (escolher a peça certa) e executar (atualizar
  os registradores ou a memória).
- **Fases:**
  - Tutorial: uma instrução.
  - F1: o contador de programa avança sozinho.
  - F2: registradores e acumulador com CARREGA/SOMA/GUARDA.
  - F3: desvio e laço (PULA).
  - F4: o relógio acelera e a CPU faz sozinha o que o jogador fez.
- **Card:** "Ciclo de instrução"; "Registrador".
- **Conexão:** "Buscar na RAM toda hora é lento. Próxima: o cache."

### 6 · Cache — "guardar perto o que se usa muito"

- **Mecânica:** a CPU pede endereços. O cache (3 ou 4 espaços) fica perto dela. Acerto é
  rápido; falha faz uma viagem lenta e animada até a RAM. Quando o cache enche, o jogador
  escolhe quem sai. A pontuação é o tempo médio de acesso. É um jogo de decisão, não de reflexo.
- **Fases:**
  - Tutorial: acerto × falha.
  - F1: cache cheio, quem sai?
  - F2: localidade temporal (endereços que se repetem).
  - F3: localidade espacial (trazer a linha inteira com os vizinhos).
  - F4: dois níveis, L1 e L2.
- **Card:** "Cache"; "Hierarquia de memória".
- **Conexão:** "A RAM esquece tudo quando a luz apaga. Para guardar de verdade: o armazenamento."

### 7 · Armazenamento — "arquivos em blocos"

- **Mecânica:** um disco em grade de blocos e uma tabela de arquivos. O jogador salva arquivos
  de N blocos, apaga arquivos e reaproveita os buracos. Um arquivo maior que qualquer buraco é
  dividido (fragmentação). Também é preciso encontrar arquivos pela tabela.
- **Fases:**
  - Tutorial: salvar e o índice.
  - F1: apagar e reaproveitar.
  - F2: fragmentar com "continua no bloco X".
  - F3: HD × SSD (no HD, a cabeça de leitura se move e a fragmentação custa caro).
  - F4: desfragmentar e organizar.
- **Card:** "Sistema de arquivos"; "Fragmentação"; "HD × SSD".
- **Conexão:** "Arquivos, memória e CPU prontos. Quem decide quem usa a CPU? Próxima: os
  núcleos." (estação já existente)

### 9 · Interrupções e E/S — "a campainha do hardware"

- **Mecânica:** a CPU roda uma tarefa longa. Teclado, mouse, rede e disco "tocam a campainha". O
  jogador:
  1. pausa a tarefa e guarda o contexto (uma ficha numa pilha);
  2. atende o dispositivo;
  3. volta à tarefa.

  Esquecer o contexto faz a tarefa recomeçar.

- **Fases:**
  - Tutorial: uma interrupção.
  - F1: vários dispositivos em fila.
  - F2: prioridades (o teclado e o mouse não podem esperar o disco).
  - F3: perguntar a toda hora × campainha (polling × interrupção, com comparação de CPU
    desperdiçada).
  - F4: DMA (o disco copia sozinho e só avisa no fim).
- **Card:** "Interrupção"; "Entrada e saída (E/S)".
- **Ligação didática:** retoma a fase "Esperando dados" do Núcleos.
- **Conexão:** "Um dos dispositivos que mais toca a campainha é a placa de rede. Próxima: a
  rede."

### 10 · Rede — "pacotes e rotas"

- **Mecânica:** dividir uma mensagem em pacotes numerados com endereço de destino e
  encaminhá-los por um grafo de roteadores (tocar no pacote e depois no próximo roteador). No
  destino, remontar a mensagem na ordem.
- **Fases:**
  - Tutorial: um pacote com endereço.
  - F1: dividir e remontar fora de ordem.
  - F2: rotas e enlaces congestionados.
  - F3: perda de pacote, confirmação e reenvio.
  - F4: nome → endereço (DNS).
- **Card:** "Pacote"; "Roteador"; "DNS".
- **Conexão:** "Você viu cada peça. Agora vamos seguir um clique inteiro, do mouse até a tela."

### 11 · Do clique ao pixel — sequência integradora

- **Mecânica:** uma jornada narrada pela placa já acesa. Um clique percorre as estações e o
  jogador faz uma microtarefa em cada uma, reaproveitando a versão mini da cena de cada jogo.
- **Capítulos (as fases):**
  1. Entrada: mouse → interrupção.
  2. Decisão: escalonador → ciclo → ULA.
  3. Dados: cache → RAM → disco carregando uma imagem.
  4. Saída: bits do quadro → pixels acendendo.
- **Liberação:** só com as 10 outras estações concluídas.
- **Final:** a placa inteira acesa, celebração do Kernel e créditos.
- **Card:** "O caminho de um clique".

---

## 5. Definição de pronto (vale para toda etapa)

Uma etapa só é mergeada quando cumpre tudo abaixo, verificado pelo orquestrador depois do
rebase:

- [ ] Design doc aprovado (estações).
- [ ] Jogável de ponta a ponta em iPhone SE (375×667), 320px, Pixel 7, celular deitado, iPad e
      desktop, sem rolagem horizontal, sem elementos cortados e com alvos de toque de 44px ou
      mais (`e2e/layout.spec.ts` + o spec da estação).
- [ ] `e2e/<id>.spec.ts` cobre: abertura → tutorial → vitória → card no Manual → progresso
      salvo, mais uma derrota, mais o caminho só por teclado.
- [ ] Lógica pura em `logic/` com testes de unidade (regras, vitória, derrota, estrelas,
      determinismo com semente). Os testes de contrato da base passam.
- [ ] `npm run typecheck`, `npm run lint`, `npm test` e `npm run build` limpos.
- [ ] Nenhum texto do jogador fora de `content.ts`.
- [ ] Modo sem tempo, `prefers-reduced-motion` e "Menos animações" respeitados.
- [ ] Animações só com `transform` e `opacity`. Chunk da cena até 60 KB gzip.
- [ ] Lighthouse mobile na rota do jogo: Performance ≥ 90 e Acessibilidade ≥ 95.
- [ ] Funciona offline depois do primeiro acesso (assets novos entram no precache).
- [ ] `DECISIONS.md` atualizado com as suposições da etapa (seção "Etapa N").
- [ ] Novos objetos de jogo usam `released: false`.

---

## 6. Instruções para cada subagente

Modelo de prompt que o orquestrador passa a cada agente de estação (adaptar `<id>`, `<branch>`
e as dependências):

> Você vai construir a estação **<nome>** (`<id>`) do Scalonater na branch `<branch>`, num
> worktree isolado criado a partir da `master` atual.
>
> 1. Leia `README.md`, `DECISIONS.md`, `docs/PLANEJAMENTO.md` (seções 2, 4 e 5) e o design
>    doc aprovado `docs/design/<id>.md`. O design doc manda; o rascunho do planejamento só
>    orienta.
> 2. Copie `src/games/_template/` para `src/games/<id>/`. Siga o padrão do Núcleos
>    (`src/games/cores/`): fases como dados, lógica pura em `logic/`, texto em `content.ts`,
>    cena em `scene/` usando `GameFrame`, `useTutorialSteps`, `useNarration` e o kit
>    `src/ui/dnd`.
> 3. Edite **somente** os caminhos que são seus (seção 2.2). Não instale dependências. Se
>    precisar mudar algo compartilhado, anote em "Pedidos à base" e contorne localmente se
>    possível.
> 4. Escreva os testes de unidade junto com as regras e o `e2e/<id>.spec.ts` antes de
>    terminar.
> 5. Rode `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` e
>    `PORT=<porta> npm run test:e2e`. Tudo precisa passar.
> 6. Commits pequenos, em português, com a linha de atribuição da sessão. **Não faça merge nem
>    push para a `master`.** Faça push só da sua branch.
> 7. Relatório final, nesta ordem:
>    - o que foi feito;
>    - decisões e suposições (para o `DECISIONS.md`);
>    - pedidos à base;
>    - o que ficou pendente;
>    - resultados dos testes (números).

**Portas para os e2e em paralelo:** onda 3 usa 4301–4304 e onda 4 usa 4401–4404 (uma por
agente).

**Agentes de design doc** recebem só os passos 1, 6 e 7, mais o modelo
`docs/design/_template.md` e o rascunho da seção 4.

---

## 7. Riscos e como reduzir

| Risco                                                     | Mitigação                                                                                 |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Conflitos de merge entre branches paralelas               | Registro automático, donos por caminho, sem deps novas, merges em fila com rebase         |
| Estação nova bloquear o Núcleos em produção               | `meta.released` (seção 2.3)                                                               |
| Código compartilhado entre estações mudar de dono no meio | `src/games/shared/<x>` com dono único; mudanças viram pedidos para a onda seguinte        |
| Suíte e2e ficar lenta (6 formatos × 11 jogos)             | Shards no CI; local, rodar só o spec da estação + `layout.spec.ts` filtrado               |
| Bundle crescer                                            | Cena de cada jogo em `lazy()`; orçamento de 60 KB gzip por cena checado no fechamento     |
| Mecânica que depende de reflexo                           | Modo sem tempo obrigatório e estrelas que medem qualidade da decisão                      |
| Agente divergir do design aprovado                        | O design doc é a fonte da verdade; o orquestrador revisa o diff contra ele antes do merge |
| Inconsistência de tom e de visual entre estações          | Mesmos componentes de `src/ui`; revisão de conteúdo de ponta a ponta na Etapa 12          |

---

## 8. Decisões pendentes do dono do projeto

1. **Lançamento controlado:** usar `meta.released` (recomendado) ou publicar cada estação assim
   que for mergeada?
2. **Merge:** fazer local com `--no-ff` (como na Etapa 0) ou por pull request no GitHub com o CI
   como portão (recomendado a partir da Etapa 0.5)?
3. **Aprovação dos design docs:** todos de uma vez ao fim da Onda 2 ou em lotes, para a Onda 3
   começar antes?
4. **`vercel login`:** ainda pendente. Sem ele, os previews por branch dependem da integração
   da Vercel com o GitHub.
