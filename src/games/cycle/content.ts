/**
 * Todo o texto do minigame Ciclo da CPU, em pt-BR (README, passo 4;
 * design doc `docs/design/cycle.md`).
 */
import type { ConceptCard, GameCopy } from '@/engine/types'

export const COPY: GameCopy = {
  title: 'Ciclo da CPU',
  component: 'Ciclo de instrução',
  tagline: 'Buscar, decodificar, executar: a dancinha que a CPU repete bilhões de vezes.',
  concepts: ['Ciclo de instrução', 'Registrador', 'Contador de programa', 'Acumulador'],
  opening: [
    'Bem-vindo ao coração da CPU! Todo programa roda como uma dancinha de três passos.',
    '**Buscar** a instrução na memória, **decodificar** o que ela quer dizer, **executar** o que ela manda. De novo, de novo, bilhões de vezes por segundo.',
    'Vamos fazer isso devagarzinho, um passo por vez. Toca a gaveta que o contador de programa está apontando!',
  ],
  phases: {
    tutorial: {
      title: 'Buscar, decodificar, executar',
      teaser: 'Uma única instrução, passo a passo pelas três estações.',
      intro: [
        'O **contador de programa (PC)** aponta sempre a próxima gaveta a buscar. Toque nela para buscar a instrução.',
        'Depois, toque a peça certa para decodificar o que ela significa e, por fim, toque em **Executar**.',
      ],
      bulletsTitle: 'Como jogar',
      bullets: [
        'BUSCAR: toque na gaveta em destaque (ela é a que o PC aponta).',
        'DECODIFICAR: toque a peça com o mesmo mnemônico mostrado.',
        'EXECUTAR: toque no botão para aplicar o efeito.',
      ],
      goal: 'Complete o ciclo de uma instrução. Sem relógio e sem derrota: aqui é só para aprender.',
      goalUntimed:
        'Complete o ciclo de uma instrução. Sem relógio e sem derrota: aqui é só para aprender.',
      real: 'É assim que todo programa roda, de verdade: uma instrução por vez, sempre pelos mesmos três passos.',
      learn: 'Buscar, decodificar e executar é o ciclo que a CPU repete para cada linha de um programa.',
      tip: 'Toque primeiro na gaveta que o PC aponta, depois na peça certa, depois em Executar.',
    },
    'nivel-1': {
      title: 'O PC avança sozinho',
      teaser: 'Depois de cada execução, o contador de programa já aponta a próxima gaveta.',
      intro: [
        'Agora o programa tem várias instruções. Depois de cada execução, o **PC avança sozinho** para a próxima — você não escolhe.',
        'Olha o mnemônico que aparece na estação Buscar antes de escolher a peça em Decodificar.',
      ],
      bulletsTitle: 'Objetivo',
      bullets: [
        'Busque, decodifique e execute cada instrução, na ordem que o PC pede.',
        'Complete as {goal} instruções do programa.',
      ],
      goal: 'Execute as {goal} instruções do programa antes do tempo acabar.',
      goalUntimed: 'Execute as {goal} instruções do programa, sem relógio.',
      real: 'O processador faz exatamente isso, sozinho, a cada instrução: busca, decodifica e executa — sem perguntar nada.',
      learn: 'O PC não espera ordem nenhuma: ele avança automaticamente para a próxima instrução depois de cada execução.',
      tip: 'Você decodificou a peça errada. Olha o mnemônico que apareceu em Buscar antes de escolher a peça.',
    },
    'nivel-2': {
      title: 'O acumulador guarda a conta',
      teaser: 'CARREGA, SOMA e GUARDA passam valores pelo acumulador.',
      intro: [
        'O **acumulador (ACC)** é onde a CPU guarda o valor em que está trabalhando agora. `CARREGA` e `SOMA` mudam o ACC; `GUARDA` o escreve numa gaveta.',
        'Acompanhe o ACC no painel de registradores: ele muda a cada execução que o afeta.',
      ],
      bulletsTitle: 'Objetivo',
      bullets: [
        'CARREGA: ACC recebe o valor da gaveta.',
        'SOMA: ACC recebe ACC + o valor da gaveta.',
        'GUARDA: a gaveta recebe o valor do ACC.',
        'Termine o programa com ACC = {goal}.',
      ],
      goal: 'Rode o programa e termine com o acumulador em {goal}.',
      goalUntimed: 'Rode o programa e termine com o acumulador em {goal}, sem relógio.',
      real: 'Um registrador é muito mais rápido que a RAM — por isso a CPU evita ir até a memória sempre que pode, e guarda o resultado parcial bem perto de si.',
      learn: 'O acumulador guarda um valor só até a próxima conta — confira o que CARREGA e SOMA fazem com ele antes de executar.',
      tip: 'O acumulador guarda um valor só até a próxima conta — confere o que CARREGA e SOMA fazem com ele antes de executar.',
    },
    'nivel-3': {
      title: 'Desvio e laço',
      teaser: 'PULA e PULASZ fazem o PC voltar para trás.',
      intro: [
        '`PULA` manda o PC direto para outro endereço. `PULASZ` só pula **se o acumulador não for zero** — "pula se não zero".',
        'Combinando os dois, um trecho do programa pode repetir várias vezes: é o **laço**. Acompanhe o mesmo trecho de gavetas sendo percorrido de novo.',
      ],
      bulletsTitle: 'Novidade',
      bullets: [
        'PULA: o PC vai direto para o endereço indicado.',
        'PULASZ: só pula se o acumulador não for zero; senão, segue para a próxima.',
        'O laço deste programa se repete algumas vezes antes de sair.',
      ],
      goal: 'Rode o programa até o laço terminar e o PC seguir em frente.',
      goalUntimed: 'Rode o programa até o laço terminar, sem relógio.',
      real: 'É assim que todo "repita isso N vezes" de um programa funciona por dentro: um desvio condicional que volta ao início do trecho.',
      learn: 'Um laço é só um desvio que volta para trás enquanto uma condição for verdadeira — aqui, enquanto o acumulador não chega a zero.',
      tip: 'O PULASZ só volta se o acumulador não for zero. Se ele ficar voltando pra sempre, é sinal de que o contador não está chegando a zero — olha o GUARDA do laço.',
    },
    'nivel-4': {
      title: 'O relógio acelera',
      teaser: 'Mesmo ciclo de antes, só que com menos tempo por estação.',
      intro: [
        'A CPU acelerou! O ciclo é exatamente o mesmo de antes — buscar, decodificar, executar — só que agora cada estação dá menos tempo.',
        'Respira: a meta é a mesma do acumulador; nada de novo além da velocidade.',
      ],
      bulletsTitle: 'Objetivo',
      bullets: ['O mesmo programa de antes, com menos tempo por estação.', 'Termine com ACC = {goal}.'],
      goal: 'Rode o programa, mais rápido, e termine com o acumulador em {goal}.',
      goalUntimed: 'Rode o programa e termine com o acumulador em {goal}, sem relógio.',
      real: 'É literalmente o que "clock mais rápido" significa: o mesmo ciclo de buscar-decodificar-executar, só que repetido mais vezes por segundo.',
      learn: 'Acelerar o relógio não muda o que a CPU faz — só a velocidade com que ela repete o mesmo ciclo.',
      tip: 'O relógio acelerou! Respira: o ciclo é o mesmo de antes, só que mais rápido.',
    },
  },
  connection:
    'Buscar na RAM toda hora é meio lento. E se a gente guardasse bem perto da CPU só o que ela usa mais? Próxima estação: o cache.',
  finale: {
    title: 'Você rodou um programa de verdade',
    intro: 'Tudo o que você fez tocando nas gavetas, a CPU faz sozinha, bilhões de vezes por segundo:',
    bullets: [
      'Busca a próxima instrução pelo endereço que o PC aponta.',
      'Decodifica o que ela quer dizer.',
      'Executa o efeito: muda o acumulador, a memória, ou o próprio PC.',
    ],
    extraTitle: 'E o pipeline?',
    extra:
      'Processadores modernos começam a buscar a instrução seguinte antes de terminar a atual (pipeline), mas sempre seguindo esses três passos.',
  },
}

