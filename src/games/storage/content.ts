import type { ConceptCard, GameCopy } from '@/engine/types'

/** Todo texto do jogo, nunca nos componentes (README, passo 4). */
export const COPY: GameCopy = {
  title: 'Armazenamento',
  component: 'SSD',
  tagline: 'Arquivos em blocos, uma tabela que lembra onde cada um está.',
  concepts: ['Sistema de arquivos', 'Fragmentação', 'HD × SSD'],
  opening: [
    'A RAM esquece tudo quando a energia cai — mas e o que você quer guardar de verdade?',
    'Esse é o trabalho do **armazenamento**: um disco cheio de blocos numerados, com uma **tabela** que lembra onde cada arquivo está.',
    'Vamos salvar, apagar e reaproveitar espaço. De vez em quando, um arquivo não cabe inteiro num só lugar — e tudo bem, a tabela sabe seguir o rastro dele.',
  ],
  phases: {
    tutorial: {
      title: 'Tutorial',
      teaser: 'Salvar um arquivo e achá-lo de novo pela tabela.',
      intro: [
        'Toque no pedido para ver o que precisa salvar, depois toque em blocos livres até preencher o tamanho pedido.',
        'Depois, toque no nome do arquivo na tabela para ver onde ele está guardado.',
      ],
      bulletsTitle: 'Como jogar',
      bullets: [
        'Toque em {goal} blocos livres para salvar o arquivo A.',
        'Toque no nome "A" na tabela para achá-lo de novo.',
      ],
      goal: 'Salve o arquivo A ({goal} blocos) e ache-o na tabela',
      real: 'Todo disco guarda uma tabela assim: no Windows é a FAT/NTFS, no Linux é o ext4.',
      learn: 'Um arquivo vira blocos numa grade, listados por nome numa tabela.',
      tip: 'Toque em blocos livres até completar o tamanho pedido.',
    },
    'nivel-1': {
      title: 'Fase 1',
      teaser: 'Apagar um arquivo libera espaço para reaproveitar.',
      intro: [
        'Agora os pedidos alternam entre salvar e apagar. Apagar um arquivo libera os blocos dele para o próximo.',
      ],
      bulletsTitle: 'Objetivo',
      bullets: ['Complete {goal} operações (salvar/apagar) sem faltar espaço no disco.'],
      goal: 'Complete {goal} operações',
      goalUntimed: 'Complete {goal} operações, sem pressa',
      real: 'Apagar um arquivo não some com ele de verdade — só libera o espaço dos blocos para reuso.',
      learn: 'Apagar libera blocos, que voltam a ficar livres para o próximo arquivo.',
      tip: 'O disco ficou sem buraco grande o bastante. Apagar um arquivo que você não precisa mais libera espaço pra reaproveitar.',
    },
    'nivel-2': {
      title: 'Fase 2',
      teaser: 'Quando um arquivo não cabe inteiro num só lugar.',
      intro: [
        'Alguns blocos já estão ocupados por arquivos do sistema (fixos). Quando não há um buraco contínuo grande o bastante, o arquivo se divide — e tudo bem: a tabela segue o rastro com "continua no bloco X".',
      ],
      bulletsTitle: 'Objetivo',
      bullets: ['Complete {goal} operações, aceitando quando o jogo fragmentar um arquivo.'],
      goal: 'Complete {goal} operações',
      goalUntimed: 'Complete {goal} operações, sem pressa',
      real: 'Fragmentar é normal: todo disco cheio acumula arquivos espalhados em pedaços.',
      learn: 'Fragmentação é um arquivo dividido em pedaços, ligados pela tabela.',
      tip: 'Fragmentar não é um erro — é só o arquivo seguindo em outro bloco. Olha o elo "continua no bloco X" pra achar o resto dele.',
    },
    'nivel-3': {
      title: 'Fase 3',
      teaser: 'No HD, a cabeça de leitura se move — e isso custa tempo.',
      intro: [
        'Esta fase tem um relógio: cada bloco tocado custa tempo. No HD, uma cabeça de leitura precisa se deslocar até cada bloco. No SSD não — você pode alternar e comparar.',
      ],
      bulletsTitle: 'Objetivo',
      bullets: ['Complete {goal} operações no HD com tempo total dentro do limite.'],
      goal: 'Complete {goal} operações, tempo total até {time}',
      goalUntimed:
        'Complete {goal} operações, tempo total até {time}. Sem relógio: só o custo do disco conta.',
      real: 'Um SSD consegue ser 10 a 100 vezes mais rápido que um HD em acessos espalhados.',
      learn: 'No HD, blocos distantes custam mais tempo; no SSD, a posição não importa.',
      tip: 'No HD, a cabeça de leitura precisa se deslocar até cada bloco — quanto mais longe e mais espalhado, mais tempo custa. Tenta deixar os blocos de um arquivo próximos.',
    },
    'nivel-4': {
      title: 'Fase 4',
      teaser: 'Desfragmentar organiza o disco de novo.',
      intro: [
        '"Desfragmentar" junta os pedaços espalhados no início do disco. Custa uma pausa, mas depois a cabeça de leitura anda bem menos.',
      ],
      bulletsTitle: 'Objetivo',
      bullets: [
        'Use "Desfragmentar" ao menos 1 vez e complete {goal} operações no HD com tempo total até {time}.',
      ],
      goal: 'Desfragmente e complete {goal} operações, tempo total até {time}',
      goalUntimed:
        'Desfragmente e complete {goal} operações, tempo total até {time}. Sem relógio: só o custo do disco conta.',
      real: 'Desfragmentar foi manutenção comum em HDs antigos; em SSDs quase não ajuda.',
      learn: 'Desfragmentar reorganiza os arquivos, sem criar espaço novo nem mudar o conteúdo.',
      tip: 'Desfragmentar junta os pedaços espalhados lá no início do disco — depois disso, a cabeça de leitura anda bem menos.',
    },
  },
  connection:
    'Arquivos, memória e CPU prontos. Quem decide quem usa a CPU quando tudo quer rodar ao mesmo tempo? Próxima estação: os núcleos.',
  finale: {
    title: 'Estação concluída!',
    intro: 'Você guardou, apagou e reorganizou arquivos num disco cheio de blocos.',
    bullets: [
      'Um arquivo vira blocos numa grade, listados por nome numa tabela.',
      'Apagar libera blocos para reuso; sem buraco grande o bastante, o arquivo fragmenta.',
      'No HD, blocos espalhados custam tempo de deslocamento; no SSD, não.',
      'Desfragmentar reorganiza os blocos, sem criar espaço nem mudar o conteúdo.',
    ],
    extraTitle: 'Curiosidade',
    extra: 'Um SSD não tem peça se movendo — por isso aguenta ser desligado e sacudido sem medo.',
  },
}

