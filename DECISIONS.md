# Decisões e suposições

Registro das escolhas feitas durante a construção. As que foram combinadas com o dono do
projeto estão marcadas como **(combinado)**. As demais são suposições minhas: podem ser
revistas a qualquer momento.

## Etapa 0 — Fundação

### Combinadas antes de começar

- **Deploy (combinado):** o preview sai pela Vercel CLI depois do `vercel login` feito pelo dono
  do projeto. O trabalho fica na branch `etapa-0`; a `master` (produção em
  scalonater.vercel.app) só muda no merge.
- **Progressão do mapa (combinado):** linear, com exceção. Cada estação exige as anteriores da
  trilha, mas pré-requisitos que ainda não existem como jogo são ignorados. Hoje o Núcleos fica
  liberado e as outras estações aparecem como "em construção". Quando os jogos 1 a 7 existirem,
  a ordem passa a valer sozinha (`engine/phases/progression.ts`).
- **Fases do Núcleos (combinado):** a fase 1 do protótipo virou o tutorial (guiado e sem
  derrota). As fases são: 1 = Esperando dados (E/S), 2 = Todo mundo tem sua vez (fatia de tempo e
  paciência), 3 = Dois por núcleo e cache quente (SMT e afinidade).
- **Música (combinado):** trilhas CC0 do OpenGameArt ("Techno_Chiptale", de Centurion_of_war,
  no mapa; "Stage 2", de Juhani Junkala, na partida). Os efeitos continuam sintetizados como no
  protótipo. Detalhes e licenças em `public/audio/music/CREDITS.md`.

### Stack e versões

- **React 18.3** (como pedido), com **React Router 7**: a versão 8 já exige React 19.
- **TypeScript 5.9** e **ESLint 9**: o typescript-eslint e o eslint-plugin-react ainda não
  suportam TypeScript 7 nem ESLint 10.
- **Tailwind CSS 4**: os tokens ficam em `@theme` dentro de `src/styles.css`, que é a fonte
  única de cores, fontes, raios e sombras. A paleta padrão do Tailwind foi removida: só existem
  as cores aprovadas, com nomes de função (`gold`, `cyan`, `mint`, `danger`, `paper`…).
- O CSS mais detalhado da cena do Núcleos (o cartão de thread e o layout em grade com áreas)
  fica em `games/cores/scene/cores.css`. Ele foi portado do protótipo aprovado e fica mais
  legível assim do que em classes utilitárias muito longas.
- **Fontes self-hosted** com Fontsource (só o subconjunto latino, que cobre o português), com
  `font-display: swap`.

### Arquitetura

- **Contrato `GameModule`** (`engine/types.ts`): metadados, texto (`GameCopy`), fases, cards,
  cena (carregada sob demanda) e `goalValues` (números para preencher a meta da fase). O
  `defineGame()` apaga o tipo específico da fase para o módulo caber no registro.
- **Catálogo × registro:** `games/catalog.ts` descreve as 11 estações e o desenho da placa
  (dados); `games/registry.ts` lista só os jogos prontos. Assim o mapa mostra a trilha inteira
  desde já, e um jogo novo entra adicionando uma linha no registro.
- **Lógica pura:** `games/cores/logic/rules.ts` trabalha numa cópia do estado e devolve os
  eventos (`place`, `blocked`, `done`…). A cena só traduz eventos em som, fala do Kernel,
  anúncio para leitor de tela e avanço do tutorial (`useCoresSession`).
- **Aleatoriedade com semente** (`engine/random.ts`): a mesma semente gera a mesma partida, o
  que deixa os testes determinísticos. Cada partida nova usa uma semente sorteada.
- **Tutorial guiado como dado:** cada etapa diz o que a faz avançar (`select`, `place`,
  `allBusy`, `done`, `goal`). Se o jogador adiantar uma etapa, o tutorial pula para a seguinte
  em vez de travar.
