/**
 * Todo o texto do minigame Núcleos (pt-BR). Strings aceitam **negrito**,
 * {ícone} (hourglass, flame, heart, app-render…) e {valor} (goal, time, n…).
 */
import type { ConceptCard, GameCopy } from '@/engine/types'
import type { AppId } from './logic/model'

export const COPY: GameCopy = {
  title: 'Núcleos',
  component: 'Núcleos da CPU',
  tagline: 'Você é o escalonador: distribua as threads entre os núcleos do processador.',
  concepts: ['Threads', 'Escalonador', 'Espera por dados (E/S)', 'Fatia de tempo', 'SMT e cache'],
  opening: [
    'Oi! Eu sou o **Kernel**, o coração do sistema operacional. Cada programa aberto cria pequenas tarefas chamadas **threads**.',
    'O processador tem **núcleos**, e cada núcleo só trabalha numa thread por vez. Alguém precisa decidir quem vai para onde.',
    'Esse alguém é o **escalonador**. E hoje o escalonador é você!',
  ],
  phases: {
    tutorial: {
      title: 'Distribua as tarefas',
      teaser: 'Coloque as threads da fila nos núcleos do processador.',
      intro: [
        'Você agora é o **escalonador**, a parte do sistema operacional que decide qual núcleo vai trabalhar em cada tarefa.',
        'Os programas abertos criam pequenas tarefas chamadas **threads**. Elas chegam na fila e esperam um núcleo livre.',
      ],
      bulletsTitle: 'Como jogar',
      bullets: [
        'Toque numa thread da fila e depois num núcleo livre.',
        'Ou segure a thread e arraste até o núcleo.',
        'Pelo teclado: use Tab até a thread, aperte Enter, depois Enter no núcleo.',
      ],
      goal: 'Meta: {goal} tarefas. Sem relógio e sem derrota: aqui é só para aprender.',
      goalUntimed: 'Meta: {goal} tarefas. Sem relógio e sem derrota: aqui é só para aprender.',
      real: 'No seu computador, isso acontece sozinho milhares de vezes por segundo. Um núcleo parado enquanto tem thread na fila é desperdício.',
      learn:
        'Threads esperam na fila, e o escalonador coloca cada uma num núcleo livre. Quanto menos núcleo parado, mais trabalho sai.',
      tip: 'Não deixe núcleos vazios enquanto houver threads na fila.',
    },
    'io-wait': {
      title: 'Esperando dados',
      teaser:
        'Algumas threads travam esperando o disco ou a internet. Tire-as do núcleo para não desperdiçar CPU.',
      intro: [
        'Às vezes uma thread precisa de algo que não está pronto: um arquivo do disco, uma resposta da internet. Ela fica parada, **listrada e com {hourglass}**, esperando.',
        'Se ela continuar no núcleo, o núcleo fica ocupado sem fazer nada.',
      ],
      bulletsTitle: 'Novidade',
      bullets: [
        'Toque numa thread com {hourglass}, ou arraste-a até **Esperando dados**, para tirá-la do núcleo.',
        'Ela volta sozinha para a fila quando o dado chegar.',
        'Use o núcleo liberado para outra thread.',
      ],
      goal: 'Meta: {goal} tarefas em {time} segundos.',
      real: 'O sistema operacional tira do núcleo toda thread que para para esperar dados. Assim o núcleo nunca fica "segurando" quem não está trabalhando.',
      learn:
        'Thread esperando dado sai do núcleo. É por isso que o computador consegue baixar algo e continuar respondendo ao mesmo tempo.',
      tip: 'Tire logo do núcleo as threads com {hourglass}: travadas, elas não fazem nada.',
    },
    'time-slice': {
      title: 'Todo mundo tem sua vez',
      teaser:
        'Chegam vídeos para exportar, que demoram muito. Reveze os núcleos para nenhum programa travar.',
      intro: [
        'Chegaram threads de **{app-render} Vídeo**, que demoram muito. Se elas ocuparem todos os núcleos, as outras esperam demais e o programa delas **trava**.',
        'A barrinha em cada thread da fila é a **paciência**. Se ela zerar, você perde uma {heart} vida.',
      ],
      bulletsTitle: 'Novidade',
      bullets: [
        'Toque numa thread que está rodando, ou arraste-a de volta para a fila: ela vai para o fim da fila e **guarda o progresso**.',
        'Reveze: as tarefas longas dão a vez às curtas.',
      ],
      goal: 'Meta: {goal} tarefas em {time} segundos, com {hearts} vidas.',
      goalUntimed:
        'Meta: {goal} tarefas, com {hearts} vidas. Sem relógio, mas a paciência das threads continua valendo.',
      real: 'Isso se chama **fatia de tempo**. Cada thread roda um pouquinho e dá a vez. É por isso que o mouse continua mexendo mesmo com um vídeo sendo exportado.',
      learn:
        'O escalonador reveza as threads em fatias de tempo, para que nenhuma tarefa longa trave as outras.',
      tip: 'Quando uma barrinha ficar vermelha, tire um {app-render} vídeo do núcleo para abrir espaço.',
    },
    'smt-cache': {
      title: 'Dois por núcleo e cache quente',
      teaser:
        'Cada núcleo ganha 2 espaços e um cache quente. Escolha bem onde cada thread vai rodar.',
      intro: [
        'Agora cada núcleo tem **2 espaços** (isso é o SMT). Mas duas threads dividindo o mesmo núcleo rodam mais devagar: cada uma a cerca de 60% da velocidade.',
        'Cada núcleo também tem um **cache**, uma memória rápida. Se a thread volta para o mesmo núcleo de antes, os dados dela ainda estão lá, e ela roda **30% mais rápido** {flame}.',
      ],
      bulletsTitle: 'Dicas',
      bullets: [
        'Prefira núcleos totalmente vazios antes de dividir um.',
        'Threads com {flame} na fila têm um núcleo preferido, marcado com {flame} também.',
      ],
      goal: 'Meta: {goal} tarefas em {time} segundos, com {hearts} vidas.',
      goalUntimed:
        'Meta: {goal} tarefas, com {hearts} vidas. Sem relógio, mas a paciência das threads continua valendo.',
      real: 'O escalonador de verdade faz essas escolhas: prefere núcleos vazios e tenta devolver cada thread ao núcleo onde ela já estava, por causa do cache.',
      learn:
        'Dois espaços por núcleo aproveitam melhor o processador, mas dividir custa velocidade. Voltar ao mesmo núcleo aproveita o cache.',
      tip: 'Prefira núcleos vazios, use os {flame} e não esqueça de revezar os {app-render} vídeos.',
    },
  },
  connection:
    'Você viu threads esperando o disco e a rede. Mas como a CPU fica sabendo que o dado chegou? Na estação **Interrupções**, o teclado, o mouse e a rede vão tocar a campainha.',
  finale: {
    title: 'Você foi o escalonador',
    intro: 'Tudo o que você fez com o dedo, o sistema operacional faz sozinho:',
    bullets: [
      'Coloca threads da fila em núcleos livres.',
      'Tira do núcleo quem para para esperar dados.',
      'Reveza as tarefas longas em fatias de tempo, para nada travar.',
      'Prefere núcleos vazios e tenta devolver cada thread ao núcleo de antes, por causa do cache.',
    ],
    extraTitle: 'E os processadores?',
    extra:
      'Com mais núcleos, cabem mais threads ao mesmo tempo. Com mais cache, voltar ao núcleo certo rende ainda mais, o que ajuda muito em jogos.',
  },
}

