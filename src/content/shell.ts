import type { DifficultyId } from '@/engine/types'

/**
 * Textos do shell (mapa, telas comuns, HUD, ajustes). Tudo em pt-BR.
 * Strings aceitam **negrito**, {ícone} e {valor} (ver ui/RichText e ui/format).
 */
export const SHELL = {
  appName: 'Scalonater',
  appTagline: 'Como um computador funciona, do bit ao clique na tela',

  common: {
    back: 'Voltar',
    backToMap: 'Voltar ao mapa',
    close: 'Fechar',
    next: 'Próximo',
    skip: 'Pular',
    play: 'Jogar',
    continue: 'Continuar',
    loading: 'Carregando…',
  },

  a11y: {
    skipToContent: 'Pular para o conteúdo',
    muteOn: 'Som desligado. Toque para ligar',
    muteOff: 'Som ligado. Toque para desligar',
    pause: 'Pausar',
    resume: 'Continuar',
    restart: 'Recomeçar a fase',
    settings: 'Ajustes',
    manual: 'Manual do Computador',
    stars: '{n} de 3 estrelas',
    hearts: '{n} de {max} vidas',
    locked: 'bloqueada',
    newCards: '{n} cards novos',
  },

  map: {
    title: 'A placa-mãe',
    subtitle:
      'Cada peça é uma estação. Conclua uma estação para acender a peça e ligar a energia até a próxima.',
    progress: '{done} de {total} peças acesas',
    status: {
      complete: 'Acesa',
      available: 'Jogar',
      locked: 'Bloqueada',
      soon: 'Em construção',
    },
    lockedHint: 'Conclua as estações anteriores para liberar esta.',
    soonHint: 'Esta estação ainda está sendo construída. Volte em breve!',
    welcomeTitle: 'Bem-vindo à placa-mãe',
    welcome: [
      'Oi! Eu sou o **Kernel**, e vou guiar você por dentro de um computador.',
      'Cada peça desta placa é um minigame. Comece pela peça que está piscando.',
    ],
    manual: 'Manual',
    settings: 'Ajustes',
  },

  hub: {
    phases: 'Fases',
    phaseN: 'Fase {n}',
    tutorial: 'Tutorial',
    locked: 'Vença a fase anterior para liberar',
    play: 'Jogar',
    replay: 'Jogar de novo',
    replayOpening: 'Rever a abertura',
    difficulty: 'Dificuldade',
    difficultyHint: 'Dá para trocar sempre que quiser.',
    untimed: 'Modo sem tempo',
    untimedHint: 'Sem relógio e com o jogo mais lento. Bom para aprender com calma.',
    concepts: 'O que esta estação ensina',
    cards: 'Cards desta estação',
    autoplay: 'Ver o sistema jogar sozinho',
    completed: 'Estação concluída',
  },

  opening: {
    speaker: 'Kernel',
    role: 'o guia do computador',
    start: 'Vamos lá!',
  },

  intro: {
    kicker: '{phase} de {total} · {difficulty}',
    kickerTutorial: 'Tutorial',
    realWorld: 'Na vida real',
    goalUntimed: 'Meta: {goal} tarefas. Modo sem tempo: o relógio está desligado.',
    play: 'Jogar',
    playPhase: 'Jogar {phase}',
  },

  hud: {
    phase: 'Fase',
    tutorial: 'Tutorial',
    auto: 'Auto',
    mode: 'Modo',
    time: 'Tempo',
    untimed: 'Livre',
    tasks: 'Tarefas',
    score: 'Pontos',
    combo: 'Combo',
    comboValue: 'x{n}',
    lives: 'Vidas',
    seconds: 's',
  },

  controls: {
    pause: 'Pausar',
    resume: 'Continuar',
    restart: 'Recomeçar',
    exit: 'Sair',
  },

  pause: {
    title: 'Pausado',
    body: 'Os núcleos congelaram. O tempo também.',
    resume: 'Continuar',
    restart: 'Recomeçar fase',
    exit: 'Sair para o mapa',
    sound: 'Som',
  },

  lose: {
    kicker: '{phase} · {difficulty}',
    progress: '{done} de {goal} tarefas concluídas',
    tipTitle: 'Dica do Kernel',
    retry: 'Tentar de novo',
    easier: 'Tentar no {difficulty}',
    untimed: 'Jogar sem tempo',
    exit: 'Voltar',
  },

  result: {
    title: 'Fase concluída!',
    learnedTitle: 'Kernel · o que você aprendeu',
    realWorld: 'Na vida real:',
    nextPhase: 'Próxima fase',
    nextPhaseCta: 'Próxima fase',
    retry: 'Jogar de novo',
    finishCta: 'Fechar a estação',
    newRecord: 'Novo recorde!',
    cardUnlocked: 'Card novo no Manual',
    viewCard: 'Ver card',
    connectionTitle: 'Próxima estação',
    journeyEndTitle: 'Fim da jornada',
    stationLit: 'Peça acesa na placa-mãe!',
    backToMap: 'Ver a placa-mãe',
    autoTitle: 'Viu só?',
    autoBody:
      'O escalonador automático tirou do núcleo quem parou para esperar dados, revezou as tarefas longas, preferiu núcleos vazios e devolveu threads ao núcleo de antes. No computador de verdade, ele faz isso milhares de vezes por segundo.',
  },

  manual: {
    title: 'Manual do Computador',
    subtitle: 'Cada card é um conceito que você desbloqueou jogando.',
    count: '{n} de {total} cards',
    locked: 'Card bloqueado',
    lockedHint: 'Jogue a estação {station} para desbloquear.',
    soon: 'Em breve',
    analogy: 'Pense assim',
    realWorld: 'No seu computador',
    term: 'Nome técnico',
    new: 'Novo',
    empty: 'Nenhum card ainda. Jogue uma estação para ganhar o primeiro!',
  },

  settings: {
    title: 'Ajustes',
    sound: 'Som',
    muted: 'Silenciar tudo',
    music: 'Música',
    sfx: 'Efeitos sonoros',
    play: 'Jogo',
    untimed: 'Modo sem tempo',
    untimedHint: 'Sem relógio em todos os minigames, e partidas mais lentas.',
    reduceMotion: 'Menos animações',
    reduceMotionHint: 'O jogo também respeita a configuração do seu aparelho.',
    difficulty: 'Dificuldade',
    data: 'Progresso',
    reset: 'Apagar meu progresso',
    resetConfirm: 'Apagar tudo? Estrelas, fases e cards serão perdidos.',
    resetDone: 'Progresso apagado.',
    credits:
      'Músicas: "Techno_Chiptale" (Centurion_of_war) e "Stage 2" (Juhani Junkala), domínio público (CC0).',
    install: 'Instalar o app',
    installHint: 'Instale para jogar sem internet, direto da tela inicial.',
    offlineReady: 'Pronto para jogar sem internet.',
    on: 'Ligado',
    off: 'Desligado',
  },

  difficulty: {
    easy: { name: 'Fácil', desc: 'Mais tempo, menos tarefas e threads bem pacientes.' },
    normal: { name: 'Normal', desc: 'Um desafio equilibrado.' },
    hard: { name: 'Difícil', desc: 'Pouco tempo, fila cheia e threads impacientes.' },
  } satisfies Record<DifficultyId, { name: string; desc: string }>,

  notFound: {
    title: 'Peça não encontrada',
    body: 'Este caminho não existe na placa-mãe.',
  },

  update: {
    ready: 'Nova versão disponível.',
    reload: 'Atualizar',
  },

  /** Nome falado dos ícones que aparecem no meio do texto (leitores de tela). */
  iconNames: {
    hourglass: 'ampulheta',
    flame: 'chama',
    heart: 'coração',
    star: 'estrela',
    'app-game': 'jogo',
    'app-browser': 'navegador',
    'app-music': 'música',
    'app-render': 'vídeo',
  } as Record<string, string>,
} as const
