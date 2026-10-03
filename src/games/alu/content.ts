import type { ConceptCard, GameCopy } from '@/engine/types'

/** Todo texto do jogo, nunca nos componentes (README, passo 4; design doc `alu`). */
export const COPY: GameCopy = {
  title: 'A calculadora (ULA)',
  component: 'ULA',
  tagline: 'Somar não é mágica: é só portas lógicas repetidas, com um vai-um que viaja.',
  concepts: ['ULA (Unidade Lógica e Aritmética)', 'Vai-um (carry)'],
  opening: [
    'Você já viu portas decidirem coisas. Mas sabia que, com só portas, dá para **somar números**?',
    'É assim que a parte calculadora do processador, a **ULA**, funciona por dentro.',
    "Vamos somar 1 + 1 e descobrir por que vira '10' em binário.",
  ],
  phases: {
    tutorial: {
      title: 'Tutorial',
      teaser: 'O vai-um aparece pela primeira vez.',
      intro: ['Toque nas casas do resultado para marcar a soma de 0+1 e depois de 1+1.'],
      bulletsTitle: 'Como jogar',
      bullets: ['Toque na casa para alternar entre 0 e 1.', 'Confirme quando a soma estiver certa.'],
      goal: 'Complete as {goal} contas guiadas',
      real: 'Toda vez que um programa soma dois números, por dentro é exatamente essa conta, bit a bit.',
      learn: "1 + 1 não cabe numa casa só: escreve 0 e o excesso 'vai' para a próxima casa.",
      tip: 'Toque na casa do resultado para marcar 0 ou 1.',
    },
    'nivel-1': {
      title: 'Fase 1',
      teaser: 'Somar de 4 bits à mão, com o vai-um.',
      intro: [
        'Igual na soma decimal: some coluna a coluna, da direita para a esquerda. Se passar de 1, escreve 0 e leva 1.',
      ],
      bulletsTitle: 'Objetivo',
      bullets: ['Observe A e B.', 'Marque o resultado, coluna a coluna.', 'Confirme para ver se acertou.'],
      goal: 'Resolva {goal} somas de 4 bits',
      goalUntimed: 'Resolva {goal} somas de 4 bits, sem relógio',
      real: 'Processadores somam números de 64 bits em pedaços menores, propagando o vai-um do mesmo jeito.',
      learn: 'Se a coluna passar de 1, escreve 0 e leva 1 para a próxima coluna.',
      tip: 'Comece pela coluna da direita. Veja o vai-um antes de marcar a próxima casa.',
    },
    'nivel-2': {
      title: 'Fase 2',
      teaser: 'Montar o meio-somador (half adder).',
      intro: [
        'XOR dá a soma de dois bits (ignorando o vai-um); AND dá o vai-um (só é 1 quando os dois são 1).',
      ],
      bulletsTitle: 'Objetivo',
      bullets: ['Encaixe XOR no encaixe da soma.', 'Encaixe AND no encaixe do vai-um.', 'Passe nos {goal} casos.'],
      goal: 'Monte o meio-somador e passe nos {goal} casos',
      goalUntimed: 'Monte o meio-somador e passe nos {goal} casos, sem relógio',
      real: 'Todo somador de um processador, não importa o tamanho, nasce de meios-somadores como este.',
      learn: 'XOR calcula a soma de dois bits; AND calcula o vai-um — juntos, formam o meio-somador.',
      tip: 'Soma usa XOR. Vai-um usa AND (só é 1 quando os dois são 1).',
    },
    'nivel-3': {
      title: 'Fase 3',
      teaser: 'Somador completo: o vai-um se propaga.',
      intro: [
        'Agora tem três entradas: A, B e o vai-um que chegou da coluna anterior. Some os dois vai-uns possíveis com um OR.',
      ],
      bulletsTitle: 'Objetivo',
      bullets: [
        'Os dois meios-somadores já estão prontos, encadeados.',
        'Encaixe OR para combinar os dois vai-uns possíveis.',
        'Passe nos {goal} casos, inclusive 1+1+1.',
      ],
      goal: 'Monte o encaixe final e passe nos {goal} casos',
      goalUntimed: 'Monte o encaixe final e passe nos {goal} casos, sem relógio',
      real: 'Encadear 4 somadores completos é exatamente como uma ULA soma números de 4 bits de uma vez.',
      learn: 'Um somador completo é dois meios-somadores encadeados, mais um OR para juntar os dois vai-uns.',
      tip: 'Dos dois vai-uns possíveis (do primeiro e do segundo meio-somador), só um OR decide se algum deles é 1.',
    },
    'nivel-4': {
      title: 'Fase 4',
      teaser: 'O seletor escolhe a operação da ULA.',
      intro: [
        'A ULA sabe fazer mais de uma conta — o seletor escolhe qual resultado sai no final, sem desmontar nada.',
      ],
      bulletsTitle: 'Objetivo',
      bullets: [
        'Veja qual operação o Kernel está pedindo.',
        'Selecione Soma, AND ou OR no seletor.',
        'Confirme para resolver o desafio.',
      ],
      goal: 'Resolva {goal} desafios alternando soma, AND e OR',
      goalUntimed: 'Resolva {goal} desafios alternando soma, AND e OR, sem relógio',
      real: 'Um programa que soma preços e depois aplica uma máscara de bits usa essa mesma ULA duas vezes, só mudando o seletor.',
      learn: 'A mesma ULA já montada faz soma, AND ou OR — só muda qual seletor está ativo.',
      tip: 'Releia o pedido do Kernel: ele diz exatamente qual operação selecionar.',
    },
  },
  connection:
    'A ULA calcula rápido, mas ela não guarda nada — os números somem assim que a conta termina. Eles precisam ficar guardados em algum lugar enquanto isso: a memória.',
  finale: {
    title: 'Estação concluída!',
    intro: 'Você montou, com portas, a parte do processador que faz contas: a ULA.',
    bullets: [
      'Somar em binário é igual à soma decimal: coluna a coluna, com um vai-um que viaja.',
      'Um meio-somador é XOR (soma) + AND (vai-um); um somador completo encadeia dois deles.',
      'A mesma ULA já montada troca de operação (soma, AND, OR) com um seletor, sem remontar nada.',
    ],
    extraTitle: 'Curiosidade',
    extra: 'Processadores de 64 bits somam em pedaços menores encadeados, exatamente como a cadeia de somadores que você montou.',
  },
}