- **Persistência assíncrona** (`ProgressRepository`): hoje usa o localStorage e lê com
  validação (dado corrompido nunca derruba o jogo). A interface já é assíncrona para receber
  Supabase sem mudar os jogos.
- **Estado passageiro** (último resultado, estação que acabou de acender, convite de instalação)
  fica em `shell/session.ts` e não é salvo.

### Jogabilidade

- **Dificuldade (Fácil, Normal, Difícil):** mantida do protótipo, agora como ajuste global nos
  Ajustes e no hub da estação. Na derrota, o jogo oferece tentar numa dificuldade mais fácil.
- **Modo sem tempo:** desliga o relógio e roda a partida a 75% da velocidade. A paciência das
  threads continua valendo na fase 2 (ela é a própria lição de fatia de tempo), mas esvazia mais
  devagar por causa da velocidade. Sem relógio, as estrelas medem o uso da CPU (60% ou mais = 2;
  80% ou mais = 3) em vez do tempo que sobrou. Na derrota por tempo, o jogo oferece "Jogar sem
  tempo".
- **Estrelas:** quem vence leva pelo menos 1. Fase 1: tempo que sobrou (12% ou mais = 2; 30% ou
  mais = 3). Fases 2 e 3: vidas restantes (metade = 2; todas = 3). Tutorial: uso da CPU.
- **Pontos:** os mesmos do protótipo (25 por colocar rápido, 10 por colocar devagar, +40 com
  cache quente, 100 por tarefa concluída mais 25 por passo de combo). Mudança: mover uma thread
  de um núcleo para outro **não** dá pontos de novo. Antes isso era um jeito de ganhar pontos
  infinitos.
- **Programas renomeados:** "Render" virou **Vídeo** (tarefa "exportar"), mais claro para o
  público. A tarefa "vídeo" do Navegador virou "site", para não confundir com o programa Vídeo.
- **Textos generalizados:** as menções a Windows e a modelos de processador Ryzen do protótipo
  viraram "seu computador", porque o público não tem necessariamente esse hardware.
- **Rodada automática** ("Ver o sistema jogar sozinho"): mantida como bônus no final da estação.
  Ela não conta para o progresso.

### Interação, layout e acessibilidade

- **Arrastar:** dnd-kit com `PointerSensor` (ativa depois de 8px de movimento). Na faixa
  horizontal da fila no celular, o gesto lateral rola a fila e o gesto para cima (rumo à CPU)
  arrasta a thread. Na lista vertical (desktop, tablet deitado, celular deitado), o contrário.
  Isso é feito com `touch-action`. A thread arrastada fica acima do dedo para não esconder o
  destino, e há um "ímã" que leva ao espaço livre mais próximo quando o dedo está perto do
  processador.
- **Teclado:** não usei o sensor de teclado do dnd-kit, porque ele captura Enter e Espaço e
  brigaria com o "tocar e tocar". Pelo teclado o caminho é Tab até a thread, Enter, Tab até o
  núcleo, Enter. Esc ou P pausam. Os anúncios do dnd-kit foram traduzidos para o português.
- **Layouts que se reorganizam** (`cores.css`):
  - celular em pé: HUD, CPU com 4 núcleos lado a lado, fila em faixa horizontal abaixo, espera
    de dados e Kernel;
  - celular deitado: fila e espera à esquerda, CPU à direita;
  - tablet em pé: a mesma ordem do celular, com peças grandes;
  - desktop e tablet deitado (a partir de 1024×600): fila ao lado da CPU, como no protótipo.
- **Variantes de tela:** `compact` (celular) e `roomy` (com espaço), em vez de `sm:`. Um celular
  deitado tem 667px de largura e só 375px de altura, então largura sozinha não basta.
- **No celular, as vidas aparecem no painel da fase** (como no protótipo), para o HUD caber em
  3 colunas.
- **Zoom:** o zoom da página não foi bloqueado (acessibilidade). Durante a partida,
  `touch-action` nas áreas de jogo e `overscroll-behavior: none` evitam zoom e rolagem
  acidentais.