export const CARDS: readonly ConceptCard[] = [
  {
    id: 'instruction-cycle',
    title: 'Buscar, decodificar, executar',
    term: 'Ciclo de instrução',
    summary: 'O processador repete esses três passos para rodar cada linha de um programa.',
    analogy:
      'Ler uma receita (buscar), entender o passo (decodificar) e fazer (executar), um de cada vez.',
    realWorld:
      'Processadores modernos começam a buscar a instrução seguinte antes de terminar a atual (pipeline), mas sempre seguindo esses três passos.',
    icon: 'cycle',
  },
  {
    id: 'register',
    title: 'A mesinha de trabalho da CPU',
    term: 'Registrador',
    summary:
      'Um espacinho minúsculo e superrápido dentro da própria CPU, para guardar o valor em que ela está trabalhando agora.',
    analogy:
      'A mão que segura a peça enquanto você monta um quebra-cabeça, em vez de ir até a caixa a cada peça.',
    realWorld: 'Um registrador é muito mais rápido que a RAM — por isso a CPU evita ir até a memória sempre que pode.',
    icon: 'alu',
  },
]

/** Etapas guiadas do tutorial (ids casam com phases.ts). */
export const TUTORIAL_STEPS: Record<string, string> = {
  'tutorial-fetch': 'O contador de programa (PC) aponta a gaveta 0. Toque nela para buscar a instrução.',
  'tutorial-decode': 'A instrução é **CARREGA**. Toque a peça CARREGA na paleta para decodificar.',
  'tutorial-execute': 'Agora toque em **Executar** para aplicar o efeito.',
}