export const CARDS: readonly ConceptCard[] = [
  {
    id: 'vai-um',
    title: 'Vai-um (carry)',
    term: 'Carry',
    summary:
      "Quando a soma de uma coluna passa do valor máximo daquela base, o excesso 'vai' para a próxima coluna — em binário, isso acontece a cada vez que 1+1.",
    analogy:
      "Igual juntar 10 moedas de 1 centavo e trocar por uma de 10: o 'excesso' vira uma unidade na casa seguinte.",
    realWorld:
      'Processadores têm um bit de carry guardado justamente para isso, usado também para somar números maiores que o processador processa de uma vez (64 bits somados em pedaços).',
    icon: 'carry',
  },
  {
    id: 'ula',
    title: 'ULA',
    term: 'Unidade Lógica e Aritmética (ULA)',
    summary:
      'A parte do processador que faz contas e comparações — soma, subtração, AND, OR — sempre usando portas lógicas por dentro.',
    analogy:
      'Como a calculadora dentro de uma calculadora: todo o resto do processador só manda números para ela e espera o resultado.',
    realWorld: 'Toda operação matemática que um programa faz, de um jogo a uma planilha, passa pela ULA.',
    icon: 'alu',
  },
]

/** Textos de interface que não são "fala do Kernel" nem texto de fase. */
export const UI = {
  speakerRole: 'o guia do computador',
  stats: { time: 'Tempo', cases: 'Casos', score: 'Pontos' },
  fail: {
    time: { title: 'Tempo esgotado', reason: 'Tente de novo — a conta continua a mesma para praticar.' },
  },
  manual: {
    aLabel: 'A',
    bLabel: 'B',
    resultLabel: 'Resultado',
    carryLabel: 'vai-um',
    confirm: 'Confirmar',
    wrong: 'Ainda não bateu. Revise coluna a coluna e confirme de novo.',
  },
  circuit: {
    inputLabel: 'Interruptor {label}',
    slotLabel: 'Encaixe {label}, {state}',
    empty: 'vazio',
    stockTitle: 'Peças disponíveis',
  },
  select: {
    title: 'Qual operação?',
    challengeLabel: 'Desafio {n} de {total}',
    add: 'Soma',
    and: 'AND',
    or: 'OR',
    confirm: 'Confirmar',
    wrong: 'Essa não é a operação pedida. Releia o Kernel e tente outra vez.',
  },
}
