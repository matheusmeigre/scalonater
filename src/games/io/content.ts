/**
 * Todo o texto da estação Interrupções e E/S (pt-BR). Strings aceitam
 * **negrito**, {ícone} (hourglass, io-teclado, io-mouse, io-disco, io-rede,
 * heart…) e {valor} (goal, time, hearts…).
 */
import type { ConceptCard, GameCopy } from '@/engine/types'
import type { IoDeviceId } from './phases'

export const DEVICE_COPY: Record<IoDeviceId, { name: string; icon: string }> = {
  teclado: { name: 'Teclado', icon: 'io-teclado' },
  mouse: { name: 'Mouse', icon: 'io-mouse' },
  disco: { name: 'Disco', icon: 'io-disco' },
  rede: { name: 'Rede', icon: 'io-rede' },
}

export const COPY: GameCopy = {
  title: 'Interrupções',
  component: 'Portas de E/S',
  tagline: 'A campainha do hardware: atenda sem perder o fio da tarefa principal.',
  concepts: ['Interrupção', 'Entrada e saída (E/S)', 'DMA', 'Polling'],
  opening: [
    'Lembra das threads esperando dados, lá nos **Núcleos**? Chegou a hora de saber como a CPU fica sabendo que o dado chegou.',
    'Teclado, mouse, disco, rede... cada um pode **tocar a campainha**. E a CPU só para o que está fazendo quando alguém toca.',
    'Antes de atender, **guarde onde você estava**. Esquecer isso custa a tarefa inteira.',
  ],
  phases: {
    tutorial: {
      title: 'A campainha toca',
      teaser: 'Guarde o contexto, atenda o teclado e retome de onde parou.',
      intro: [
        'Uma tarefa está rodando na barra central. Quando o {io-teclado} **teclado** toca a campainha, ele quer atenção agora.',
        'Antes de atender, toque em **Guardar e atender**: isso empilha uma ficha com o progresso da tarefa.',
      ],
      bulletsTitle: 'Como jogar',
      bullets: [
        'Quando a campainha piscar, toque em **Guardar e atender**.',
        'Depois toque no dispositivo que chamou para atendê-lo.',
        'A tarefa volta sozinha de onde parou.',
      ],
      goal: 'Guarde e atenda {goal} campainhas do teclado.',
      real: 'Toda tecla que você aperta gera uma interrupção: um sinal que avisa a CPU na hora.',
      learn:
        'Guardar o contexto antes de atender é o que deixa a tarefa principal continuar de onde parou.',
      tip: 'Toque em **Guardar e atender** antes de tocar no dispositivo.',
    },
    'fila-na-porta': {
      title: 'Fila na porta',
      teaser: 'Vários dispositivos chamam ao mesmo tempo. Não deixe a fila crescer demais.',
      intro: [
        'Agora **{io-teclado} teclado**, **{io-mouse} mouse**, **{io-disco} disco** e **{io-rede} rede** podem tocar a campainha ao mesmo tempo.',
        'Elas entram numa fila. Guarde o contexto e atenda uma de cada vez, na ordem que preferir.',
      ],
      bulletsTitle: 'Novidade',
      bullets: [
        'Toque em **Guardar e atender** e depois em cada campainha da fila.',
        'Se a fila passar de {queueMax} campainhas sem atendimento, você perde uma {heart} vida.',
      ],
      goal: 'Mantenha a tarefa com pelo menos {goal}% de progresso ao fim de {time} segundos.',
      goalUntimed:
        'Mantenha a tarefa com pelo menos {goal}% de progresso. Sem relógio, no seu ritmo.',
      real: 'Um disco (SSD) ainda é bem mais lento que a CPU; por isso ela faz outra coisa enquanto espera.',
      learn:
        'Com várias campainhas ao mesmo tempo, a fila existe para ninguém ser esquecido — mas ela não pode crescer sem controle.',
      tip: 'A fila cresceu demais! Atenda as campainhas mais rápido — toque em qualquer uma da lista, não precisa ser a primeira.',
    },
    'quem-nao-espera': {
      title: 'Quem não espera',
      teaser: 'Teclado e mouse são urgentes. Disco e rede toleram esperar um pouco mais.',
      intro: [
        'Nem toda campainha tem a mesma pressa. **{io-teclado} Teclado** e **{io-mouse} mouse** são urgentes: a barrinha deles esvazia rápido.',
        '**{io-disco} Disco** e **{io-rede} rede** toleram esperar mais um pouco.',
      ],
      bulletsTitle: 'Novidade',
      bullets: [
        'Atenda toda campainha urgente antes da barrinha dela zerar.',
        'Se ela zerar sem atendimento, você perde uma {heart} vida.',
      ],
      goal: 'Mantenha a tarefa com pelo menos {goal}% de progresso ao fim de {time} segundos, com {hearts} vidas.',
      goalUntimed:
        'Mantenha a tarefa com pelo menos {goal}% de progresso, com {hearts} vidas. Sem relógio.',
      real: 'O sistema operacional também prioriza: um clique não pode esperar uma gravação longa no disco.',
      learn: 'Dispositivos têm prioridades diferentes. Os mais urgentes não podem esperar a vez.',
      tip: 'O teclado não espera muito. Quando ele toca, atenda **antes** do disco.',
    },
    'perguntar-ou-campainha': {
      title: 'Perguntar toda hora × campainha',
      teaser: 'Compare: verificar sem parar gasta energia. Esperar o aviso não gasta nada.',
      intro: [
        'Dois jeitos de saber se o disco terminou: **perguntar toda hora** (polling) ou **esperar o aviso** (interrupção).',
        'Toque em **Verificar** no lado de polling sempre que quiser conferir. Cada toque conta, pronto ou não.',
      ],
      bulletsTitle: 'Novidade',
      bullets: [
        'O lado por interrupção avança sozinho, sem você fazer nada.',
        'Tente terminar o lado de polling gastando o mínimo de toques perdidos.',
      ],
      goal: 'Termine gastando menos que {goal} toques de verificação perdidos.',
      real: 'Perguntar toda hora gasta energia à toa: é por isso que os dispositivos modernos preferem avisar.',
      learn:
        'Perguntar sem parar (polling) gasta CPU mesmo quando não há nada pronto. Esperar o aviso (interrupção) não gasta nada enquanto espera.',
      tip: 'Perguntar toda hora gasta energia à toa. Deixe o aviso vir até você.',
    },
    dma: {
      title: 'Copiar sem ajuda',
      teaser: 'O disco copia um arquivo grande sozinho. Toque só para começar e para recolher.',
      intro: [
        'Um arquivo grande precisa ser copiado. Toque em **Iniciar** e o {io-disco} disco copia direto na memória, sozinho.',
        'A CPU só é avisada no começo e no fim — não a cada pedacinho.',
      ],
      bulletsTitle: 'Novidade',
      bullets: [
        'Toque em **Iniciar** e espere a barra de transferência terminar.',
        'Toque em **Recolher** quando ela chegar a 100%.',
        'Não precisa atender pedaço por pedaço: isso só custa tempo.',
      ],
      goal: 'Complete a transferência em {time} segundos, tocando só para começar e recolher.',
      real: 'É por isso que copiar um arquivo grande não deixa o computador 100% travado.',
      learn:
        'Alguns dispositivos copiam dados direto na memória (DMA), sem precisar da CPU o tempo todo.',
      tip: 'Você não precisa recolher pedaço por pedaço — espere o disco avisar que **terminou tudo**.',
    },
  },
  connection:
    'Um dos dispositivos que mais toca a campainha é a placa de rede. Ela também divide as coisas em pedacinhos — só que em pacotes. Próxima: a rede.',
  finale: {
    title: 'Você atendeu a campainha',
    intro: 'Tudo o que você fez com o dedo, o hardware faz sozinho, o tempo todo:',
    bullets: [
      'Guarda o contexto antes de atender uma interrupção, para não perder o trabalho em andamento.',
      'Prioriza dispositivos urgentes, como teclado e mouse.',
      'Evita perguntar toda hora: prefere esperar o aviso.',
      'Usa DMA para copiar dados grandes sem travar a CPU.',
    ],
    extraTitle: 'E a placa de rede?',
    extra: 'Ela também toca a campainha sempre que um pacote chega — e divide tudo em pedacinhos.',
  },
}

