import type { ConceptCard, GameCopy } from '@/engine/types'

/**
 * Todo texto do jogo Bits, nunca nos componentes (README, passo 4). Strings
 * aceitam **negrito**, {ícone} e {valor} (ver `goalValues` em `index.ts`).
 */
export const COPY: GameCopy = {
  title: 'Bits',
  component: 'Interruptores',
  tagline: 'Tudo o que um computador guarda é, no fundo, uma fileira de 0s e 1s.',
  concepts: ['Bit', 'Byte', 'Valor de casa', 'Código de caractere', 'Imagem em bits'],
  opening: [
    'Oi! Eu sou o **Kernel**. Todo computador, por dentro, só entende duas coisas: **ligado** e **desligado**.',
    'Cada interruptor desses é um **bit**. Um sozinho conta até 1. Juntos, eles contam **muito** mais longe.',
    'Vamos ligar o primeiro?',
  ],
  phases: {
    tutorial: {
      title: 'Ligado e desligado',
      teaser: 'Um interruptor, dois estados: 0 ou 1.',
      intro: [
        'Toque no interruptor para alternar entre **0** (desligado) e **1** (ligado).',
        'Primeiro ligue. Depois desligue de novo.',
      ],
      bulletsTitle: 'Como jogar',
      bullets: [
        'Toque no interruptor para alternar o estado.',
        'Pelo teclado: Tab até o interruptor, Enter ou Espaço para alternar.',
      ],
      goal: 'Ligue e depois desligue',
      real: 'Um interruptor de luz é a mesma ideia: ou está apagado, ou está aceso — nunca os dois.',
      learn: 'Um bit guarda só dois valores possíveis: 0 ou 1.',
      tip: 'Toque no interruptor para alternar entre 0 e 1.',
    },
    'nivel-1': {
      title: 'Valor de cada casa',
      teaser: '4 interruptores contam de 0 a 15. Cada casa vale o dobro da anterior.',
      intro: [
        'Com **4 interruptores** dá para contar bem mais longe: cada casa vale o dobro da anterior (8, 4, 2, 1).',
        'Ajuste os interruptores até a soma das casas ligadas bater com o alvo.',
      ],
      bulletsTitle: 'Objetivo',
      bullets: [
        'Forme {goal} números-alvo, um atrás do outro.',
        'O valor de cada casa aparece embaixo do interruptor dela.',
        'Cada alvo cai: acerte antes que chegue embaixo, ou perde uma vida.',
      ],
      goal: 'Forme {goal} números-alvo em {time} segundos',
      goalUntimed: 'Forme {goal} números-alvo, sem relógio',
      real: 'É assim que qualquer número cabe em binário: somando as casas ligadas.',
      learn: 'Cada casa vale o dobro da anterior: 1, 2, 4, 8… Some só as casas ligadas.',
      tip: 'Cada casa vale o dobro da anterior: 1, 2, 4, 8… Some só as casas **ligadas**. Se o alvo cair até a fileira sem bater, você perde uma vida.',
    },
    'nivel-2': {
      title: 'Oito interruptores, um byte',
      teaser: 'Com 8 bits já se chega a 255. Oito bits juntos formam um byte.',
      intro: [
        'Agora são **8 interruptores**: um {binary} **byte**. Juntos, chegam a 255.',
        'O valor de cada casa continua visível embaixo do interruptor.',
      ],
      bulletsTitle: 'Objetivo',
      bullets: [
        'Forme {goal} números-alvo entre 0 e 255.',
        'Cada alvo cai: acerte antes que chegue embaixo, ou perde uma vida.',
      ],
      goal: 'Forme {goal} números-alvo em {time} segundos',
      goalUntimed: 'Forme {goal} números-alvo, sem relógio',
      real: 'O tamanho de um arquivo (KB, MB, GB) é sempre medido em bytes: grupos de 8 bits.',
      learn: 'Oito interruptores já chegam a 255. Olhe o valor embaixo de cada um e some.',
      tip: 'Oito interruptores já chegam a 255. Olhe o valor embaixo de cada um e some.',
    },
    'nivel-3': {
      title: 'Sem cola',
      teaser:
        'Os valores das casas somem: agora é de cabeça. Bônus por usar o menor número de toques.',
      intro: [
        'Sem cola agora! Os valores das casas **somem**. Lembre: 1, 2, 4, 8, 16, 32, 64, 128.',
        'Comece pela casa mais alta que ainda cabe no número. Ganhe pontos extras se não "passar" do alvo e precisar desfazer.',
      ],
      bulletsTitle: 'Objetivo',
      bullets: [
        'Forme {goal} números-alvo sem ver o valor das casas.',
        'Cada alvo cai: acerte antes que chegue embaixo, ou perde uma vida.',
      ],
      goal: 'Forme {goal} números-alvo em {time} segundos',
      goalUntimed: 'Forme {goal} números-alvo no menor número de toques possível',
      real: 'Quem programa de verdade faz essa conta de cabeça o tempo todo, sem olhar nenhuma tabela.',
      learn:
        'Some de cabeça: 1, 2, 4, 8, 16, 32, 64, 128. Comece pela casa mais alta que ainda cabe.',
      tip: 'Sem cola agora! Lembre: 1, 2, 4, 8, 16, 32, 64, 128. Comece pela casa mais alta que ainda cabe no número.',
    },
    'nivel-4': {
      title: 'Letras em binário',
      teaser: 'Cada letra também tem um código binário. Forme a palavra bit a bit.',
      intro: [
        'Letras também são números: cada caractere tem um {letter} **código binário**, igual um número.',
        'Confira a tabela e forme a palavra-alvo, uma letra atrás da outra.',
      ],
      bulletsTitle: 'Objetivo',
      bullets: [
        'Forme a palavra-alvo completa, uma letra por vez.',
        'Cada letra cai: acerte antes que chegue embaixo, ou perde uma vida.',
      ],
      goal: 'Forme a palavra ({goal} letras) em {time} segundos',
      goalUntimed: 'Forme a palavra ({goal} letras), sem relógio',
      real: 'É por isso que um emoji vira "???" quando o programa não conhece o código certo.',
      learn: 'Cada letra tem o próprio código em binário, igual um número. Confira na tabela.',
      tip: 'Cada letra tem o próprio código em binário, igual um número. Confira na tabela.',
    },
    'nivel-5': {
      title: 'A tela é feita de números',
      teaser: 'Uma grade de bits vira um desenho: 1 pinta, 0 deixa em branco.',
      intro: ['64 interruptores (8x8): cada um é um **pixel**.'],
      bulletsTitle: 'Objetivo',
      bullets: [
        'Vá linha por linha.',
        'O desenho cai: reproduza antes que chegue embaixo, ou perde uma vida.',
      ],
      goal: 'Reproduza {goal} desenhos em {time} segundos',
      goalUntimed: 'Reproduza {goal} desenhos, sem relógio',
      real: 'Uma foto é só números: um por pixel.',
      learn: 'Pense nos bits como pixels: 1 pinta, 0 deixa em branco. Vá linha por linha.',
      tip: 'Pense nos bits como pixels: 1 pinta, 0 deixa em branco. Vá linha por linha.',
    },
  },
  connection:
    'Interruptores guardam **0** e **1**. Mas para **decidir** com eles — tipo "se os dois estiverem ligados, faça algo" — a gente combina interruptores de um jeito especial: são as **portas lógicas**.',
  finale: {
    title: 'Você domina o binário!',
    intro: 'Tudo que um computador guarda é, no fundo, uma fileira de 0s e 1s:',
    bullets: [
      'Cada interruptor é um bit: 0 ou 1.',
      'Cada casa vale o dobro da anterior — por isso 8 bits já chegam a 255.',
      'Letras e desenhos também são só números, interpretados de um jeito diferente.',
    ],
    extraTitle: 'Curiosidade',
    extra:
      'Um arquivo de texto, uma foto e uma música são todos, no fundo, sequências enormes de 0s e 1s — só mudam a forma como o computador os interpreta.',
  },
}