export const CARDS: readonly ConceptCard[] = [
  {
    id: 'scheduler',
    title: 'Escalonador',
    term: 'Escalonador de processos (scheduler)',
    summary:
      'A parte do sistema operacional que decide qual thread roda em qual núcleo, e por quanto tempo. Threads são as pequenas tarefas de cada programa aberto.',
    analogy:
      'É o gerente de uma cozinha movimentada: olha os pedidos na fila e manda cada um para um fogão livre.',
    realWorld:
      'Seu computador faz isso milhares de vezes por segundo, com centenas de threads, sem você perceber.',
    icon: 'cores',
  },
  {
    id: 'io-wait',
    title: 'Espera por dados',
    term: 'Bloqueio por E/S (entrada e saída)',
    summary:
      'Quando uma thread precisa de algo lento, como um arquivo do disco ou uma resposta da internet, ela sai do núcleo e espera em outro lugar. Enquanto isso, o núcleo atende outra thread.',
    analogy:
      'O garçom não fica parado na cozinha esperando o prato ficar pronto: ele atende outras mesas e volta depois.',
    realWorld: 'É por isso que dá para baixar um arquivo e continuar jogando ao mesmo tempo.',
    icon: 'hourglass',
  },
  {
    id: 'time-slice',
    title: 'Fatia de tempo',
    term: 'Preempção (time slicing)',
    summary:
      'O escalonador deixa cada thread rodar só um pedacinho de tempo e depois dá a vez para outra. Assim ninguém fica esperando para sempre.',
    analogy: 'Como revezar o videogame com os amigos: cada um joga uma partida e passa o controle.',
    realWorld:
      'Mesmo com um vídeo sendo exportado, o mouse continua mexendo. É a fatia de tempo trabalhando.',
    icon: 'clock',
  },
  {
    id: 'smt-cache',
    title: 'Dois por núcleo e cache quente',
    term: 'SMT (Hyper-Threading) e afinidade de cache',
    summary:
      'Com SMT, cada núcleo atende duas threads, mas cada uma fica mais lenta. E cada núcleo tem um cache: voltar ao mesmo núcleo de antes reaproveita os dados que já estavam lá.',
    analogy:
      'É como voltar à mesma mesa da biblioteca: seus livros ainda estão em cima dela, e você não precisa buscá-los de novo.',
    realWorld:
      'Processadores com SMT (AMD) ou Hyper-Threading (Intel) aparecem com o dobro de "processadores" no Gerenciador de Tarefas.',
    icon: 'flame',
  },
]

