import type { ConceptCard, GameCopy } from '@/engine/types'
import type { NetworkTutorialTrigger } from './phases'

/** Todo texto do jogo, nunca nos componentes (README, passo 4). */
export const COPY: GameCopy = {
  title: 'Rede',
  component: 'Placa de rede',
  tagline: 'Pacotes, rotas e o endereço por trás de um nome.',
  concepts: ['Pacote', 'Roteador', 'DNS'],
  opening: [
    'Lembra das campainhas dos dispositivos? Uma das que mais toca é a **placa de rede**.',
    'Mandar uma mensagem grande de uma vez seria arriscado demais. Por isso ela é cortada em **pacotes** — cada um com seu número e seu endereço.',
    'Cada pacote pode seguir um caminho diferente. No final, a gente remonta tudo na ordem certa.',
  ],
  phases: {
    tutorial: {
      title: 'Tutorial',
      teaser: 'Envie um pacote até o destino.',
      intro: [
        'Toque no pacote **#1** para selecioná-lo, depois toque no roteador **B** para enviá-lo.',
      ],
      bulletsTitle: 'Como jogar',
      bullets: [
        'Toque no pacote para selecioná-lo (borda dourada).',
        'Toque no roteador vizinho por onde ele deve seguir.',
      ],
      goal: 'Entregue o pacote {goal}',
      real: 'Toda mensagem na internet é cortada assim antes de viajar.',
      learn: 'Um pacote numerado segue por um roteador até o destino.',
      tip: 'Toque no pacote primeiro, depois no roteador — nessa ordem.',
    },
    'nivel-1': {
      title: 'Fase 1',
      teaser: 'Pacotes fora de ordem.',
      intro: [
        'Uma mensagem agora vira **4 pacotes**. Eles podem chegar fora de ordem — as caixinhas numeradas remontam tudo certo, não importa a ordem de chegada.',
      ],
      bulletsTitle: 'Objetivo',
      bullets: [
        'Entregue as mensagens completas antes do tempo acabar.',
        'Olhe o número de cada pacote antes de enviá-lo.',
      ],
      goal: 'Entregue {goal} mensagens em {time} s',
      goalUntimed: 'Entregue {goal} mensagens, sem relógio',
      real: 'Um vídeo pode continuar chegando mesmo se um pedacinho da conexão falhar por um instante.',
      learn:
        'Pacotes de uma mesma mensagem podem chegar fora de ordem e são remontados pelo número.',
      tip: 'Olha o número de cada pacote antes de ler a mensagem — eles não combinaram de chegar em ordem.',
    },
    'nivel-2': {
      title: 'Fase 2',
      teaser: 'Rotas congestionadas.',
      intro: [
        'Esse enlace enche rápido e **descarta** pacotes (custa uma vida). Tente outra rota até o mesmo destino.',
      ],
      bulletsTitle: 'Objetivo',
      bullets: [
        'Entregue as mensagens sem perder todas as vidas.',
        'Enlaces cheios descartam o pacote que você tentar enviar por eles.',
      ],
      goal: 'Entregue {goal} mensagens sem perder as vidas',
      goalUntimed: 'Entregue {goal} mensagens, sem relógio',
      real: 'Um link de internet congestionado também descarta pacotes quando a fila enche.',
      learn: 'Escolher a rota certa evita enlaces congestionados.',
      tip: 'Esse enlace está cheio. Tente outro caminho até o mesmo destino.',
    },
    'nivel-3': {
      title: 'Fase 3',
      teaser: 'Perda e confirmação.',
      intro: [
        'Pacotes podem se perder no caminho. Sem confirmação, eles **reaparecem** na bandeja de saída para você reenviar.',
      ],
      bulletsTitle: 'Objetivo',
      bullets: [
        'Entregue as mensagens antes do tempo acabar.',
        'Reenvie qualquer pacote que reaparecer na bandeja de saída.',
      ],
      goal: 'Entregue {goal} mensagens em {time} s',
      goalUntimed: 'Entregue {goal} mensagens, sem relógio',
      real: 'É por isso que baixar um arquivo continua funcionando mesmo com perda de pacotes no meio do caminho.',
      learn: 'Sem confirmação (ACK), a rede reenvia o pacote perdido.',
      tip: "Sem confirmação, o pacote some. Se não chegou o 'recebido', manda de novo.",
    },
    'nivel-4': {
      title: 'Fase 4',
      teaser: 'Nome vira endereço (DNS).',
      intro: [
        'Antes de enviar, resolva o nome **escola.com** na tabela de DNS para achar o endereço certo.',
      ],
      bulletsTitle: 'Objetivo',
      bullets: [
        'Toque no endereço certo para resolver o nome antes de enviar.',
        'Entregue as mensagens antes do tempo acabar.',
      ],
      goal: 'Resolva o nome e entregue {goal} mensagens em {time} s',
      goalUntimed: 'Resolva o nome e entregue {goal} mensagens, sem relógio',
      real: 'É por isso que digitar um nome como "site.com" funciona para acessar um site.',
      learn: 'O DNS traduz um nome fácil de lembrar num endereço que os roteadores entendem.',
      tip: 'Esse nome ainda não é um endereço. Resolva pelo DNS antes de enviar.',
    },
  },
  connection:
    'Você viu cada peça: bits, portas, memória, ciclo, cache, disco, núcleos, interrupções e agora a rede. Daqui a pouco, vamos seguir um clique inteiro, do mouse até a tela.',
  finale: {
    title: 'Estação concluída!',
    intro:
      'Você dividiu mensagens em pacotes, escolheu rotas, lidou com perdas e resolveu nomes pelo DNS.',
    bullets: [
      'Mensagens viajam em pacotes numerados, que podem seguir caminhos diferentes.',
      'Roteadores decidem o caminho de cada pacote.',
      'Sem confirmação, a rede reenvia o que se perdeu.',
      'O DNS transforma um nome em endereço.',
    ],
    extraTitle: 'Curiosidade',
    extra:
      'Entre o seu celular e um site qualquer, um pacote costuma passar por mais de dez roteadores diferentes.',
  },
}