export const CARDS: readonly ConceptCard[] = [
  {
    id: 'io',
    title: 'Entrada e saída',
    term: 'E/S (Entrada e Saída, I/O)',
    summary:
      'Tudo que entra (teclado, mouse, rede, disco) ou sai (tela, som, rede, disco) do computador passa por aqui.',
    analogy: 'As portas e janelas da casa — é por onde tudo entra e sai.',
    realWorld:
      'Um disco (SSD) ainda é bem mais lento que a CPU; por isso ela faz outra coisa enquanto espera.',
    icon: 'io',
  },
  {
    id: 'interrupt',
    title: 'A campainha do computador',
    term: 'Interrupção',
    summary: 'Um sinal que avisa a CPU na hora, sem ela precisar perguntar.',
    analogy: 'A campainha do apartamento em vez de ficar olhando pela janela a cada minuto.',
    realWorld: 'Toda tecla que você aperta gera uma interrupção.',
    icon: 'hourglass',
  },
  {
    id: 'dma',
    title: 'Copiar sem ajuda',
    term: 'DMA (acesso direto à memória)',
    summary:
      'Alguns dispositivos copiam dados direto na memória, sem passar pela CPU o tempo todo.',
    analogy:
      'Um garçom que, mesmo levando uma bandeja cheia, não precisa que o gerente acompanhe prato por prato — só avisa quando a mesa está servida.',
    realWorld: 'É por isso que copiar um arquivo grande não deixa o computador 100% travado.',
    icon: 'io-disco',
  },
]

