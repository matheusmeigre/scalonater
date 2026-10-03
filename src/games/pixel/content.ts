import type { ConceptCard, GameCopy } from '@/engine/types'

/**
 * Todo texto do jogo, nunca nos componentes (README, passo 4). Design doc:
 * `docs/design/clique-ao-pixel.md`.
 */
export const COPY: GameCopy = {
  title: 'Do clique ao pixel',
  component: 'A placa inteira',
  tagline: 'Siga um clique do mouse até o pixel que acende na tela.',
  concepts: ['Pipeline de entrada e saída'],
  opening: [
    'Você já viu cada peça do computador, uma por uma. Agora vamos ver todas juntas, de uma vez só.',
    'Vou te mostrar o caminho de **um clique só** — do mouse até o pixel que acende na tela.',
    'Pronto? Clica aí.',
  ],
  phases: {
    tutorial: {
      title: 'Entrada',
      teaser: 'Um clique vira uma interrupção.',
      intro: [
        'Lembra da **Interrupções**? É a mesma campainha: um clique do mouse também toca.',
        'Toque no mouse e depois guarde e atenda a campainha.',
      ],
      bulletsTitle: 'Como jogar',
      bullets: [
        'Toque no mouse para gerar o clique.',
        'Toque em "Guardar e atender" para a CPU reagir à campainha.',
      ],
      goal: 'Siga os {goal} toques guiados',
      real: 'Todo clique, tecla ou pacote de rede que chega primeiro acorda a CPU por uma interrupção.',
      learn: 'Um clique do mouse gera uma interrupção: o sistema só reage quando ela toca a campainha.',
      tip: 'Toque no mouse e depois em "Guardar e atender", na ordem.',
    },
    'nivel-1': {
      title: 'Decisão',
      teaser: 'Escalonador, ciclo e ULA, em sequência.',
      intro: [
        'A interrupção acordou uma thread; ela precisa de um núcleo livre — lembra dos **Núcleos**?',
        'Depois, a CPU roda o pedido em três passos do **Ciclo** e termina numa conta da **ULA**.',
      ],
      bulletsTitle: 'Objetivo',
      bullets: [
        'Encaixe a thread no núcleo livre.',
        'Toque "Executar" nos 3 passos do ciclo.',
        'Escolha a operação Soma no seletor da ULA.',
      ],
      goal: 'Complete os {goal} passos',
      goalUntimed: 'Complete os {goal} passos, sem relógio',
      real: 'Um clique de verdade passa pelo escalonador, pelo ciclo da CPU e pela ULA em bem menos de um milésimo de segundo.',
      learn: 'A interrupção acorda uma thread, que precisa de um núcleo livre e de uma conta da ULA para ser atendida.',
      tip: 'Lembra do escalonador, do ciclo e da ULA? É a mesma coisa, só que mais rápido — respira e segue o mesmo passo a passo de sempre.',
    },
    'nivel-2': {
      title: 'Dados',
      teaser: 'Cache, RAM e disco entregam a imagem.',
      intro: [
        'O pedido do clique precisa de um dado: primeiro checa o **Cache** (perto, rápido).',
        'Se falhar, busca na RAM; a imagem do botão em si está guardada no **Armazenamento**.',
      ],
      bulletsTitle: 'Objetivo',
      bullets: [
        'Resolva 1 falha e 1 acerto no cache.',
        'Leia os 3 blocos certos do disco, em sequência.',
      ],
      goal: 'Complete os {goal} passos',
      goalUntimed: 'Complete os {goal} passos, sem relógio',
      real: 'A CPU sempre confere o cache antes da RAM, e a RAM antes do disco — cada nível é mais lento que o anterior.',
      learn: 'O pedido de um clique busca dados numa hierarquia: cache primeiro, depois RAM, depois disco.',
      tip: 'Primeiro o cache, só depois a RAM — exatamente como na estação Cache. Toque na caixinha certa.',
    },
    'nivel-3': {
      title: 'Saída',
      teaser: 'Os bits acendem os pixels.',
      intro: [
        'O resultado final chega como uma fileira de bits; cada bit acende um pixel.',
        'A maior parte já foi acesa pela sua própria jornada — complete o resto.',
      ],
      bulletsTitle: 'Objetivo',
      bullets: ['Acenda os pixels que ainda faltam até completar o desenho.'],
      goal: 'Acenda os {goal} pixels que faltam',
      real: 'A tela do seu computador é, literalmente, uma grade de números que a CPU escreve bilhões de vezes por segundo.',
      learn: 'O resultado de todo o percurso chega como bits — a mesma ideia de "1 bit = 1 pixel" da estação Bits.',
      tip: 'Sem pressa aqui: toque nos pixels apagados até o desenho ficar igual ao modelo.',
    },
  },
  connection:
    'Era isso: um clique percorreu a campainha, a decisão, os dados e voltou como luz na tela. Você entendeu o computador inteiro.',
  finale: {
    title: 'Jornada concluída!',
    intro: 'Um clique não aparece por mágica: ele percorre o computador inteiro.',
    bullets: [
      'Interrupção: o sistema reage ao clique.',
      'Decisão: escalonador, ciclo e ULA resolvem o pedido.',
      'Dados: cache, RAM e disco entregam o que falta.',
      'Saída: bits acendem pixels na tela.',
    ],
    extraTitle: 'Curiosidade',
    extra: 'Um computador moderno faz esse percurso inteiro bilhões de vezes por segundo, para cada clique, tecla e quadro de tela.',
  },
}