- **Animações:** só `transform` e `opacity` nas barras e cartões. O ajuste "Menos animações"
  vale mesmo sem a preferência do sistema, e a preferência do sistema é sempre respeitada.
- **Mapa:** uma placa deitada (estilizada, com soquete da CPU, RAM, SSD, vídeo e portas) no
  desktop e no tablet, e uma trilha vertical rolável em zigue-zague no celular em pé. As trilhas
  entre estações passam por baixo das peças, como numa placa de verdade.
- **Nome das estações para leitores de tela:** começa pelo texto visível (critério WCAG 2.5.3),
  com a peça da placa como complemento.

### PWA e áudio

- **Atualização do service worker com aviso** (`registerType: 'prompt'`): uma versão nova nunca
  recarrega a página no meio de uma partida. Aparece um aviso com o botão "Atualizar".
- **Precache:** app, fontes, ícones e a música em WebM. O MP3 (para Safari antigo) entra no
  cache na primeira vez que toca.
- **Música por Web Audio** (Howler sem `html5`): o loop fica sem emenda. O
  `Howler.autoSuspend` está desligado; senão, sem música tocando, o contexto seria suspenso e os
  efeitos ficariam mudos.
- **Áudio no iPhone:** além do desbloqueio do Howler, todo gesto tenta liberar o áudio, e
  `navigator.audioSession.type = 'playback'` faz tocar mesmo com a chave de silêncio ligada
  (comportamento herdado do protótipo).
- **Lighthouse:** a versão 12 não tem mais a categoria PWA. A instalação é verificada pelo
  manifesto (teste e2e) e pelo service worker funcionando offline (teste e2e no Chromium).

### Testes

- O "iPhone SE" do Playwright é o modelo de 2016 (320×568). Os testes usam 375×667, como pede a
  especificação, e há um projeto extra de 320×568 para a largura mínima.
- `?speed=N` (até 20) acelera uma fase. Existe para os testes e2e. Fica disponível no build de
  produção porque é inofensivo e ajuda a revisar fases.

## Etapa 0.5 — Base compartilhada v2

Infraestrutura para as estações 1–7, 9 e 10 construírem em paralelo sem conflito de arquivo
(`docs/PLANEJAMENTO.md`, seção 3, Onda 1). Não é um jogo novo: o Núcleos continua igual, com
todos os testes de antes passando sobre a base nova.

### Combinada antes de começar

- **Lançamento controlado (combinado, diferente da recomendação do planejamento):** a estação
  fica disponível em produção **imediatamente ao ser mergeada na master**, sem gate de "em
  construção" por padrão. Ainda assim, o campo `meta.released` existe no `GameModule` e é
  respeitado por `GAMES`/`stationStatus`/mapa/Manual, para poder ser usado estação por estação
  no futuro se o dono do projeto decidir. O Núcleos está com `released: true`; não há nenhuma
  lógica de bloqueio além do que esse campo já expressa.

### Suposições

- **Registro automático:** `games/registry.ts` descobre módulos com
  `import.meta.glob('./*/index.ts', { eager: true })`, aceitando o `GameModule` como export
  `default` **ou** nomeado (o Núcleos exporta os dois, para não quebrar quem já importava
  `coresGame`). Pastas que começam com `_` (como `_template`) são ignoradas. `ALL_GAMES` lista
  todo módulo descoberto (usado pelos testes de contrato); `GAMES`/`GAMES_BY_ID` filtram pelos
  liberados nesta build.
- **`VITE_SHOW_UNRELEASED`:** além da variável de ambiente, `npm run dev` (`import.meta.env.DEV`)
  também mostra tudo liberado, como pedido no planejamento.
- **`GameFrame` não impõe o grid do campo de jogo:** ela só desenha o painel de fase, o HUD, os
  três controles padrão (mudo/pausar/recomeçar) e o narrador, posicionados pelas áreas `level`,
  `stats`, `ctrl` e `nar` que o CSS de cada jogo já declara. O campo (`children`) é passado
  adiante como está — cada jogo mantém o próprio grid e as próprias áreas ali dentro (no
  Núcleos, `cpu`/`queue`/`io`, inalteradas em `cores.css`). Isso deixou a migração do Núcleos
  seguro (zero mudança visual) e ainda generaliza a parte que se repete.
