# Design doc: Armazenamento (`storage`)

## Objetivo didático

Depois de jogar, o jogador entende que um arquivo não precisa ficar guardado num só pedaço
contínuo do disco: ele é dividido em **blocos**, listados numa **tabela de arquivos**, e que
quando os buracos livres ficam pequenos e espalhados (**fragmentação**) os arquivos se espalham
também — o que custa tempo real num HD (cabeça de leitura se movendo) e quase nada num SSD
(acesso direto a qualquer bloco).

## Mecânica principal

O disco é uma grade de blocos numerados (6×4 = 24 blocos). O jogador **salva** arquivos (cada um
com um tamanho em blocos, mostrado no pedido) tocando em blocos livres suficientes, na ordem que
quiser — se não houver um buraco contíguo grande o bastante, o próprio jogo mostra o arquivo se
dividindo (fragmentação) com uma seta/elo ligando "continua no bloco X" entre os pedaços. O
jogador também **apaga** arquivos (tocando no nome dele na tabela, depois confirmando), liberando
os blocos para reaproveitar depois, e **procura** arquivos pela tabela (tocar no nome destaca os
blocos dele no disco, inclusive os pedaços fragmentados).

Só toque e teclado (Tab percorre a tabela de arquivos e depois a grade de blocos; Enter
confirma); sem arraste, sem kit `src/ui/dnd`.

## O que cada fase ensina

| Fase     | Ideia nova                                                  | Como vencer                                               | Como perder                                       |
| -------- | -------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------ |
| Tutorial | Salvar e a tabela de arquivos                                  | Salvar 1 arquivo de 3 blocos e achá-lo de novo pela tabela    | (nunca)                                               |
| Fase 1   | Apagar e reaproveitar buracos                                  | Salvar e apagar até completar 6 operações, sem faltar espaço | o disco enche sem espaço pro próximo arquivo pedido (3 vezes) |
| Fase 2   | Fragmentação: "continua no bloco X"                             | Completar 6 operações, aceitando quando o jogo fragmenta um arquivo | igual à Fase 1                                        |
| Fase 3   | HD × SSD: no HD, a cabeça de leitura se move e isso custa tempo | Completar 6 operações num HD com tempo total abaixo da meta  | tempo total do HD passa do limite                       |
| Fase 4   | Desfragmentar                                                   | Usar "Desfragmentar" pelo menos 1 vez e completar 6 operações no HD com tempo total melhor que a Fase 3 | tempo total do HD passa do limite, mesmo após desfragmentar |

Detalhes de cada fase:

- **Tutorial** — disco pequeno visível (as mesmas 24 células, mas só 1 pedido), sem relógio.
  Etapas guiadas: `select` (tocar o pedido "salvar arquivo A, 3 blocos"), `place` (tocar 3 blocos
  livres em sequência), `select`/`place` (tocar o nome "A" na tabela, depois ver os blocos dele
  destacados).
- **Fase 1** — disco de 24 blocos, 6 operações alternando `salvar`/`apagar` de arquivos de 2 a 5
  blocos; o texto do pedido sempre mostra o tamanho. Sem relógio ainda (a ideia nova é espacial,
  não de tempo); derrota só por falta de espaço.
- **Fase 2** — mesmo disco, mas os buracos livres já chegam pré-fragmentados em pedaços pequenos
  (preenchidos por "arquivos do sistema" fixos, não removíveis) para forçar pelo menos 2
  fragmentações ao longo das 6 operações; cada pedaço fragmentado mostra um ícone de elo e o
  texto "continua no bloco {n}".
- **Fase 3** — introduz o seletor `HD`/`SSD` (começa em HD): ao confirmar cada operação, uma
  "cabeça de leitura" anima se deslocando pelos blocos tocados em ordem (custo de tempo
  proporcional à distância total percorrida); no SSD (o jogador pode alternar e comparar) o
  mesmo conjunto de operações custa um tempo fixo pequeno por bloco, não importa a posição. A
  meta de vitória é sobre o modo HD.
- **Fase 4** — adiciona o botão "Desfragmentar" (custa uma pausa de ~2s, sem penalidade de
  pontos): compacta todos os arquivos ocupados para o início do disco, juntando os pedaços
  fragmentados num só; depois disso, as próximas operações no HD custam menos tempo de cabeça de
  leitura. A meta exige ao menos 1 uso da ferramenta.

## Falas do Kernel

- Abertura:
  1. "A RAM esquece tudo quando a energia cai — mas e o que você quer guardar de verdade?"
  2. "Esse é o trabalho do **armazenamento**: um disco cheio de blocos numerados, com uma
     **tabela** que lembra onde cada arquivo está."
  3. "Vamos salvar, apagar e reaproveitar espaço. De vez em quando, um arquivo não cabe inteiro
     num só lugar — e tudo bem, a tabela sabe seguir o rastro dele."