export const CARDS: readonly ConceptCard[] = [
  {
    id: 'filesystem',
    title: 'A tabela que lembra onde está tudo',
    term: 'Sistema de arquivos',
    summary: 'A lista que liga o nome de cada arquivo aos blocos do disco onde ele está guardado.',
    analogy: 'O índice de uma biblioteca, que diz a estante e a prateleira de cada livro.',
    realWorld: 'Sem essa tabela, o disco seria só um amontoado de blocos sem nome.',
    icon: 'storage',
  },
  {
    id: 'fragmentation',
    title: 'Quando o arquivo se espalha',
    term: 'Fragmentação',
    summary:
      'Acontece quando não há um buraco contínuo grande o bastante, e o arquivo é dividido em pedaços espalhados pelo disco.',
    analogy:
      'Mudar de casa e não ter uma caixa grande — você distribui as coisas em várias caixas pequenas, numeradas.',
    realWorld:
      'Desfragmentar foi uma manutenção comum em HDs antigos; em SSDs ela quase não ajuda, porque o custo de posição não existe.',
    icon: 'info',
  },
  {
    id: 'hd-ssd',
    title: 'Agulha que se move × memória instantânea',
    term: 'HD × SSD',
    summary:
      'O HD tem uma cabeça de leitura física que se move sobre discos giratórios; o SSD lê qualquer bloco direto, sem peça se movendo.',
    analogy:
      'Procurar uma música tocando o disco de vinil até o ponto certo (HD) contra apertar um botão num tocador digital (SSD).',
    realWorld:
      'Um SSD consegue ser 10 a 100 vezes mais rápido que um HD em acessos espalhados, exatamente por não depender de posição.',
    icon: 'storage',
  },
]

/** Falas passageiras do Kernel durante a partida. */
export const KERNEL = {
  start: 'Toque no pedido e depois nos blocos livres.',
  fragmented: 'Esse arquivo se espalhou — segue o elo "continua no bloco {n}".',
  defragUsed: 'Desfragmentado! Os arquivos agora ficam juntinhos no início do disco.',
  noSpace: 'Faltou um buraco grande o bastante. Apague algo que não precisa mais.',
}

/** Texto de cada etapa guiada do tutorial, além de `COPY.phases`. */
export const TUTORIAL_STEPS: Record<string, string> = {
  save: 'Toque no pedido e depois em {goal} blocos livres para salvar o arquivo A.',
  search: 'Agora toque no nome "A" na tabela de arquivos para achá-lo de novo.',
}

/** Textos de interface que não são "fala do Kernel" nem texto de fase. */
export const UI = {
  speakerRole: 'o guia do disco',
  pending: {
    save: 'Salvar arquivo {file} — {size} blocos',
    delete: 'Apagar arquivo {file}',
    none: 'Todas as operações concluídas',
  },
  table: {
    title: 'Tabela de arquivos',
    empty: 'Nenhum arquivo salvo ainda.',
    size: '{size} blocos',
    fragmented: 'fragmentado',
    delete: 'Apagar {file}',
    confirmDelete: 'Confirmar: apagar o arquivo {file}?',
    cancel: 'Cancelar',
  },
  disk: {
    title: 'Disco',
    blockFree: 'Bloco {n}, livre',
    blockSystem: 'Bloco {n}, arquivo do sistema',
    blockFile: 'Bloco {n}, arquivo {file}',
    blockFilePart: 'Bloco {n}, arquivo {file}, parte {part} de {total}',
    blockSelected: 'Bloco {n}, selecionado para o arquivo {file}',
    continuesAt: 'continua no bloco {n}',
  },
  device: {
    label: 'Dispositivo',
    hd: 'HD',
    ssd: 'SSD',
  },
  defrag: {
    button: 'Desfragmentar',
    used: 'Desfragmentado {n}×',
  },
  stats: {
    ops: 'Operações',
    time: 'Tempo',
    noSpace: 'Sem espaço',
  },
  announce: {
    saved: 'Arquivo {file} salvo.',
    fragmented: 'Arquivo {file} fragmentado em {n} pedaços.',
    deleted: 'Arquivo {file} apagado.',
    noSpace: 'Sem espaço suficiente.',
    defragmented: 'Disco desfragmentado.',
  },
  fail: {
    space: {
      title: 'Sem espaço no disco',
      reason: 'O disco encheu sem espaço pro próximo arquivo.',
    },
    time: {
      title: 'Tempo do HD esgotado',
      reason: 'O tempo total passou do limite — ou faltou desfragmentar.',
    },
  },
  blockLabel: 'Bloco {n}',
}