- **Tutorial e narração só extraídos como funções puras**, não como os hooks React completos
  descritos no item (`useTutorialSteps`/`useNarration` existem e têm hook de conveniência, mas
  o Núcleos continua guardando o próprio estado numa store Zustand por causa do game loop a
  60fps; ele importa `advanceTutorialStep`/`say`/`maybeRevertNarration` em vez de reimplementar
  a lógica). Um jogo novo sem essa necessidade pode usar os hooks diretamente.
- **Kit `src/ui/dnd`:** generalizado a partir do Núcleos (`magnetCollision`, `liftAboveFinger`,
  `useDragClickGuard`, `buildDndAnnouncements`), que passou a usá-lo no lugar do código inline
  equivalente. `DragButton`/`DropTarget` (componentes acessíveis "tocar ou arrastar") foram
  criados para as próximas estações, mas o Núcleos não foi migrado para eles: suas peças
  (`ThreadCard`/`Processor`/`Zones`) têm estilo e `data-*` muito específicos, e trocá-los agora
  seria risco sem ganho (ele já cumpre o padrão com `useDraggable`/`useDroppable` direto).
- **Extensões por jogo (`icons`/`sfx`):** implementadas como registro em tempo de execução
  (`registerIcons`/`registerSfx`), carregado pelo `registry.ts` ao descobrir cada módulo. Os
  tipos `IconName`/`SfxName` continuam com autocomplete dos nomes embutidos e aceitam qualquer
  outra string (`string & {}`), então um nome de ícone/efeito de um jogo futuro não precisa
  mudar nenhum tipo compartilhado.
- **Testes de contrato (`src/games/contract.test.ts`)** rodam sobre `ALL_GAMES` (liberados ou
  não), para uma estação em construção ser cobrada do mesmo jeito antes de virar
  `released: true`.
- **e2e genérico:** `seedProgress`/`startPhase` passam a receber o id do jogo (antes eram só do
  Núcleos). `e2e/layout.spec.ts` descobre jogos e fases em tempo de execução por
  `window.__SCALONATER_GAMES__` — um pequeno global exposto só com id do jogo e ids de fase
  (nada que a página já não mostre), lido pelo `registry.ts` na carga. Isso evita manter uma
  lista de jogos/fases escrita à mão no arquivo de teste. Os testes de layout de uma fase
  específica rodam como `test.step` dentro de um único teste por viewport, não um teste por
  fase: mais simples de escrever de forma genérica, ao custo de um relatório menos granular.
- **CI (`.github/workflows/ci.yml`):** criado e validado como YAML, mas **não testado em
  execução real** (exigiria o repositório no GitHub Actions, fora do alcance desta sessão).
  Roda em todo push de branch `etapa-*` e em PRs para a `master`: tipos, lint + format:check,
  testes de unidade, build e e2e em 4 shards.
- **Deploy (pendência herdada da Etapa 0):** o `vercel login` continua pendente; não foi
  possível configurar os previews por branch nesta sessão (depende de acesso externo).

## Etapa 7 — Armazenamento

Estação `storage`: um disco em grade de 24 blocos (6×4, girando para 4×6 no celular em pé) e
uma tabela de arquivos. O jogador salva, apaga e reaproveita espaço; a Fase 2 força
fragmentação, a Fase 3 introduz o custo de deslocamento da cabeça no HD (contra o custo fixo
do SSD) e a Fase 4 cobra usar "Desfragmentar". Design doc: `docs/design/storage.md` (seguido
sem alterações).

### Suposições

