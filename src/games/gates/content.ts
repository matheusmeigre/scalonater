import type { ConceptCard, GameCopy } from '@/engine/types'

/** Todo texto do jogo, nunca nos componentes (README, passo 4; design doc `gates`). */
export const COPY: GameCopy = {
  title: 'Portas lógicas',
  component: 'Porta lógica',
  tagline: 'Combine interruptores para decidir, não só guardar.',
  concepts: ['Porta lógica (AND, OR, NOT)', 'Tabela-verdade'],
  opening: [
    'Lembra dos interruptores? Sozinhos, eles só guardam 0 e 1.',
    'Mas e se eu quiser que uma lâmpada só acenda quando **os dois** interruptores estiverem ligados? Isso é **decidir**. Para isso existem as **portas lógicas**.',
    'Vamos montar a primeira: a porta NOT, que inverte o que recebe.',
  ],
  phases: {
    tutorial: {
      title: 'Tutorial',
      teaser: 'A porta NOT inverte um valor.',
      intro: ['Ligue e desligue o interruptor A e observe a lâmpada inverter.'],
      bulletsTitle: 'Como jogar',
      bullets: ['Toque no interruptor A para ligar e desligar.', 'A lâmpada sempre faz o contrário.'],
      goal: 'Veja a lâmpada inverter nos dois estados',
      real: 'Um fio de computador também pode ser invertido por uma porta NOT, bilhões de vezes por segundo.',
      learn: 'A porta NOT inverte: liga quando a entrada está desligada, e vice-versa.',
      tip: 'Toque no interruptor A para ver a lâmpada mudar.',
    },
    'nivel-1': {
      title: 'Fase 1',
      teaser: 'Escolher entre AND e OR.',
      intro: [
        'Olhe a tabela: a lâmpada só acende quando os dois estão ligados? É **AND**. Acende se **qualquer um** estiver ligado? É **OR**.',
      ],
      bulletsTitle: 'Objetivo',
      bullets: ['Veja a tabela-verdade ao lado.', 'Encaixe a porta certa no único encaixe.'],
      goal: 'Encaixe a porta certa e passe nos {goal} casos',
      goalUntimed: 'Encaixe a porta certa e passe nos {goal} casos, sem relógio',
      real: 'Um alarme que só dispara com duas chaves viradas (cofre, elevador) é um AND de verdade.',
      learn: 'AND só acende com as duas entradas ligadas; OR acende com qualquer uma.',
      tip: 'Olhe a tabela: ela só tem um "1"? É AND. Tem três "1"? É OR.',
    },
    'nivel-2': {
      title: 'Fase 2',
      teaser: 'Combinar duas portas: NAND.',
      intro: ['NAND é só um AND seguido de um NOT — ele inverte o resultado do AND.'],
      bulletsTitle: 'Objetivo',
      bullets: ['Encaixe AND no primeiro encaixe.', 'Encaixe NOT no segundo, para inverter o resultado.'],
      goal: 'Monte o NAND e passe nos {goal} casos',
      goalUntimed: 'Monte o NAND e passe nos {goal} casos, sem relógio',
      real: 'A porta NAND é tão básica que chips inteiros já foram construídos usando só ela.',
      learn: 'Não existe uma peça "NAND" pronta: ela nasce de combinar AND com NOT.',
      tip: 'AND primeiro, NOT depois: NAND é o AND de cabeça para baixo.',
    },
    'nivel-3': {
      title: 'Fase 3',
      teaser: 'Montar um XOR (ou-exclusivo).',
      intro: ['XOR acende quando as entradas são **diferentes**. Tente: **(A ou B) e não (A e B)**.'],
      bulletsTitle: 'Objetivo',
      bullets: ['Monte "(A OR B) AND NOT(A AND B)".', 'Passe nos {goal} casos da tabela.'],
      goal: 'Monte o XOR e passe nos {goal} casos',
      goalUntimed: 'Monte o XOR e passe nos {goal} casos, sem relógio',
      real: 'Somadores binários (a base da ULA) usam XOR para somar dois bits.',
      learn: 'XOR não é uma peça básica: ele se monta combinando AND, OR e NOT.',
      tip: 'Lembre a dica: (A ou B) e não (A e B). Monte uma peça por vez.',
    },
    'nivel-4': {
      title: 'Fase 4',
      teaser: 'Estoque limitado de portas.',
      intro: [
        'Você só tem as peças certas — não dá para desperdiçar nenhuma. Pense na tabela inteira antes de encaixar a última.',
      ],
      bulletsTitle: 'Objetivo',
      bullets: [
        'Você tem exatamente 1 AND, 1 OR e 1 NOT.',
        'Decida a topologia certa antes de gastar a última peça.',
      ],
      goal: 'Use as 3 peças certas e passe nos {goal} casos',
      goalUntimed: 'Use as 3 peças certas e passe nos {goal} casos, sem relógio',
      real: 'Projetistas de chips enfrentam o mesmo problema: menos portas custam menos energia e espaço.',
      learn: 'A mesma peça no lugar errado muda a função inteira — a topologia importa tanto quanto a peça.',
      tip: 'Errou e travou? Toque na peça encaixada para desfazer, sem custo.',
    },
  },
  connection:
    'Com portas lógicas dá para decidir… e, surpresa, também para fazer contas. A próxima estação é uma calculadora feita só de portas: a ULA.',
  finale: {
    title: 'Estação concluída!',
    intro: 'Você combinou interruptores em portas, e portas em decisões mais complexas.',
    bullets: [
      'Uma porta lógica decide um resultado a partir de uma ou duas entradas.',
      'NAND e XOR não são peças básicas: nascem de combinar AND, OR e NOT.',
      'Uma tabela-verdade testa um circuito em todos os casos de uma vez.',
    ],
    extraTitle: 'Curiosidade',
    extra: 'Um processador moderno tem bilhões dessas portinhas dentro de um chip do tamanho de uma moeda.',
  },
}