- Dica (por fase, ao perder):
  - Fase 1: "O disco ficou sem buraco grande o bastante. Apagar um arquivo que você não precisa
    mais libera espaço pra reaproveitar."
  - Fase 2: "Fragmentar não é um erro — é só o arquivo seguindo em outro bloco. Olha o elo
    '`continua no bloco X`' pra achar o resto dele."
  - Fase 3: "No HD, a cabeça de leitura precisa se deslocar até cada bloco — quanto mais longe e
    mais espalhado, mais tempo custa. Tenta deixar os blocos de um arquivo próximos."
  - Fase 4: "Desfragmentar junta os pedaços espalhados lá no início do disco — depois disso, a
    cabeça de leitura anda bem menos."
- Conexão com a próxima estação: "Arquivos, memória e CPU prontos. Quem decide quem usa a CPU
  quando tudo quer rodar ao mesmo tempo? Próxima estação: os núcleos." (estação `cores`, já
  existente — o jogador pode já tê-la jogado antes, já que a progressão é "linear, com
  exceção"; a fala funciona nos dois sentidos.)

## Card de conceito

- `unlocksCard: 'filesystem'` no Tutorial:
  - título "A tabela que lembra onde está tudo", termo técnico "Sistema de arquivos", resumo "A
    lista que liga o nome de cada arquivo aos blocos do disco onde ele está guardado", analogia
    "o índice de uma biblioteca, que diz a estante e a prateleira de cada livro", fato real
    "sem essa tabela, o disco seria só um amontoado de blocos sem nome", ícone `'storage'` (já
    existe em `src/ui/icons.tsx`).
- `unlocksCard: 'fragmentation'` na Fase 2:
  - título "Quando o arquivo se espalha", termo técnico "Fragmentação", resumo "Acontece quando
    não há um buraco contínuo grande o bastante, e o arquivo é dividido em pedaços espalhados
    pelo disco", analogia "mudar de casa e não ter uma caixa grande — você distribui as coisas
    em várias caixas pequenas, numeradas", fato real "desfragmentar foi uma manutenção comum em
    HDs antigos; em SSDs ela quase não ajuda, porque o custo de posição não existe", ícone
    `'info'`.
- `unlocksCard: 'hd-ssd'` na Fase 3:
  - título "Agulha que se move × memória instantânea", termo técnico "HD × SSD", resumo "O HD
    tem uma cabeça de leitura física que se move sobre discos giratórios; o SSD lê qualquer
    bloco direto, sem peça se movendo", analogia "procurar uma música tocando o disco de vinil
    até o ponto certo (HD) contra apertar um botão num tocador digital (SSD)", fato real "um SSD
    consegue ser 10 a 100 vezes mais rápido que um HD em acessos espalhados, exatamente por não
    depender de posição", ícone `'storage'`.

## Layout mobile e desktop

```
celular em pé                        desktop / tablet deitado
┌──────────────────────┐             ┌──────────────────────────────────────┐
│ nível           ctrl │             │ nível                [HD|SSD]   ctrl  │
├──────────────────────┤             ├───────────┬────────────────────────────┤
│        HUD             │             │   HUD      │                             │
├──────────────────────┤             │  tabela de │                             │
│   pedido atual          │             │  arquivos  │     disco                   │
├──────────────────────┤             │  (lista)   │     (grade 6×4 de blocos)    │
│   [HD|SSD] (fase 3+)    │             │            │                             │
├──────────────────────┤             │ [Desfrag.] │                             │
│   tabela de arquivos    │             │ (fase 4+)  │                             │
│   (lista rolável)       │             ├───────────┴────────────────────────────┤
├──────────────────────┤             │              narrador                   │
│   disco (grade 4×6)     │             └──────────────────────────────────────┘
├──────────────────────┤
│      narrador           │
└──────────────────────┘
```

No celular em pé, a grade do disco gira para 4 colunas × 6 linhas (em vez de 6×4) para caber na
largura sem rolagem horizontal, mantendo blocos de pelo menos 44×44px; a numeração dos blocos
segue a ordem de leitura (linha a linha), igual nos dois layouts, para a cabeça de leitura da
Fase 3 fazer sentido visual em ambos.

## Contrato de dados das fases