/** Falas do Kernel durante a partida. */
export const KERNEL = {
  start: 'Vai! Busque, decodifique e execute cada instrução.',
  fetched: 'Instrução buscada! Agora decodifique.',
  decodedWrong: 'Essa peça não é a instrução buscada. Olha o mnemônico de novo.',
  executed: 'Executado!',
  expired: 'A estação esfriou! Vamos com mais calma na próxima.',
  loopedTooMuch: 'Esse laço não está parando — confira se o contador está mesmo chegando a zero.',
  combo: 'Combo x{n}! Suas mãos estão rápidas.',
  paused: 'Jogo pausado.',
  resumed: 'De volta ao jogo!',
} as const

/** Textos da cena. */
export const UI = {
  speakerRole: 'o guia do ciclo da CPU',
  modeKicker: 'Modo',
  phaseKicker: 'Fase',
  pcLabel: 'PC',
  accLabel: 'ACC',
  stations: {
    fetch: 'Buscar',
    decode: 'Decodificar',
    execute: 'Executar',
  },
  executeButton: 'Executar',
  readyBadge: 'Pronta',
  doneBadge: 'Feita',
  shelfLabel: 'Estante de memória',
  stats: {
    score: 'Pontos',
    executions: 'Execuções',
    mistakes: 'Erros',
  },
  fail: {
    title: 'Tempo esgotado',
    reason: 'Erros ou estações demais expiraram antes de completar o programa.',
  },
  aria: {
    pcHighlight: 'Gaveta apontada pelo contador de programa',
    opButton: 'Decodificar como {op}',
  },
  announce: {
    fetched: 'Instrução buscada: {instruction}.',
    decoded: 'Decodificado corretamente.',
    mistake: 'Resposta errada.',
    executed: 'Instrução executada.',
  },
} as const