- **`released: false`** (o padrão documentado em `docs/PLANEJAMENTO.md`, seção 5, para toda
  estação nova). Tentei `true` primeiro, lembrando a leitura de que a Etapa 0.5 "não tem gate
  por padrão" — mas isso é só sobre o Núcleos (já `true` desde a Etapa 0); a própria seção 5
  lista "Novos objetos de jogo usam `released: false`" como item da definição de pronto. Com
  `released: true`, a estação `storage` (que vem antes do Núcleos na trilha) passava a ser
  pré-requisito dele pela regra "linear, com exceção", e isso **quebrou**
  `e2e/app.spec.ts` (teste já existente, da jornada do Núcleos — não é meu para editar), que
  assume o Núcleos disponível sem pré-requisitos. Com `false`, o Núcleos volta a ficar como
  antes e a estação nova fica "em construção" até o dono do projeto decidir liberá-la.
- **Para rodar o e2e desta estação localmente** (`e2e/storage.spec.ts` e o `storage` dentro de
  `e2e/layout.spec.ts`), é preciso **`VITE_SHOW_UNRELEASED=1`** na build de produção que o
  Playwright sobe, já que ela não é um jogo liberado:
  `PORT=4303 VITE_SHOW_UNRELEASED=1 npx playwright test` (em vez de `npm run test:e2e` puro).
  Isso é o mecanismo já documentado para revisão (`npm run dev` já faz isso sozinho;
  `registry.ts` já lê essa variável) — não editei nenhum arquivo de configuração para isso, só
  passei a variável na hora de rodar. **Pedido à base:** com `released: false` como padrão,
  **todo** `e2e/<id>.spec.ts` de uma estação nova vai falhar no job de e2e do
  `.github/workflows/ci.yml` como está hoje, porque ele não passa `VITE_SHOW_UNRELEASED=1`
  (só `PORT`). Vale a base acrescentar essa variável ao job de e2e do CI (ou criar um job
  separado com ela) antes da próxima estação ser integrada.
- **Grade de 24 blocos mantida** (não precisou cair para 16): a grade 4×6 no celular em pé coube
  com blocos de 44px de sobra, usando `minmax(44px, 1fr)` e as variáveis CSS
  `--storage-cols-mobile`/`--storage-cols-desktop` (= `diskBlocks/columns` e `columns`), por
  fase — a mesma numeração em ordem de leitura vale nos dois layouts porque o grid só reflui os
  mesmos blocos, na mesma ordem do DOM.
- **Colocação manual, não "primeiro-ajuste automático", na jogabilidade real:** o design doc
  descreve o jogador tocando em blocos livres "na ordem que quiser". Implementei
  `applyOperation(state, operation, device, blocosEscolhidos?)` para usar exatamente os blocos
  tocados pelo jogador (fragmentado ou não, conforme o toque) e cair para `allocate()`
  (primeiro-ajuste automático) só quando nenhuma escolha é passada — usado por `delete` (não há
  blocos para escolher) e como base determinística para os testes de unidade. Isso faz a
  fragmentação ser uma consequência real da escolha do jogador, não só do layout da fase.
- **`seekCost` implementado ao pé da letra do contrato do design doc:** no HD, só a soma das
  distâncias × `hdSeekCostPerBlock` (sem somar `baseCostPerBlock`); no SSD, só
  `baseCostPerBlock * quantidade`. Ou seja, `baseCostPerBlock` só importa no SSD — uma
  simplificação que ainda cumpre a lição (HD penaliza posição, SSD não) sem um segundo termo
  competindo na mesma conta.
- **Derrota por "sem espaço" (Fases 1–2) é uma regra testada isoladamente, não alcançável pela
  sequência fixa das fases como calibrei:** como as `operations` de cada fase são fixas (sem
  sorteio) e o jogador não escolhe *quais* operações acontecem, só *onde* colocar cada arquivo,
  a quantidade total de blocos livres em qualquer momento não depende da posição escolhida —
  só da contagem, que dimensionei para nunca faltar nas Fases 1 e 2. A regra existe e tem teste
  de unidade direto (`applyOperation` com um disco pequeno de propósito), mas a jornada e2e de
  derrota usa a Fase 3 (tempo no HD), que É alcançável pela escolha do jogador (blocos
  espalhados de propósito). Caso o dono do projeto queira uma derrota por espaço realmente
  jogável, a mudança natural é permitir que o jogador escolha *qual* arquivo apagar (não só
  aceitar o pedido fixo) — ficaria para uma iteração futura, não implementada aqui.