/** Etapas guiadas do tutorial (ids casam com phases.ts). */
export const TUTORIAL_STEPS: Record<string, string> = {
  ring: 'O {io-teclado} **teclado** está chamando! Olhe para o dispositivo piscando.',
  guard: 'Agora toque em **Guardar e atender** para empilhar o progresso da tarefa.',
  attend: 'Boa! Agora toque no **{io-teclado} teclado** para atendê-lo.',
  resume: 'Isso! A ficha voltou sozinha e a tarefa retomou de onde parou.',
  goal: 'Agora é com você: guarde e atenda até completar **{goal} campainhas**.',
}

/** Falas do Kernel durante a partida. */
export const KERNEL = {
  start: 'A tarefa está rodando. Fique de olho nas campainhas.',
  ring: '{device} está chamando!',
  guarded: 'Contexto guardado. Agora atenda quem está chamando.',
  attended: 'Atendido! A tarefa retoma de onde parou.',
  contextLost: 'Você atendeu sem guardar o contexto: a tarefa recomeçou do zero.',
  queueOverflow: 'A fila de campainhas ficou grande demais!',
  missedDeadline: '{device} desistiu de esperar.',
  paused: 'Jogo pausado.',
  resumed: 'De volta ao jogo!',
  dmaStarted: 'Transferência iniciada. O disco cuida do resto.',
  dmaDone: 'Transferência completa! Toque em Recolher.',
  dmaManual: 'Isso custou tempo — o disco já estava cuidando disso sozinho.',
} as const

/** Textos da cena. */
export const UI = {
  speakerRole: 'quem atende a campainha',
  task: 'Tarefa principal',
  taskHint: 'A barra anda sozinha enquanto não há contexto guardado.',
  stack: 'Pilha de contexto',
  stackEmpty: 'Nada guardado agora.',
  stackHint: 'Guarde o contexto antes de atender uma campainha.',
  guardButton: 'Guardar e atender',
  devices: 'Dispositivos',
  queue: 'Fila de campainhas',
  queueEmpty: 'Nenhuma campainha tocando.',
  ringing: 'Tocando',
  patience: 'Paciência',
  start: 'Iniciar',
  collect: 'Recolher',
  attendChunk: 'Atender pedaço',
  check: 'Verificar',
  pollingTrack: 'Perguntando toda hora',
  interruptTrack: 'Esperando o aviso',
  energyWasted: 'Energia desperdiçada',
  dmaTrack: 'Transferência DMA',
  stats: {
    score: 'Pontos',
    progress: 'Progresso',
    hearts: 'Vidas',
    energy: 'Energia perdida',
  },
  fail: {
    queue: { title: 'Fila cheia', reason: 'Campainhas demais ficaram sem atendimento.' },
    deadline: {
      title: 'Campainha perdida',
      reason: 'Um dispositivo urgente desistiu de esperar.',
    },
    time: { title: 'Tempo esgotado', reason: 'O progresso não chegou à meta a tempo.' },
  },
  announce: {
    ring: '{device} está chamando.',
    guarded: 'Contexto guardado.',
    attended: '{device} atendido.',
    contextLost: 'Contexto perdido! A tarefa recomeçou.',
    resumed: 'Tarefa retomada.',
    missedDeadline: '{device} desistiu de esperar.',
  },
} as const
