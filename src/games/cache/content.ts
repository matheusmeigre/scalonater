/**
 * Todo o texto da estação Cache (pt-BR), nunca nos componentes (README,
 * passo 4). Strings aceitam **negrito**, {ícone} (`raio`, `hourglass`,
 * `cache`, `memory`…) e {valor} (`goal`, `time`…).
 */
import type { ConceptCard, GameCopy } from '@/engine/types'

export const COPY: GameCopy = {
  title: 'Cache',
  component: 'Memória cache',
  tagline: 'Guarde perto o que se usa muito — decida quem sai quando a bancada enche.',
  concepts: ['Cache', 'Hierarquia de memória', 'Localidade temporal', 'Localidade espacial'],
  opening: [
    'A CPU é rapidíssima, mas ir até a RAM toda vez é como ir à despensa a cada ingrediente.',
    'O **cache** é a bancada da cozinha: um espacinho bem menor, mas do lado, com o que você usa toda hora.',
    'Quando ele enche, alguém sai da bancada. Sua missão: decidir quem.',
  ],
  phases: {
    tutorial: {
      title: 'Acerto × falha',
      teaser: 'Veja a diferença entre encontrar na bancada e ter que ir à despensa.',
      intro: [
        'A CPU pede um endereço. A primeira vez, ele não está na bancada ({cache} cache): é uma **falha**, e a gente vê a viagem lenta até a {memory} RAM.',
        'Ela pede o **mesmo** endereço de novo. Agora ele já está na bancada: é um **acerto**, quase instantâneo.',
      ],
      bulletsTitle: 'Como jogar',
      bullets: [
        'Acompanhe o pedido da CPU: ele aparece sozinho, você só observa.',
        'Repare no som e na cor: verde para acerto, a viagem lenta para falha.',
      ],
      goal: 'Viva os 2 primeiros pedidos da CPU.',
      real: 'O cache L1 de um processador atual costuma ter menos de 100 KB, mas responde em menos de 1 nanossegundo.',
      learn: 'Acerto é rápido porque o dado já está perto. Falha é lenta porque precisa ir buscar na RAM.',
      tip: 'Observe: o primeiro pedido sempre falha (a bancada está vazia); o segundo repete o mesmo endereço.',
    },
    'bancada-cheia': {
      title: 'A bancada cheia',
      teaser: 'Quando não há espaço livre, você escolhe quem sai.',
      intro: [
        'A bancada tem poucos espaços. Quando todos estão ocupados e chega uma falha nova, alguém precisa sair.',
        'Toque no espaço que deve sair para abrir lugar ao que chegou. Não há pressa: o jogo pausa até você decidir.',
      ],
      bulletsTitle: 'Novidade',
      bullets: [
        'Quando pedir, toque no espaço do cache que você quer liberar.',
        'O que importa aqui é o **tempo médio de acesso**: cada acerto é rápido, cada falha é lenta.',
      ],
      goal: 'Responda {goal} pedidos com tempo médio de acesso até {time}.',
      goalUntimed: 'Responda {goal} pedidos com tempo médio de acesso até {time}. Sem relógio.',
      real: 'Um acesso ao cache L1 custa poucos ciclos; um acesso à RAM pode custar centenas.',
      learn:
        'Quando o cache enche, alguém precisa sair para abrir espaço — e essa escolha muda o tempo médio de acesso.',
      tip: 'Toda falha custa tempo. Repare em quais endereços a CPU parece não voltar a pedir tão rápido antes de escolher quem tirar da bancada.',
    },
    'volta-a-pedir': {
      title: 'Ele volta a pedir',
      teaser: 'Alguns endereços voltam a ser pedidos pouco depois.',
      intro: [
        'Preste atenção: alguns dos últimos endereços pedidos **voltam a ser pedidos** daqui a pouco.',
        'Manter esses na bancada, em vez de tirá-los, costuma compensar.',
      ],
      bulletsTitle: 'Novidade',
      bullets: ['Observe quais endereços você acabou de usar antes de escolher quem sai.'],
      goal: 'Responda {goal} pedidos com tempo médio de acesso até {time}.',
      goalUntimed: 'Responda {goal} pedidos com tempo médio de acesso até {time}. Sem relógio.',
      real: 'Programas de verdade usam as mesmas variáveis várias vezes em pouco tempo — é a localidade temporal.',
      learn: 'Quem foi pedido há pouco tempo tende a ser pedido de novo em breve (localidade temporal).',
      tip: 'Alguns endereços voltam a ser pedidos pouco depois. Tirar um desses da bancada costuma custar caro de novo.',
    },
    'vizinhos-de-linha': {
      title: 'Os vizinhos da linha',
      teaser: 'Uma falha agora traz o endereço inteiro, com seus vizinhos.',
      intro: [
        'Quando dá uma falha, a gente já traz os **vizinhos** daquele endereço de uma vez — eles tendem a ser pedidos em seguida.',
        'Um espaço da bancada agora guarda um bloco de vizinhos, não só um endereço solto.',
      ],
      bulletsTitle: 'Novidade',
      bullets: ['Uma falha traz um bloco inteiro de endereços vizinhos, não só um.'],
      goal: 'Responda {goal} pedidos com tempo médio de acesso até {time}.',
      goalUntimed: 'Responda {goal} pedidos com tempo médio de acesso até {time}. Sem relógio.',
      real: 'É por isso que percorrer uma lista em sequência é bem mais rápido que pular endereços ao acaso.',
      learn:
        'Trazer os vizinhos de quem falhou (localidade espacial) economiza futuras viagens até a RAM.',
      tip: 'Quando dá uma falha, a gente já traz os vizinhos daquele endereço — eles tendem a ser pedidos em seguida.',
    },
    'dois-niveis': {
      title: 'Duas bancadas',
      teaser: 'Uma bancada pequena e rápida, e outra maior atrás dela.',
      intro: [
        'Agora existem duas bancadas: a {cache} **L1**, bem pequena e rapidíssima, e a **L2**, maior, mas um pouco mais devagar.',
        'A busca passa por L1, depois L2, e só por último vai até a {memory} RAM.',
      ],
      bulletsTitle: 'Novidade',
      bullets: [
        'Uma falha na L1 que acha o dado na L2 ainda é bem mais rápida que ir à RAM.',
        'Quando o L1 enche, você ainda escolhe quem sai — a L2 se organiza sozinha.',
      ],
      goal: 'Responda {goal} pedidos com tempo médio de acesso até {time}, considerando os três níveis.',
      goalUntimed:
        'Responda {goal} pedidos com tempo médio de acesso até {time}. Sem relógio.',
      real: 'O cache L2 costuma ser 4 a 8 vezes maior que o L1, e bem mais lento.',
      learn: 'Mais perto da CPU, menor e mais rápido. Mais longe, maior e mais lento: é a hierarquia de memória.',
      tip: 'Antes de ir até a RAM, a gente passa pela bancada de trás (o L2) — mais lenta que a de perto, mas bem mais rápida que a despensa.',
    },
  },
  connection:
    'A RAM esquece tudo quando a luz apaga. Para guardar de verdade, mesmo sem energia: o armazenamento. Próxima estação.',
  finale: {
    title: 'Você decidiu quem fica',
    intro: 'Tudo o que você fez com o dedo, o hardware faz sozinho, o tempo todo:',
    bullets: [
      'Guarda cópias do que foi usado recentemente num espaço pequeno e rápido, perto da CPU.',
      'Decide quem sai quando o cache enche, pensando no que tem mais chance de voltar a ser pedido.',
      'Aproveita padrões: endereços que se repetem e endereços vizinhos.',
      'Usa vários níveis de cache, cada um maior e um pouco mais lento que o anterior.',
    ],
    extraTitle: 'E se o cache não existisse?',
    extra: 'Toda busca de memória custaria o preço de ir até a RAM — o computador inteiro ficaria bem mais lento.',
  },
}