- **Pontuação inventada:** o design doc não detalha números de pontos para esta estação (só os
  do Núcleos, que são de outro jogo). Usei `registerHit(scoring, 50, 15)` por operação limpa,
  `registerHit(scoring, 30, 5)` quando fragmenta (ainda pontua, só menos — fragmentar não é
  erro) e `registerHit(scoring, 20, 5)` por apagar; `breakCombo` só no "sem espaço".
- **Estrelas por fase:** Fases 1–2 (`opsLeft`) medem `(3 - noSpaceCount) / 3`, ou seja, quantas
  das 3 faltas de espaço permitidas o jogador evitou (sempre 3 estrelas se a sequência de
  operações nunca falha, o que é o caso normal destas duas fases — o desafio delas é espacial,
  não de pontuação). Fases 3–4 (`timeLeft`) medem a fração do orçamento de tempo que sobrou.
  Limiares calibrados à mão simulando a sequência fixa de operações de cada fase com escolha de
  blocos "razoável" (os primeiros blocos livres, em ordem); não houve playtest humano.
- **`maxTotalTime` calibrado por simulação, não por playtest:** Fase 3 = 150 (jogo razoável
  chega a ~115 no HD); Fase 4 = 125 (sem desfragmentar chega a 130, com uma desfragmentação bem
  posicionada chega a ~120). Como a geometria depende de qual bloco exato o jogador toca, vale
  revisar esses números depois de um playtest humano real.
- **Tutorial com etapa extra além de `operations`:** o contrato de fases do design doc não lista
  um campo de tutorial guiado (ele é específico do Núcleos). Acrescentei `tutorial?:
  readonly { id; advanceOn: 'save' | 'search' }[]` em `StoragePhase`, só para esta estação,
  seguindo o padrão de "fases como dados" do README (extensão própria do jogo, sem mudar nada
  compartilhado). A etapa "achar o arquivo pela tabela" do tutorial não conta como uma
  `operation` (não afeta `goalValues`), só atrasa o `onFinish` da cena até o jogador procurar o
  arquivo "A" na tabela.
- **`defragment()` não reposiciona blocos de sistema:** eles ficam fixos nas próprias posições
  (não são um `FileEntry`, só uma marca no array `disk`); a Fase 4 (a única com
  `defragAvailable: true`) não tem `reservedBlocks`, então isso nunca é exercitado em jogo —
  documentado por segurança caso uma fase futura combine as duas coisas.
- **Sem dificuldade nem modo automático:** `hasDifficulty: false`, `hasAutoplay: false` — o
  design doc não descreve nenhum dos dois para esta estação (diferente do Núcleos).

### Pedidos à base

Não editei nada fora de `src/games/storage/**` e `e2e/storage.spec.ts`, mas dois pedidos:

- **`.github/workflows/ci.yml`:** acrescentar `VITE_SHOW_UNRELEASED: '1'` ao `env` do job de
  e2e (hoje só tem `PORT`). Sem isso, o e2e de qualquer estação nova com `released: false` (o
  padrão) falha no CI, porque a build de produção não mostra a estação. Ver suposição acima.