export const CARDS: readonly ConceptCard[] = [
  {
    id: 'click-path',
    title: 'O caminho de um clique',
    term: 'Pipeline de entrada e saída',
    summary:
      'Um clique é interrupção, decisão (escalonador, ciclo, ULA), busca de dados (cache, RAM, disco) e, por fim, bits que acendem pixels — tudo em menos de um milésimo de segundo.',
    analogy:
      'Como uma corrida de revezamento: cada peça do computador passa o bastão para a próxima, bem rápido, sem nunca derrubar.',
    realWorld:
      'Um computador moderno faz esse percurso inteiro bilhões de vezes por segundo, para cada clique, tecla e quadro de tela.',
    icon: 'pixel',
  },
]

/** Textos de interface que não são "fala do Kernel" nem texto de fase. */
export const UI = {
  speakerRole: 'o guia do computador',
  chapterLabel: {
    entrada: 'Entrada',
    decisao: 'Decisão',
    dados: 'Dados',
    saida: 'Saída',
  },
  step: {
    io: { from: 'Interrupções e E/S', hint: 'Lembra das Interrupções? Um clique também toca a campainha.' },
    schedule: { from: 'Núcleos', hint: 'Lembra dos Núcleos? Encaixe a thread no núcleo livre.' },
    cycle: { from: 'Ciclo da CPU', hint: 'Lembra do Ciclo? Toque "Executar" nos 3 passos.' },
    alu: { from: 'ULA', hint: 'Lembra da ULA? Escolha a operação Soma.' },
    cache: { from: 'Cache', hint: 'Lembra do Cache? É esta caixinha aqui.' },
    disk: { from: 'Armazenamento', hint: 'Lembra do Armazenamento? Leia os blocos na ordem.' },
  },
  tutorialStep: {
    'click-mouse': 'Toque no mouse para gerar o clique.',
    'guard-ring': 'Toque em "Guardar e atender".',
    resume: 'Pronto — a tarefa principal retoma.',
  },
  core: { title: 'Núcleos', empty: 'Núcleo livre', occupied: 'Thread do clique' },
  cycle: {
    title: 'Ciclo',
    fetch: 'Buscar',
    decode: 'Decodificar',
    execute: 'Executar',
    pcLabel: 'PC',
    accLabel: 'ACC',
  },
  alu: { title: 'ULA' },
  cache: { title: 'Cache (L1)', emptySlot: 'vazio', address: 'Endereço {n}' },
  disk: { title: 'Disco', blockLabel: 'Bloco {n}' },
  pixels: { title: 'Pixels', bitLabel: 'Pixel {n}, {state}', on: 'acesa', off: 'apagada' },
  guardButton: 'Guardar e atender',
  mouseDevice: 'Mouse',
  continueLabel: 'Continuar',
}
