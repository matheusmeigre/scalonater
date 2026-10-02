# Scalonater

Plataforma web de minigames que ensinam como um computador funciona, do bit ao clique na tela.
Cada peça de uma placa-mãe estilizada é uma estação: ao concluir o minigame, a peça acende e a
energia segue para a próxima. O guia de toda a jornada é o **Kernel**, um robozinho narrador.

Público: estudantes e curiosos a partir de ~12 anos. Todo texto do jogo está em português (pt-BR).

## Como rodar

Requisitos: Node 22+ e npm.

```bash
npm install
npm run dev        # servidor de desenvolvimento em http://localhost:5173
npm run build      # checa os tipos e gera o build de produção em dist/
npm run preview    # serve o build (com service worker) em http://localhost:4173
```

## Como testar

```bash
npm test                         # testes de unidade (Vitest): lógica dos jogos e do motor
npm run lint                     # ESLint (inclui a regra que proíbe texto solto nos componentes)
npm run typecheck                # TypeScript strict
npx playwright install           # uma vez: baixa Chromium e WebKit
npm run test:e2e                 # Playwright: iPhone SE, 320px, Pixel 7, celular deitado, iPad e desktop
```

Os testes e2e rodam contra o build de produção (o Playwright sobe o `vite preview` sozinho).
Eles verificam a jornada completa, a ausência de rolagem horizontal, alvos de toque de 44px ou
mais, jogo pelo teclado, arrastar e soltar, pausa, derrota e o funcionamento offline.

Dica: `?speed=8` no endereço de uma fase acelera a partida (útil para testes e para revisar
fases sem esperar).

## Estrutura

```
src/
  engine/        núcleo compartilhado, sem nada específico de jogo
    loop/          useGameLoop (tick, pausa, velocidade) e contagem regressiva
    scoring/       pontos, combo e estrelas
    phases/        progressão de fases e estações (pré-requisitos)
    events/        barramento de eventos tipado
    audio/         música (Howler) e efeitos sintetizados, com mudo global
    persistence/   ProgressRepository: localStorage hoje, trocável (ex.: Supabase)
    store/         progresso e ajustes (Zustand)
    types.ts       contrato GameModule
  ui/            design system: botões 3D, painéis, Kernel, narrador, HUD, modal, cards…
  content/       textos do shell (pt-BR) e das estações do mapa
  games/
    catalog.ts     trilha e desenho da placa-mãe (deitada e em pé)
    registry.ts    lista dos minigames prontos
    cores/         minigame "Núcleos"
      phases.ts      fases como dados
      content.ts     todo o texto do jogo (falas do Kernel, cards, fases)
      logic/         regras puras e testadas (sem React)
      scene/         componentes da cena
  shell/         rotas e telas: mapa, hub da estação, partida, resultado, Manual, Ajustes
e2e/             testes Playwright
legacy/          protótipo original em HTML puro (referência)
```

## Como criar um novo minigame

1. **Design doc antes do código.** Combine o objetivo didático, a mecânica, o que cada fase
   ensina, as falas do Kernel, o card de conceito e os layouts de celular e desktop.
2. Crie `src/games/<id>/`, onde `<id>` é uma das estações de `STATION_IDS` (`src/engine/types.ts`).
3. **Fases como dados** em `phases.ts`: um array de objetos que estendem `PhaseBase`
   (`id`, `kind: 'tutorial' | 'level'`, `canLose`, `unlocksCard`) mais os parâmetros do seu jogo.
   A primeira fase deve ser o tutorial, sem derrota. Para adicionar uma fase depois, basta
   acrescentar um objeto aqui e o texto dela em `content.ts`.
4. **Texto em `content.ts`**, nunca nos componentes: `GameCopy` (abertura do Kernel com até 3
   falas, texto de cada fase, conexão com a próxima estação, final) e os `ConceptCard`s.
   As strings aceitam `**negrito**`, `{ícone}` (nome de `src/ui/icons.tsx`) e `{valor}`.
5. **Lógica pura em `logic/`**: funções `(estado, entrada) → novo estado` que devolvem eventos.
   Use `engine/random.ts` (com semente) para a lógica continuar determinística e testável.
   Escreva os testes em `logic/*.test.ts`.
6. **Cena em `scene/`**: um componente default que recebe `SceneProps` (fase, dificuldade,
   modo sem tempo, pausa, velocidade, `runId` para recomeçar) e chama `onFinish(outcome)`.
   Use `useGameLoop` para o tempo, os componentes de `src/ui` para HUD e narrador, e ofereça
   sempre a alternativa "tocar para selecionar → tocar no destino" para qualquer arraste.
7. Exporte o módulo em `index.ts` com `defineGame({ meta, copy, phases, cards, Scene, goalValues })`
   e carregue a cena com `lazy()`.
8. Registre-o em `src/games/registry.ts`. O mapa, as rotas, o hub, o resultado e o Manual se
   ajustam sozinhos; o shell não precisa mudar.
9. Acrescente testes e2e para a jornada do novo jogo em `e2e/`.

## Deploy

O projeto é uma SPA estática (Vite) publicada na Vercel. `vercel.json` define o build, o
redirecionamento das rotas para `index.html` e o cache do service worker. Cada push numa branch
gera um preview; a `master` é a produção.

## Créditos

Músicas em domínio público (CC0), detalhes em `public/audio/music/CREDITS.md`. Fontes Russo One
e Chakra Petch (SIL Open Font License), servidas pelo próprio app via Fontsource.