- **Bug encontrado em `src/shell/screens/GameHub.tsx` (cabeçalho do hub, fora do meu
  escopo):** no iPhone SE (375px), o título da estação (`<h1 className="... uppercase ...">`)
  vaza ~10px para fora da tela quando é uma palavra única mais longa que "Núcleos" — é o caso
  de "Armazenamento" (13 letras, sem espaço para quebrar linha). Reproduzido isolando o
  elemento: a caixa do `h1` mede 271px, mas o texto pinta até 385px num viewport de 375px,
  porque o container é um item flex com `min-w-0` (encolhe) ao lado de um ícone de tamanho
  fixo, e uma palavra única não tem onde quebrar. Não editei `GameHub.tsx` (fora do meu
  escopo), mas por isso meu `e2e/storage.spec.ts` não chama `expectNoHorizontalScroll` logo
  depois da abertura (comentário no próprio arquivo aponta para aqui). Correção sugerida, de
  baixo risco: `overflow-wrap: anywhere` (ou `break-words`) nesse `h1`, ou reduzir o tamanho da
  fonte no `compact:`. Vale revisar outras estações com título de uma palavra longa (ex.:
  "Interrupções").

## Etapa 5 — O ciclo da CPU

Estação `cycle`: o jogador leva cada instrução de um miniprograma pelas três estações do ciclo
— Buscar, Decodificar, Executar —, reaproveitando a estante de gavetas de `src/games/shared/memory`
(estação Memória) para o programa e os dados. Design doc: `docs/design/cycle.md`, seguido com
algumas extensões documentadas abaixo (o contrato de instruções, a codificação e as falas são do
doc; os números exatos dos programas de cada fase são meus).

### Suposições

- **`totalExecutions` (campo extra em `CyclePhase`, fora do contrato do design doc):** a vitória
  não pode ser só "o PC passa do fim do programa" — a Fase 1 termina com um `PULA 00` que volta o
  PC para o endereço 0 de propósito ("fim de rodada", conforme o próprio doc), então o PC nunca
  "passa do fim" ali. Em vez disso, cada fase declara quantas execuções a completam (contando as
  repetições do laço da Fase 3), e `computeOutcome`/`executeStation` vencem quando
  `executedCount >= totalExecutions` (mais a meta de ACC, se a fase tiver uma). Mesma lógica de
  extensão própria já usada pela Memória (`tutorial?`) e pelo Armazenamento (`tutorial?`).
- **`data` (campo extra em `CyclePhase`):** dados fora do programa (contadores, operandos de
  `SOMA`) ficam em endereços próprios, gravados por `loadProgram` junto com o programa. O design
  doc não cobre "dados fora do programa" no contrato, só o programa em si.
- **Dado × instrução na mesma estante:** como ambos são só `number` nas gavetas (módulo
  compartilhado), um valor só é tratado como instrução quando o opcode decodificado cai em
  1..5 (`decodeCellValue`); valores de dado ficam sempre abaixo de 100 (opcode 0) nos programas
  que escrevi, então nunca colidem. `renderValue` e `labelFor` da estante usam essa mesma regra.
- **Programas e números de cada fase (não fixados pelo design doc, só o formato):** calibrei à
  mão para cada fase ensinar exatamente a ideia nova da tabela do doc — Fase 1 (PC avança só,
  sem meta de ACC), Fase 2/4 (ACC final = 15, mesma meta, Fase 4 com metade do
  `secondsPerStation`), Fase 3 (laço de 3 repetições, contador decrescente numa gaveta,
  `maxLoopIterations: 6` como margem de segurança). Sem playtest humano.
- **Decodificação errada é o único tipo de "erro" contado:** a tabela do doc cita, na Fase 2,
  "3 decodificações erradas **ou** 2 execuções no registrador errado" como derrota — mas a
  mecânica descrita (seção "Mecânica principal") só tem um botão único "Executar" (sem escolha de
  registrador), então não há como o jogador "executar no registrador errado" à parte de já ter
  decodificado errado. Tratei isso como uma inconsistência de rascunho no doc e contei só erros de
  decodificação (e de estação expirada, pelo relógio) — a CPU sempre executa a instrução já
  corretamente decodificada.
- **Layout das três estações empilhado, não lado a lado (diferente do esboço ASCII do doc):** a
  paleta de 5 peças (Decodificar) precisa de largura para os botões chegarem a 44px de toque; com
  as três caixas em linha (mobile em pé, ou a barra lateral do layout grande), a paleta ficava com
  menos de 44px por botão. `cycle-stations` empilha as três caixas em qualquer tamanho de tela —
  a ordem Buscar → Decodificar → Executar continua clara, só que vertical em vez de em linha.
