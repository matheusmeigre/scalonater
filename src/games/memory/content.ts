/**
 * Todo o texto do minigame Memória (RAM), em pt-BR (README, passo 4;
 * design doc `docs/design/memory.md`).
 */
import type { ConceptCard, GameCopy } from '@/engine/types'

export const COPY: GameCopy = {
  title: 'Memória',
  component: 'Memória RAM',
  tagline: 'Guarde e busque números numa estante de gavetas numeradas.',
  concepts: ['RAM', 'Endereço de memória', 'Sobrescrever', 'Memória volátil'],
  opening: [
    'Chegamos na **Memória**! Pensa numa estante enorme de gavetinhas numeradas.',
    'Cada gaveta tem um **endereço** — o número dela, que nunca muda — e um **conteúdo**, que a gente troca o quanto quiser.',
    'Sua missão: atender os pedidos antes que a ficha esfrie. Vamos guardar e buscar!',
  ],
  phases: {
    tutorial: {
      title: 'Endereço e conteúdo',
      teaser: 'Guarde um número numa gaveta e depois busque-o de volta.',
      intro: [
        'Toda gaveta tem um número fixo — o **endereço** — e um conteúdo, que muda quando você guarda algo novo ali.',
        'Toque na ficha do pedido para "pegar" o valor, depois toque na gaveta certa para guardá-lo (ou buscá-lo).',
      ],
      bulletsTitle: 'Como jogar',
      bullets: [
        'GUARDAR: toque na ficha, depois na gaveta indicada.',
        'LER: toque direto na gaveta indicada.',
        'Pelo teclado: Tab até a ficha, Enter; Tab até a gaveta, Enter.',
      ],
      goal: 'Atenda {goal} pedidos guiados. Sem relógio e sem derrota: aqui é só para aprender.',
      goalUntimed:
        'Atenda {goal} pedidos guiados. Sem relógio e sem derrota: aqui é só para aprender.',
      real: 'É assim que todo programa guarda e busca dados enquanto está aberto: sempre pelo endereço certo.',
      learn:
        'A gaveta não muda de número, mas o que tem dentro dela muda sempre que você guarda algo novo.',
      tip: 'Toque primeiro na ficha do pedido, depois na gaveta certa.',
    },
    'nivel-1': {
      title: 'Guardar e buscar',
      teaser: 'Atenda os pedidos da fila antes que a ficha esfrie.',
      intro: [
        'Agora os pedidos chegam sem guia, um de cada vez. Cada ficha pede para **guardar** um número numa gaveta ou **ler** o que tem nela.',
        'A barra da ficha é o tempo que você tem para atender. Se esfriar, a ficha expira.',
      ],
      bulletsTitle: 'Objetivo',
      bullets: [
        'GUARDAR: toque na ficha e depois na gaveta certa.',
        'LER: toque direto na gaveta indicada.',
      ],
      goal: 'Atenda {goal} pedidos antes que o tempo acabe.',
      goalUntimed: 'Atenda {goal} pedidos, sem relógio.',
      real: 'O processador faz pedidos de leitura e escrita à memória bilhões de vezes por segundo — a mesma operação básica que você está fazendo aqui.',
      learn:
        'Guardar e buscar são a mesma ideia: ir até o endereço certo. É só a direção do dado que muda.',
      tip: 'Foi rápido demais! Toca primeiro na ficha do pedido, depois na gaveta certa.',
    },
    'nivel-2': {
      title: 'Endereços em binário',
      teaser: 'O endereço da gaveta agora vem escrito em binário.',
      intro: [
        'Cada gaveta mostra o próprio número em **binário** (0 e 1) acima dela. O pedido também chega só em binário.',
        'Não precisa "traduzir" antes: você pode contar os bits olhando a gaveta certa direto na estante.',
      ],
      bulletsTitle: 'Objetivo',
      bullets: [
        'Olhe o número binário embaixo de cada gaveta para achar o endereço pedido.',
        'GUARDAR: toque na ficha e depois na gaveta certa. LER: toque direto nela.',
      ],
      goal: 'Atenda {goal} pedidos com endereços em binário.',
      goalUntimed: 'Atenda {goal} pedidos com endereços em binário, sem relógio.',
      real: 'Por dentro do computador, todo endereço de memória é um número binário — é assim que o processador localiza cada byte.',
      learn:
        'Binário é só contar em potências de 2: cada bit vale o dobro do anterior, da direita para a esquerda.',
      tip: 'Binário é só contar em potências de 2: **100** são 4, **101** são 5. Olha o número embaixo da gaveta.',
    },
    'nivel-3': {
      title: 'Sobrescrever',
      teaser: 'Guardar de novo numa gaveta ocupada apaga o que tinha nela.',
      intro: [
        'Metade dos pedidos agora reaproveita gavetas que já têm algo dentro. Guardar de novo ali **apaga** o valor antigo.',
        'Todo pedido que vai sobrescrever traz o selo **"sobrescreve"**, para você conferir antes de confirmar.',
      ],
      bulletsTitle: 'Novidade',
      bullets: [
        'Pedidos com o selo "sobrescreve" vão substituir um valor que já existe.',
        'Leia o pedido com calma: ele pode pedir para **somar**, não só trocar.',
      ],
      goal: 'Atenda {goal} pedidos, incluindo releituras de um contador que muda a cada rodada.',
      goalUntimed: 'Atenda {goal} pedidos, sem relógio.',
      real: 'Toda variável que um programa atualiza (um contador, um placar) mora numa gaveta que é sobrescrita o tempo todo.',
      learn:
        'Guardar de novo numa gaveta ocupada substitui o valor antigo para sempre — ele não fica guardado em outro lugar.',
      tip: 'Essa gaveta já tinha outro número dentro — guardar de novo apaga o que tinha. Lê o pedido com calma antes de confirmar.',
    },
    'nivel-4': {
      title: 'Memória volátil',
      teaser: 'A luz pode cair, e a estante esquece tudo.',
      intro: [
        'De vez em quando, a energia cai: a tela escurece por um instante e **todas as gavetas esvaziam**.',
        'Se um pedido de leitura depender de um valor perdido, ele chega com uma barra de tempo maior, para você regravar antes.',
      ],
      bulletsTitle: 'Novidade',
      bullets: [
        'Depois de uma queda de energia, todas as gavetas ficam vazias de novo.',
        'Regrave rápido o que for pedido de novo, antes que o tempo acabe.',
      ],
      goal: 'Sobreviva a 2 quedas de energia e atenda {goal} pedidos no total.',
      goalUntimed: 'Sobreviva a 2 quedas de energia e atenda {goal} pedidos, sem relógio.',
      real: 'É por isso que desligar o computador sem salvar perde tudo que não tinha ido para o disco: a RAM esquece tudo sem energia.',
      learn:
        'RAM é memória **volátil**: ela só guarda enquanto há energia. O armazenamento (SSD/HD) é diferente — ele guarda mesmo sem luz.',
      tip: 'A luz caiu e a estante esqueceu tudo — é assim que a RAM funciona de verdade! Quando vier o pedido de novo, guarda rapidinho antes que o tempo acabe.',
    },
  },
  connection:
    'Na memória ficam números… e também o próprio programa que diz o que fazer com eles. Próxima estação: o ciclo da CPU.',
  finale: {
    title: 'Você organizou a memória',
    intro:
      'Tudo o que você fez tocando nas fichas, o computador faz sozinho, bilhões de vezes por segundo:',
    bullets: [
      'Guarda e busca números pelo endereço certo.',
      'Sobrescreve valores antigos sem avisar — por isso programas guardam o que importa antes.',
      'Esquece tudo quando a energia falta: é memória volátil.',
    ],
    extraTitle: 'E os endereços?',
    extra:
      'Um processador de 64 bits consegue numerar gavetas de até 2⁶⁴ posições — mais do que qualquer computador de hoje tem RAM para preencher.',
  },
}