export const APPS_COPY: Record<AppId, { name: string; tasks: readonly string[] }> = {
  game: { name: 'Jogo', tasks: ['principal', 'física', 'áudio'] },
  browser: { name: 'Navegador', tasks: ['aba', 'site', 'download'] },
  music: { name: 'Música', tasks: ['player'] },
  render: { name: 'Vídeo', tasks: ['exportar'] },
}

/** Etapas guiadas do tutorial (ids casam com phases.ts). */
export const TUTORIAL_STEPS: Record<string, string> = {
  meet: 'Estas são as **threads**, tarefinhas dos programas abertos. **Toque numa thread** da fila para escolhê-la.',
  place: 'Boa! Agora **toque num núcleo livre** do processador. A thread vai rodar lá.',
  drag: 'Também dá para **arrastar**: segure outra thread e solte num núcleo livre. Tocar também vale.',
  fill: 'Cada núcleo trabalha numa thread por vez. **Ocupe todos os núcleos!**',
  finish:
    'Isso! Veja as barras enchendo. Quando chegam a 100%, a tarefa **termina** e o núcleo fica livre.',
  goal: 'Agora é com você: mantenha os núcleos ocupados até completar **{goal} tarefas**. Aqui não dá para perder.',
}

/** Falas do Kernel durante a partida. */
export const KERNEL = {
  start: 'Vai! Coloque as threads nos núcleos.',
  startAuto: 'O sistema operacional está no controle. Veja as escolhas que ele faz.',
  hot: '{flame} **Cache quente!** Ela voltou ao núcleo de antes e vai rodar 30% mais rápido.',
  wasteful:
    'Ela vai dividir o núcleo, mas tinha um núcleo **totalmente vazio**, que seria mais rápido.',
  toIo: 'Boa! A thread foi esperar os dados **fora** do núcleo, e o núcleo ficou livre.',
  backTimeSlice: 'Thread de volta ao fim da fila, com o progresso guardado. **Revezamento!**',
  back: 'Thread devolvida à fila. Ela guarda o progresso.',
  blocked:
    '{hourglass} Uma thread está esperando dados e **travando o núcleo**. Toque nela ou arraste-a para a espera.',
  appFroze:
    '{heart} **{app} parou de responder!** Uma thread esperou demais na fila. Tente revezar.',
  lowPatience: 'Uma thread está ficando **impaciente**. Que tal dar a vez a ela?',
  idle: 'Tem núcleo parado e thread esperando! Um núcleo **ocioso** é trabalho perdido.',
  emptyQueue: 'A fila está vazia. Novas threads chegam a qualquer momento.',
  combo: 'Combo x{n}! Os núcleos estão voando.',
  paused: 'Jogo pausado.',
  resumed: 'De volta ao jogo!',
} as const