export const CARDS: readonly ConceptCard[] = [
  {
    id: 'router',
    title: 'O cruzamento do caminho',
    term: 'Roteador',
    summary: 'Um ponto da rede que decide por qual caminho cada pacote segue até o destino.',
    analogy: 'Um cruzamento com placas, decidindo a rota de cada entregador.',
    realWorld: 'Entre o seu celular e um site, o pacote passa por vários roteadores.',
    icon: 'map',
  },
  {
    id: 'packet',
    title: 'Carta picotada',
    term: 'Pacote',
    summary: 'Um pedaço numerado de uma mensagem maior, com o endereço de para onde ele vai.',
    analogy: 'Uma carta grande cortada em várias folhas numeradas, cada uma no seu envelope.',
    realWorld:
      'É por isso que um vídeo pode continuar chegando mesmo se um pedacinho da conexão falhar por um instante.',
    icon: 'download',
  },
  {
    id: 'dns',
    title: 'Lista telefônica da internet',
    term: 'DNS',
    summary:
      'O serviço que transforma um nome fácil de lembrar ("site.com") num endereço numérico que os roteadores entendem.',
    analogy: 'Uma lista telefônica: você sabe o nome da pessoa, a lista te dá o número.',
    realWorld: 'É por isso que digitar um nome funciona para acessar um site.',
    icon: 'book',
  },
]

/** Fala do Kernel para eventos da partida (fora da abertura e das dicas de fase). */
export const KERNEL = {
  start: 'Toque num pacote da bandeja de saída para começar.',
  dropped: 'Esse enlace estava cheio e descartou o pacote. Tente outra rota.',
  lost: 'Esse pacote se perdeu no caminho...',
  resent: 'Sem confirmação, a rede reenviou o pacote para a bandeja de saída.',
  wrongAddress: 'Esse pacote foi para um endereço errado e nunca vai chegar.',
  assembled: 'Mensagem completa, na ordem certa!',
  dnsCorrect: 'Endereço certo! Agora pode enviar.',
  dnsWrong: 'Esse não é o endereço de {name}. Tente outro.',
  needsDns: 'Resolva o nome pelo DNS antes de enviar qualquer pacote.',
}

/** Texto de cada etapa do tutorial guiado, por gatilho (ver `phases.ts`). */
export const TUTORIAL_STEPS: Record<NetworkTutorialTrigger, string> = {
  select: 'Toque no pacote **#1** para selecioná-lo.',
  send: 'Agora toque no roteador **B** para enviar o pacote.',
  arrived: 'O pacote chegou a um roteador no meio do caminho.',
  delivered: 'Chegou! A mensagem foi remontada.',
}

/** Textos de interface que não são "fala do Kernel" nem texto de fase. */
export const UI = {
  speakerRole: 'o guia da rede',
  tray: 'Bandeja de saída',
  arrivals: 'Mensagem remontada',
  graph: 'Roteadores',
  packetLabel: 'Pacote {n}',
  packetAt: 'Pacote {n}, em {node}',
  nodeLabel: 'Roteador {id}',
  dnsPrompt: 'Resolver {name}:',
  dnsOption: 'Endereço {address}',
  stats: { score: 'Pontos', delivered: 'Entregues', hearts: 'Vidas' },
  fail: {
    timeout: { title: 'Tempo esgotado', reason: 'A mensagem não ficou completa a tempo.' },
    hearts: { title: 'Sem vidas', reason: 'Os enlaces cheios descartaram pacotes demais.' },
  },
  announce: {
    dropped: 'Enlace cheio: pacote descartado.',
    lost: 'Pacote perdido no caminho.',
    resent: 'Pacote reenviado para a bandeja de saída.',
    wrongAddress: 'Pacote enviado para o endereço errado.',
    assembled: 'Mensagem completa.',
  },
}
