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

## Pendências conhecidas

- Testes em aparelhos físicos (Android intermediário e iPhone) e medição real de 60fps:
  verificar no preview.
- A música foi escolhida pela descrição e por análise automática do áudio. Vale ouvir antes de
  publicar em produção.
- CI (`.github/workflows/ci.yml`) nunca rodou de verdade; revisar no primeiro push/PR real.
- `vercel login` e os previews por branch (`VITE_SHOW_UNRELEASED=1`) continuam pendentes.