export const CARDS: readonly ConceptCard[] = [
  {
    id: 'bit-byte',
    title: 'Bit e byte',
    term: 'Bit e byte',
    summary:
      'Um bit é um interruptor: 0 ou 1. Oito bits juntos formam um **byte**, que já conta de 0 a 255.',
    analogy: 'Como um interruptor de luz: ou está apagado, ou está aceso — nunca os dois.',
    realWorld: 'O tamanho de um arquivo (KB, MB, GB) é sempre medido em bytes.',
    icon: 'binary',
  },
  {
    id: 'codigo-caractere',
    title: 'Código de caractere',
    term: 'ASCII/Unicode',
    summary:
      'Letras também são números: cada caractere tem um código binário combinado entre todos os computadores.',
    analogy: 'Como uma tabela de bandeiras: cada uma representa um país combinado antes.',
    realWorld: 'É por isso que um emoji vira "???" quando o programa não conhece o código certo.',
    icon: 'letter',
  },
]

/** Textos de interface que não são fala do Kernel nem texto de fase. */
export const UI = {
  speakerRole: 'o guia do computador',
  targetNumber: 'Alvo: {value}',
  targetLetter: 'Letra-alvo: {letter}',
  targetImage: 'Desenho-alvo',
  current: 'Você formou: {value}',
  currentBinary: 'Em binário: {binary}',
  sum: 'Soma = {value}',
  wordProgress: 'Palavra: {progress}',
  remember: 'Dica do Kernel: {hint}',
  ariaToggle: 'bit {n}, valor {place}, {state}',
  ariaOn: 'ligado',
  ariaOff: 'desligado',
  queueLabel: 'Próximos',
  queueEmpty: '—',
  dangerLabel: 'Perigo',
  cpuLabel: 'CPU',
  clearAll: 'Apagar tudo',
  gaugeShort: 'Faltam {value}',
  gaugeOver: 'Passou {value}',
  gaugeHit: 'Na mosca!',
  announceMatched: 'Alvo {value} formado! {done} de {goal}.',
  announceLetterMatched: 'Letra {letter} formada! {done} de {goal}.',
  announceImageMatched: 'Desenho reproduzido! {done} de {goal}.',
  announceMismatch: 'Ainda não é o alvo. Continue ajustando.',
  announceMissed: 'O alvo caiu sem bater. {lives} de {maxLives} vidas.',
  stats: { score: 'Pontos', targets: 'Alvos', time: 'Tempo', toggles: 'Toques', hearts: 'Vidas' },
  fail: {
    time: {
      title: 'Tempo esgotado',
      reason: 'O tempo acabou antes de formar todos os alvos.',
    },
    lives: {
      title: 'Sem vidas',
      reason: 'Alvos demais caíram até a fileira sem bater.',
    },
  },
  alphabetTitle: 'Tabela de código (reduzida)',
  imageGridLabel: 'Grade de 64 bits, 8 linhas por 8 colunas',
  imageCell: 'Pixel linha {row}, coluna {col}, {state}',
} as const
