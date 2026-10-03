import type { ConceptCard, GameCopy } from '@/engine/types'

/**
 * Todo texto do jogo Bits, nunca nos componentes (README, passo 4). Strings
 * aceitam **negrito**, {ícone} e {valor} (ver `goalValues` em `index.ts`).
 */

/** As três regras do protótipo "Decodificador de pacotes", repetidas em toda fase de nível. */
const RULES = [
  'Lâmpada acesa vale o número da casa. Some até bater no alvo.',
  'Acertou? O pacote decodifica sozinho. Rápido dá mais pontos e sobe o combo.',
  'Se o pacote chegar na CPU, você perde uma vida.',
]

export const COPY: GameCopy = {
  title: 'Bits',
  component: 'Interruptores',
  tagline: 'Tudo o que um computador guarda é, no fundo, uma fileira de 0s e 1s.',
  concepts: ['Bit', 'Byte', 'Valor de casa', 'Código de caractere', 'Imagem em bits'],
  opening: [
    'Oi! Eu sou o **Kernel**. Todo computador, por dentro, só entende duas coisas: **ligado** e **desligado**.',
    'Pacotes de dados estão viajando até a CPU. Cada um carrega um número, e você escreve esse número em binário acendendo lâmpadas.',
    'Vamos decodificar uns pacotes?',
  ],
  phases: {
    tutorial: {
      title: 'Primeiros pacotes',
      teaser: 'Acenda lâmpadas até a soma bater com o número do pacote.',
      intro: [
        'Cada lâmpada é um **bit**: apagada vale 0, acesa vale o número da casa dela (8, 4, 2, 1).',
        'Acenda as lâmpadas certas para escrever o número do pacote em binário. Aqui os pacotes esperam por você.',
      ],
      bulletsTitle: 'Como jogar',
      bullets: [
        'Lâmpada acesa vale o número da casa. Some até bater no alvo.',
        'Acertou? O pacote decodifica sozinho.',
        'Teclado: as teclas 1 a 4 acendem as lâmpadas.',
      ],
      goal: 'Decodifique os {goal} pacotes. Sem relógio e sem derrota.',
      real: 'Um interruptor de luz é a mesma ideia: ou está apagado, ou está aceso — nunca os dois.',
      learn: 'Cada bit aceso soma o valor da sua casa: 8, 4, 2, 1.',
      tip: 'Acenda as lâmpadas cuja soma dá o número do pacote.',
    },
    'nivel-1': {
      title: 'Valor de cada casa',
      teaser: '4 lâmpadas contam de 0 a 15. Cada casa vale o dobro da anterior.',
      intro: [
        'Pacotes de dados estão viajando até a CPU. Cada um carrega um número. Acenda as lâmpadas certas para escrevê-lo em binário **antes que ele chegue**.',
      ],
      bulletsTitle: 'Regras',
      bullets: RULES,
      goal: 'Decodifique os {goal} pacotes com {hearts} vidas.',
      goalUntimed: 'Decodifique os {goal} pacotes. Sem relógio: eles esperam por você.',
      real: 'É assim que qualquer número cabe em binário: somando as casas acesas.',
      learn: 'Cada casa vale o dobro da anterior: 1, 2, 4, 8… Some só as casas acesas.',
      tip: 'Cada casa vale o dobro da anterior: 1, 2, 4, 8. Comece pela casa mais alta que ainda cabe no número.',
    },
    'nivel-2': {
      title: 'Oito lâmpadas, um byte',
      teaser: 'Com 8 bits já se chega a 255. Oito bits juntos formam um byte.',
      intro: [
        'Agora são **8 lâmpadas**: um {binary} **byte**. Juntas, chegam a 255.',
        'Os pacotes vêm mais rápido. Acenda as lâmpadas certas **antes que eles cheguem** à CPU.',
      ],
      bulletsTitle: 'Regras',
      bullets: RULES,
      goal: 'Decodifique os {goal} pacotes com {hearts} vidas.',
      goalUntimed: 'Decodifique os {goal} pacotes. Sem relógio: eles esperam por você.',
      real: 'O tamanho de um arquivo (KB, MB, GB) é sempre medido em bytes: grupos de 8 bits.',
      learn: 'Oito lâmpadas já chegam a 255: 128, 64, 32, 16, 8, 4, 2, 1.',
      tip: 'Lembre: 128, 64, 32, 16, 8, 4, 2, 1. Comece pela casa mais alta que ainda cabe.',
    },
    'nivel-3': {
      title: 'Sem cola',
      teaser: 'O valor de cada lâmpada some: agora é de cabeça.',
      intro: [
        'Pacotes de dados estão viajando até a CPU. Cada um carrega um número. Acenda as lâmpadas certas para escrevê-lo em binário **antes que ele chegue**.',
        'Sem cola: cada lâmpada mostra **?** até acender. Se travar, dá para **espiar** os valores duas vezes, mas custa o combo.',
      ],
      bulletsTitle: 'Regras',
      bullets: RULES,
      goal: 'Decodifique os {goal} pacotes com {hearts} vidas.',
      goalUntimed: 'Decodifique os {goal} pacotes. Sem relógio: eles esperam por você.',
      real: 'Quem programa de verdade faz essa conta de cabeça o tempo todo, sem olhar nenhuma tabela.',
      learn:
        'Some de cabeça: 128, 64, 32, 16, 8, 4, 2, 1. Comece pela casa mais alta que ainda cabe.',
      tip: 'Lembre: 128, 64, 32, 16, 8, 4, 2, 1. Comece pela casa mais alta que ainda cabe.',
    },
    'nivel-4': {
      title: 'Letras em binário',
      teaser: 'Cada letra também é um número. Decodifique uma palavra inteira.',
      intro: [
        'Letras também são números: cada caractere tem um {letter} **código** combinado entre todos os computadores. O "A", por exemplo, é 65.',
        'Cada pacote traz uma letra. Confira o código dela na tabela e acenda as lâmpadas **antes que ele chegue**.',
      ],
      bulletsTitle: 'Regras',
      bullets: RULES,
      goal: 'Decodifique a palavra de {goal} letras com {hearts} vidas.',
      goalUntimed:
        'Decodifique a palavra de {goal} letras. Sem relógio: os pacotes esperam por você.',
      real: 'É por isso que um emoji vira "???" quando o programa não conhece o código certo.',
      learn: 'Cada letra tem o próprio código em binário, igual a um número. O "A" é 65.',
      tip: 'Abra a tabela de código: ela mostra o binário de cada letra.',
    },
    'nivel-5': {
      title: 'A tela é feita de números',
      teaser: 'Uma grade de bits vira um desenho: aceso pinta, apagado deixa em branco.',
      intro: [
        '64 lâmpadas (8x8): cada uma é um **pixel**. O pacote carrega um desenho: acenda os pixels iguais **antes que ele chegue**.',
      ],
      bulletsTitle: 'Regras',
      bullets: [
        'Lâmpada acesa pinta o pixel. Copie o desenho do pacote.',
        'Acertou? O pacote decodifica sozinho. Rápido dá mais pontos e sobe o combo.',
        'Se o pacote chegar na CPU, você perde uma vida.',
      ],
      goal: 'Decodifique os {goal} desenhos com {hearts} vidas.',
      goalUntimed: 'Decodifique os {goal} desenhos. Sem relógio: os pacotes esperam por você.',
      real: 'Uma foto é só números: um por pixel.',
      learn: 'Pense nos bits como pixels: aceso pinta, apagado deixa em branco.',
      tip: 'Vá linha por linha, comparando com o desenho do pacote.',
    },
  },
  connection:
    'Interruptores guardam **0** e **1**. Mas para **decidir** com eles — tipo "se os dois estiverem ligados, faça algo" — a gente combina interruptores de um jeito especial: são as **portas lógicas**.',
  finale: {
    title: 'Você domina o binário!',
    intro: 'Tudo que um computador guarda é, no fundo, uma fileira de 0s e 1s:',
    bullets: [
      'Cada lâmpada é um bit: 0 ou 1.',
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

/** Textos de interface e falas do Kernel durante a partida. */
export const UI = {
  speakerRole: 'o guia do computador',
  // HUD
  arrival: 'Chegada',
  seconds: 's',
  packets: 'Pacotes',
  score: 'Pontos',
  combo: 'Combo x{n}',
  lives: 'Vidas',
  // placa
  boardLabel: 'Placa do jogo',
  queue: 'Próximos',
  queueEnd: '—',
  danger: 'Perigo',
  packet: 'Pacote {n}',
  unknownBinary: '????',
  cpu: 'CPU',
  unknownValue: '?',
  bitLabel: 'Lâmpada {n}, {state}',
  bitOn: 'acesa',
  bitOff: 'apagada',
  pixelLabel: 'Pixel linha {row}, coluna {col}, {state}',
  bitsGroup: 'Lâmpadas',
  wordProgress: 'Palavra: {progress}',
  alphabetTitle: 'Tabela de código',
  // medidor
  sum: 'Soma = ',
  hit: 'Na mosca!',
  over: 'Passou {n}',
  short: 'Faltam {n}',
  // ferramentas
  peek: 'Espiar valores ({n})',
  clear: 'Apagar tudo',
  keys: 'Teclado: 1 a {n} acendem as lâmpadas',
  countdown: ['3', '2', '1', 'Vai!'],
  // Kernel
  say: {
    ready: 'Prepare os dedos!',
    packets: [
      'Chegou o **{target}**! Lembre: {places}. Comece pela casa mais alta que ainda cabe.',
      'Agora o **{target}**. Olhe a barra: ela mostra quanto falta.',
      '**{target}** vindo aí. Quanto mais rápido, maior o bônus.',
      '**{target}**! Esse tem mais lâmpadas acesas. Calma e casa por casa.',
    ],
    lastPacket: 'Último pacote: **{target}**. Vale tudo!',
    letter:
      'Chegou a letra **{letter}**! O código dela é **{code}**. Acenda as casas que somam {code}.',
    image: 'Chegou um desenho! Acenda os pixels iguais aos do pacote, linha por linha.',
    over: 'Opa, **{sum}** passou de {target}. Apague uma lâmpada para voltar.',
    success: 'Decodificado! **{target}** = {parts}.',
    successLetter: 'Decodificado! **{letter}** = {code} = {parts}.',
    successImage: 'Desenho decodificado!',
    comboNext: ' Combo **x{n}** no próximo!',
    fail: 'O pacote chegou! **{target}** era {binary}, ou seja {parts}. Olha as lâmpadas acesas.',
    failLetter:
      'O pacote chegou! **{letter}** é o código {code}, ou seja {binary}. Olha as lâmpadas acesas.',
    failImage: 'O pacote chegou! Olha os pixels acesos: era esse o desenho.',
    hintOver: 'Passou do alvo. Tente apagar a menor lâmpada acesa.',
    hintBit: 'Faltam **{rest}**. Qual é a maior casa que cabe em {rest}? Dica: está piscando.',
    peek: 'Espiando por 3 segundos. Custa o combo, então use com sabedoria!',
  },
  // leitor de tela
  announceSuccess: 'Pacote decodificado! Mais {points} pontos.',
  announceFail: 'O pacote chegou à CPU. Restam {lives} vidas.',
  // resultado
  stats: { score: 'Pontos', hits: 'Acertos', combo: 'Maior combo' },
  fail: {
    title: 'Sem vidas!',
    reason: 'A CPU recebeu pacotes que ninguém decodificou. Tente de novo, você está perto.',
  },
} as const