- **Peça da paleta sem `aria-label` próprio:** o texto visível (`CARREGA`, `SOMA`...) já é o nome
  acessível do botão; não há ambiguidade a desfazer (diferente da gaveta, que precisa de um rótulo
  mais longo com endereço e conteúdo).
- **Sem dificuldade nem modo automático:** `hasDifficulty: false`, `hasAutoplay: false` — o design
  doc não descreve nenhum dos dois para esta estação.
- **`released: true`** — política combinada na Etapa 0.5/Etapa 7: publica ao mergear.

### Pedidos à base / achados fora do meu escopo

- **Integração entre estações já mergeadas quebrou a suposição "a primeira estação da trilha
  está sempre livre" de specs já existentes:** com Bits, Memória, Armazenamento e Interrupções já
  na `master`, a progressão "linear, com exceção" passou a exigir Bits **e** Memória completos
  antes de liberar o Ciclo no mapa (`stationStatus`/`effectivePrerequisites`). O mesmo já afeta
  `e2e/memory.spec.ts` (confirmei rodando-o: falha no mesmo clique em `[data-station="memory"]`
  por exigir Bits completo primeiro, algo que não existia quando aquele spec foi escrito). Meu
  `e2e/cycle.spec.ts` contorna isso marcando Bits e Memória como completos direto no
  `localStorage` antes do teste de jornada (função `seedPrerequisites`), mas os specs das
  estações anteriores a mim provavelmente também precisam desse mesmo ajuste — não editei os
  specs de outras estações (fora do meu escopo).
- **`e2e/cycle.spec.ts`, teste de jornada completa, falha no projeto `small-phone-320`** (320px):
  o clique em "Ver card" é bloqueado por um elemento interceptando o ponteiro (o papel de fala do
  Kernel, em `src/shell/screens/ResultScreen.tsx`), mesmo com o botão "visível, habilitado e
  estável" segundo o Playwright. Só reproduz em 320px — passa em `desktop`, `iphone-se` (375px) e
  `phone-landscape`. Como `ResultScreen.tsx` é `src/shell/**` (fora do meu escopo de edição), não
  investiguei a fundo; registro aqui para a base revisar (pode ser um problema do próprio
  `ResultScreen` nesse breakpoint, não específico do Ciclo).

## Pendências conhecidas

- Testes em aparelhos físicos (Android intermediário e iPhone) e medição real de 60fps:
  verificar no preview.
- A música foi escolhida pela descrição e por análise automática do áudio. Vale ouvir antes de
  publicar em produção.
- CI (`.github/workflows/ci.yml`) nunca rodou de verdade; revisar no primeiro push/PR real.
- `vercel login` e os previews por branch (`VITE_SHOW_UNRELEASED=1`) continuam pendentes.
- **Armazenamento (Etapa 7):** os limiares de tempo (Fases 3–4) e de estrelas foram calibrados
  por simulação, não por playtest humano; vale revisar a dificuldade depois de jogar de
  verdade. A derrota por "sem espaço" (Fases 1–2) tem regra e teste de unidade, mas não é
  alcançável pela jornada normal das fases como calibradas (ver suposições da Etapa 7).
- **Ciclo da CPU (Etapa 5):** números de programa/tempo calibrados por simulação, sem playtest
  humano; a suposição de "decodificação errada é o único tipo de erro" (ver acima) merece
  confirmação do dono do projeto, já que o design doc menciona um segundo tipo de erro para a
  Fase 2 que a mecânica descrita não suporta. O teste de jornada completa de `cycle.spec.ts`
  falha em `small-phone-320` por um problema de `ResultScreen` (fora do meu escopo) — ver
  "Pedidos à base" acima. Specs e2e de estações anteriores (ao menos a Memória) provavelmente
  também precisam seedar os pré-requisitos da trilha depois da integração; não ajustei os specs
  de outras estações.