export const CARDS: readonly ConceptCard[] = [
  {
    id: 'ram',
    title: 'A estante de gavetas',
    term: 'RAM (memória de acesso aleatório)',
    summary: 'Onde o computador guarda, por pouco tempo, tudo que está usando agora.',
    analogy:
      'Uma estante de gavetas numeradas que qualquer uma pode ser aberta na hora, em qualquer ordem.',
    realWorld: 'Mais RAM deixa o computador abrir mais programas ao mesmo tempo sem travar.',
    icon: 'memory',
  },
  {
    id: 'address',
    title: 'O número da gaveta',
    term: 'Endereço de memória',
    summary:
      'O código que diz exatamente onde um dado está guardado, em binário por dentro do computador.',
    analogy: 'O número da casa, mas a rua é sempre a mesma estante.',
    realWorld: 'Um processador de 64 bits consegue numerar gavetas de até 2⁶⁴ posições.',
    icon: 'bits',
  },
]

/** Etapas guiadas do tutorial (ids casam com phases.ts). */
export const TUTORIAL_STEPS: Record<string, string> = {
  'select-write': 'Esse é o pedido: **guardar 7 na gaveta 2**. Toque na ficha para pegar o valor.',
  'place-write': 'Agora **toque na gaveta 2** para guardar o 7 ali.',
  'select-read': 'Novo pedido: **o que tem na gaveta 2?** Toque na ficha para conferir.',
  'place-read': 'Agora **toque na gaveta 2** de novo para ler o que está guardado.',
}

/** Falas do Kernel durante a partida. */
export const KERNEL = {
  start: 'Vai! Atenda os pedidos antes que a ficha esfrie.',
  hit: 'Isso! Pedido atendido.',
  overwrite: 'Essa gaveta já tinha outro número — guardar de novo apagou o que tinha ali.',
  mistakeWrong: 'Essa não é a gaveta certa. Olha o endereço do pedido de novo.',
  mistakeNotSelected: 'Toca primeiro na ficha do pedido para pegar o valor.',
  mistakeExpired: 'A ficha esfriou! Vamos com mais calma na próxima.',
  powerLoss: 'A luz caiu! A estante esqueceu tudo — é assim que a RAM funciona de verdade.',
  combo: 'Combo x{n}! Suas mãos estão rápidas.',
  paused: 'Jogo pausado.',
  resumed: 'De volta ao jogo!',
} as const

/** Textos da cena. */
export const UI = {
  speakerRole: 'o guia da memória',
  modeKicker: 'Modo',
  phaseKicker: 'Fase',
  ticket: 'Pedido',
  ticketWrite: 'GUARDAR {value} → gaveta {address}',
  ticketRead: 'LER gaveta {address}',
  ticketOverwriteBadge: 'sobrescreve',
  shelfLabel: 'Estante de memória',
  stats: {
    score: 'Pontos',
    requests: 'Pedidos',
    combo: 'Maior combo',
    mistakes: 'Erros',
  },
  fail: {
    title: 'Tempo esgotado',
    reason: 'Erros ou fichas demais expiraram antes de completar a meta.',
  },
  aria: {
    ticketArmed: 'Pedido pego. Toque na gaveta {address} para confirmar.',
    drawerEmpty: 'vazia',
  },
  announce: {
    hit: 'Pedido atendido. {done} de {goal}.',
    mistake: 'Resposta errada.',
    powerLoss: 'A energia caiu. Todas as gavetas esvaziaram.',
  },
} as const