export const CARDS: readonly ConceptCard[] = [
  {
    id: 'porta-logica',
    title: 'Porta lógica',
    term: 'Porta lógica (AND, OR, NOT)',
    summary:
      'Uma porta lógica é um circuito minúsculo que decide um resultado (0 ou 1) a partir de uma ou duas entradas.',
    analogy:
      'AND é como duas chaves em série (as duas precisam estar viradas); OR é como duas chaves em paralelo (uma já basta).',
    realWorld: 'Um processador moderno tem bilhões dessas portinhas dentro de um chip do tamanho de uma moeda.',
    icon: 'gate',
  },
  {
    id: 'tabela-verdade',
    title: 'Tabela-verdade',
    term: 'Tabela-verdade',
    summary:
      'Uma tabela que lista, para cada combinação possível das entradas, qual deveria ser a saída — é como testar um circuito em todos os casos de uma vez.',
    analogy: 'Como testar todas as combinações de uma fechadura de 2 chaves antes de confiar nela.',
    realWorld:
      'Compiladores e chips usam tabelas assim para verificar que um circuito está correto antes de ser fabricado.',
    icon: 'table',
  },
]

/** Textos de interface que não são "fala do Kernel" nem texto de fase. */
export const UI = {
  speakerRole: 'o guia do computador',
  stats: { time: 'Tempo', cases: 'Casos', score: 'Pontos' },
  fail: {
    time: { title: 'Tempo esgotado', reason: 'Tente de novo — a tabela continua ao lado para ajudar.' },
  },
  table: { title: 'Tabela-verdade', caseLabel: 'Caso {n}' },
  stock: { title: 'Estoque de portas', unlimited: 'à vontade' },
  circuit: { inputLabel: 'Interruptor {label}', slotLabel: 'Encaixe {n}, {state}', empty: 'vazio' },
  undo: { button: 'Desfazer última peça' },
}