/** Textos da cena. */
export const UI = {
  speakerRole: 'o escalonador do sistema',
  queue: 'Fila de prontos',
  queueHint: 'Arraste uma thread até um núcleo livre, ou toque nela e depois no núcleo.',
  queueHintAuto: 'O sistema escolhe sozinho qual thread vai para qual núcleo.',
  queueCount: 'Threads na fila',
  queueEmpty: 'Fila vazia. Novas threads chegam a qualquer momento.',
  io: 'Esperando dados',
  ioHint: 'Aqui elas esperam o disco ou a rede sem ocupar núcleo, e voltam sozinhas para a fila.',
  ioEmpty: 'Ninguém esperando dados.',
  dropToQueue: 'Solte aqui para voltar à fila',
  dropToIo: 'Solte aqui para esperar fora do núcleo',
  processor: 'Processador',
  processorSmt: 'Processador com SMT',
  cpuInfo: '{cores} núcleos · 1 thread por núcleo',
  cpuInfoSmt: '{cores} núcleos · 2 espaços em cada',
  inUse: 'em uso',
  core: 'Núcleo {n}',
  coreShort: 'N{n}',
  coreStatus: {
    free: 'Livre',
    run: 'Rodando',
    shared: 'Dividido · 60%',
    sharedShort: 'Dividido',
    stalled: 'Parado esperando',
    stalledShort: 'Parado',
  },
  hotCore: 'Cache quente: tem thread na fila que prefere este núcleo',
  slotFree: 'Livre',
  slotArmed: 'Toque aqui',
  slotDrop: 'Solte aqui',
  slotHintIdle: 'toque para mandar a próxima',
  slotHintArmed: 'para colocar a thread escolhida',
  slotHintDrag: 'para colocar a thread',
  slotHintAuto: 'o sistema escolhe',
  running: 'executando…',
  waiting: 'esperando dados…',
  hotBonus: '+30%',
  preferredCore: 'Núcleo preferido: {n}',
  more: '+{n}',
  aria: {
    thread: '{app}, {task}. {state}',
    threadPatience: 'Paciência {p}%.',
    threadBlocked: 'Esperando dados.',
    threadPreferred: 'Prefere o núcleo {n}.',
    threadSelected: 'Escolhida.',
    threadAction: 'Toque para escolher.',
    slotFree: 'Núcleo {n}, espaço livre. {action}',
    slotFreeAction: 'Toque para colocar a thread escolhida.',
    slotFreeActionFirst: 'Toque para mandar a primeira da fila.',
    slotFilled: 'Núcleo {n}: {app}, {task}, {pct}% feito. {extra} Toque para tirar do núcleo.',
    slotBlocked: 'Travada esperando dados.',
    queueZone: 'Fila de prontos. Solte aqui para devolver a thread à fila.',
    ioZone: 'Esperando dados. Solte aqui uma thread travada.',
  },
  stats: {
    score: 'Pontos',
    tasks: 'Tarefas',
    combo: 'Maior combo',
    cpu: 'CPU ocupada',
  },
  fail: {
    time: { title: 'Tempo esgotado', reason: 'O tempo acabou antes de terminar as tarefas.' },
    hearts: {
      title: 'Programas travaram',
      reason: 'Programas demais pararam de responder porque suas threads esperaram demais na fila.',
    },
  },
  dnd: {
    roleDescription: 'thread arrastável',
    instructions:
      'Para mover uma thread, toque nela e depois num núcleo livre. Também dá para arrastar com o dedo ou com o mouse.',
    start: 'Thread {item} pega.',
    over: 'Sobre {target}.',
    end: 'Thread solta em {target}.',
    endNowhere: 'Thread solta fora de um destino.',
    cancel: 'Movimento cancelado.',
    targetSlot: 'núcleo {n}',
    targetQueue: 'fila de prontos',
    targetIo: 'espera de dados',
  },
  announce: {
    done: 'Tarefa concluída. {done} de {goal}.',
    blocked: 'Uma thread travou esperando dados.',
    froze: '{app} parou de responder. Restam {hearts} vidas.',
  },
} as const