```ts
export interface StorageOperation {
  kind: 'save' | 'delete'
  fileId: string
  /** Só para `save`. */
  sizeBlocks?: number
}

export interface StoragePhase extends PhaseBase {
  diskBlocks: number
  columns: number
  /** Sequência fixa de operações pedidas na fase (determinística, sem sorteio). */
  operations: readonly StorageOperation[]
  /** Blocos pré-ocupados por "arquivos do sistema" fixos, para forçar fragmentação (fase 2+). */
  reservedBlocks: readonly number[]
  deviceModes: readonly ('hd' | 'ssd')[]
  /** Custo de tempo (unidades de pontuação) por bloco de deslocamento da cabeça, só no HD. */
  hdSeekCostPerBlock: number
  /** Custo de tempo fixo por bloco acessado, em qualquer dispositivo. */
  baseCostPerBlock: number
  maxTotalTime?: number
  defragAvailable: boolean
  /** Fase 4: exige ao menos 1 uso para vencer. */
  requireDefrag: boolean
  stars: { metric: 'timeLeft' | 'opsLeft'; thresholds: readonly [number, number] }
}
```

`goalValues(phase, { difficulty, untimed })` devolve `{ goal: phase.operations.length, time:
phase.maxTotalTime ?? 0 }`.

## Regras puras a testar

- `allocate(state, fileId, sizeBlocks)` — primeiro-ajuste (first-fit): percorre os blocos livres
  em ordem e usa o primeiro buraco contíguo grande o bastante; se nenhum buraco único basta,
  preenche com os buracos livres disponíveis em ordem (fragmentando) e devolve um evento
  `'fragmented'` com a lista de trechos; se não há blocos livres suficientes no total, devolve
  `'no-space'` sem alterar o estado.
- `free(state, fileId)` — libera todos os blocos (inclusive fragmentados) do arquivo e remove da
  tabela; teste confirma que os blocos voltam a `null` e podem ser reaproveitados por um
  `allocate` seguinte.
- `seekCost(blocksInOrder, device)` — soma as distâncias entre blocos consecutivos tocados
  (`|b[i] - b[i-1]|`) vezes `hdSeekCostPerBlock` para `'hd'`; devolve só
  `baseCostPerBlock * blocksInOrder.length` para `'ssd'` (sem custo de posição) — teste cobre os
  dois modos com a mesma sequência de blocos, confirmando que o HD custa mais quando os blocos
  estão espalhados e o SSD não muda.
- `defragment(state)` — reescreve a tabela de arquivos compactando-os a partir do bloco 0, na
  ordem em que foram criados, sem fragmentação; teste confirma que todo arquivo passa a ocupar
  um único trecho contíguo e que o conteúdo (tamanho, id) não muda.
- `applyOperation(state, operation, device, blocksChosenByPlayer?)` — função de alto nível que
  chama `allocate`/`free` e `seekCost`, acumula o tempo total e avança o progresso da fase.
- `computeOutcome(state)` — vitória quando todas as `operations` da fase são concluídas dentro de
  `maxTotalTime` (quando a fase define um) e, na Fase 4, com `defragUsed >= 1` se
  `requireDefrag`; derrota por falta de espaço repetida (Fases 1–2) ou tempo total excedido
  (Fases 3–4); estrelas por tempo restante ou operações restantes, sempre ≥ 1 em vitória.
- Determinismo: como `operations` é fixo por fase (sem sorteio), o teste de determinismo é que a
  mesma sequência de escolhas de blocos do jogador sempre produz o mesmo layout final do disco e
  o mesmo tempo total.

## Riscos

- **Fragmentação parecer "coisa errada" em vez de um evento normal do disco:** a fala do Kernel
  e o texto da Fase 2 tratam fragmentar como esperado, não como falha; só o tempo de acesso no HD
  (Fase 3) transforma isso num custo visível a reduzir.
- **A analogia HD × SSD depender de "sentir" velocidade, que é difícil de perceber num jogo sem
  tempo real de disco físico:** o número de "tempo total" é mostrado explicitamente no HUD e
  comparado lado a lado (o jogador pode alternar `HD`/`SSD` com as mesmas operações para ver a
  diferença, antes mesmo de a Fase 3 cobrar uma meta).
- **Grade de 24 blocos ficar pequena demais no celular em pé:** a reorganização para 4×6 (seção
  "Layout") garante blocos de 44px; se ainda assim ficar apertado, a alternativa é reduzir
  `diskBlocks` para 16 (4×4) nas fases iniciais — decisão a confirmar durante a implementação,
  sem mudar o contrato de dados (`diskBlocks` já é parametrizável por fase).
- **Desfragmentar (Fase 4) parecer uma ferramenta "mágica" sem custo:** ela pausa ~2s (custo de
  tempo, não zero) e só reorganiza — não cria espaço novo nem muda o conteúdo dos arquivos,
  reforçado no texto da fase.
- **Acessibilidade:** bloco livre/ocupado/fragmentado nunca só por cor — usar padrão de
  preenchimento (tracejado para "parte de um arquivo fragmentado") e texto no `aria-label` de
  cada bloco (ex.: "Bloco 7, arquivo A, parte 2 de 2").