export const CARDS: readonly ConceptCard[] = [
  {
    id: 'cache',
    title: 'A bancada perto da CPU',
    term: 'Cache',
    summary:
      'Um espaço pequeno e rápido que guarda cópias do que foi usado recentemente, para não precisar ir até a RAM toda vez.',
    analogy: 'A bancada da cozinha com os ingredientes do dia, em vez da despensa no fundo da casa.',
    realWorld: 'O cache L1 de um processador atual costuma ter menos de 100 KB, mas responde em menos de 1 nanossegundo.',
    icon: 'cache',
  },
  {
    id: 'memory-hierarchy',
    title: 'Quanto mais perto, menor e mais rápido',
    term: 'Hierarquia de memória',
    summary:
      'Registrador, cache L1, cache L2, RAM, armazenamento: cada nível é maior e mais lento que o anterior.',
    analogy: 'A mão, a bancada, a despensa e o mercado — você vai mais longe só quando precisa.',
    realWorld: 'O L2 costuma ser 4 a 8 vezes maior que o L1, e bem mais lento.',
    icon: 'memory',
  },
]

/** Etapas guiadas do tutorial (ids casam com `phases.ts`). */
export const TUTORIAL_STEPS: Record<string, string> = {
  miss: 'A bancada está vazia: esse pedido precisa ir até a {memory} RAM. Veja a viagem.',
  hit: 'O mesmo endereço de novo! Agora ele já está na bancada: resposta quase instantânea.',
}

/** Falas do Kernel durante a partida. */
export const KERNEL = {
  hit: 'Acerto! Já estava na bancada.',
  l2Hit: 'Achou na segunda bancada — mais devagar, mas bem melhor que a despensa.',
  miss: 'Falha. Vamos até a RAM buscar esse endereço.',
  needEviction: 'A bancada está cheia! Toque em quem deve sair.',
  evicted: 'Espaço liberado. O novo endereço entrou.',
  won: 'Tempo médio dentro da meta. Você decidiu bem quem ficava.',
  lost: 'O tempo médio passou do limite — muitas falhas custaram caro.',
  paused: 'Jogo pausado.',
  resumed: 'De volta ao jogo!',
} as const

/** Textos da cena. */
export const UI = {
  speakerRole: 'quem decide quem fica na bancada',
  request: 'Pedido da CPU',
  requestAddress: 'Endereço {n}',
  cacheL1: 'Bancada (L1)',
  cacheL2: 'Bancada de trás (L2)',
  ramShelf: 'Despensa (RAM)',
  emptySlot: 'vazio',
  blockLabel: 'bloco {n}',
  evictPrompt: 'Toque no espaço que deve sair',
  avgLatency: 'Tempo médio',
  requests: 'Pedidos',
  stats: {
    score: 'Pontos',
    avgLatency: 'Tempo médio',
    requests: 'Pedidos',
  },
  fail: {
    latency: {
      title: 'Tempo médio alto demais',
      reason: 'Muitas falhas seguidas custaram caro ao tempo médio de acesso.',
    },
  },
  announce: {
    hit: 'Acerto no endereço {n}.',
    l2Hit: 'Acerto na segunda bancada, endereço {n}.',
    miss: 'Falha no endereço {n}. Viagem até a RAM.',
    needEviction: 'Bancada cheia. Escolha quem sai.',
    evicted: 'Espaço liberado.',
  },
} as const
