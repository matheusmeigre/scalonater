import type { ConceptCard, GameCopy } from '@/engine/types'

/**
 * Todo texto do jogo, nunca nos componentes (README, passo 4). Strings
 * aceitam **negrito**, {ícone} (nomes em `src/ui/icons.tsx`) e {valor}
 * (ver `goalValues` em `index.ts`).
 */
export const COPY: GameCopy = {
  title: 'Modelo',
  component: 'Peça de exemplo',
  tagline: 'Troque por uma frase curta que resume a estação.',
  concepts: ['Conceito de exemplo'],
  opening: [
    'Oi! Eu sou o **Kernel**. Esta é a fala de abertura de exemplo.',
    'No máximo 3 falas aqui — eles contam para o teste de contrato.',
  ],
  phases: {
    tutorial: {
      title: 'Tutorial',
      teaser: 'Aprenda o toque básico.',
      intro: ['Toque no alvo certo para aprender a mecânica.'],
      bulletsTitle: 'Como jogar',
      bullets: ['Toque no alvo em destaque.'],
      goal: 'Acerte {goal} vezes',
      real: 'Troque por um fato curto do mundo real.',
      learn: 'O que o jogador aprendeu aqui.',
      tip: 'Dica do Kernel ao perder (o tutorial nunca perde, mas o campo é obrigatório).',
    },
    'nivel-1': {
      title: 'Fase 1',
      teaser: 'A primeira ideia nova.',
      intro: ['Descreva a ideia nova desta fase (não é só mais velocidade).'],
      bulletsTitle: 'Objetivo',
      bullets: ['Acerte {goal} alvos.'],
      goal: 'Acerte {goal} vezes',
      goalUntimed: 'Acerte {goal} vezes, sem relógio',
      real: 'Fato do mundo real conectado à fase 1.',
      learn: 'O que o jogador aprendeu na fase 1.',
      tip: 'Dica do Kernel ao perder a fase 1.',
    },
    'nivel-2': {
      title: 'Fase 2',
      teaser: 'A segunda ideia nova.',
      intro: ['Descreva a ideia nova desta fase.'],
      bulletsTitle: 'Objetivo',
      bullets: ['Acerte {goal} alvos.'],
      goal: 'Acerte {goal} vezes',
      real: 'Fato do mundo real conectado à fase 2.',
      learn: 'O que o jogador aprendeu na fase 2.',
      tip: 'Dica do Kernel ao perder a fase 2.',
    },
    'nivel-3': {
      title: 'Fase 3',
      teaser: 'A terceira ideia nova.',
      intro: ['Descreva a ideia nova desta fase.'],
      bulletsTitle: 'Objetivo',
      bullets: ['Acerte {goal} alvos.'],
      goal: 'Acerte {goal} vezes',
      real: 'Fato do mundo real conectado à fase 3.',
      learn: 'O que o jogador aprendeu na fase 3.',
      tip: 'Dica do Kernel ao perder a fase 3.',
    },
  },
  connection: 'Frase de conexão com a próxima estação da trilha.',
  finale: {
    title: 'Estação concluída!',
    intro: 'Resumo do que a estação ensinou.',
    bullets: ['O que você aprendeu, em tópicos.'],
    extraTitle: 'Curiosidade',
    extra: 'Um fato extra para fechar com chave de ouro.',
  },
}

export const CARDS: readonly ConceptCard[] = [
  {
    id: 'exemplo',
    title: 'Card de exemplo',
    term: 'Termo técnico',
    summary: 'Resumo curto do conceito, em uma ou duas frases.',
    analogy: 'Uma analogia do dia a dia para o mesmo conceito.',
    realWorld: 'Onde isso aparece de verdade, fora do jogo.',
    icon: 'info',
  },
]

/** Textos de interface que não são "fala do Kernel" nem texto de fase. */
export const UI = {
  speakerRole: 'o guia do computador',
  targetLabel: 'Alvo {n}',
}
