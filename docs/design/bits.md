# Design doc: Bits (Interruptores) (`bits`)

## Objetivo didático

Tudo que um computador guarda ou processa é, no fundo, uma fileira de 0s e 1s. O jogador sai
sabendo **ler e escrever números em binário** (posicional, base 2) e entendendo que texto e
imagem também são só números interpretados de um jeito diferente.

## Mecânica principal

Tocar. Uma fileira de interruptores (bits), cada um com dois estados (apagado/aceso = 0/1). O
jogador toca num interruptor para alternar o estado e vê, em tempo real, o número que a fileira
representa. Um painel mostra um alvo (um número, uma letra ou um desenho) e o jogador ajusta os
interruptores até o valor bater. Sem arraste — só toque/clique/teclado, por isso não usa o kit
`src/ui/dnd`.

Teclado: `Tab` percorre os interruptores da esquerda (bit mais significativo) para a direita;
`Enter`/`Espaço` alternam o interruptore focado; `Setas` também movem o foco entre interruptores
sem alternar. Anúncio de leitor de tela a cada alternância: "bit 3, valor 8, ligado".

## O que cada fase ensina

| Fase     | Ideia nova                                                                 | Como vencer                                        | Como perder |
| -------- | --------------------------------------------------------------------------- | --------------------------------------------------- | ------------ |
| Tutorial | 1 interruptor = 2 estados. O Kernel pede para ligar e depois desligar.      | Seguir as 2 instruções guiadas.                      | (nunca)      |
| Fase 1   | 4 bits contam de 0 a 15; cada casa tem um valor fixo (1, 2, 4, 8), visível sob o interruptor. | Formar 6 números-alvo sorteados entre 0 e 15, um atrás do outro. | Time-out acumulado (ver `goalValues`) |
| Fase 2   | 8 bits, números de 0 a 255, ainda com o valor da casa visível.             | Formar 6 números-alvo entre 0 e 255.                 | Time-out     |
| Fase 3   | Sem cola: os valores das casas somem; o jogador soma de cabeça (1,2,4,8,16,32,64,128). Bônus de pontos por fechar o número no menor número de toques possível (sem "passar" por um valor e voltar). | Formar 5 números-alvo entre 0 e 255 sem ver o valor das casas. | Time-out     |
| Fase 4   | Letras: uma tabela de código reduzida (8 letras, código de 5 bits, link no card "Código de caractere") substitui o número-alvo; o jogador forma uma palavra curta (3 a 4 letras) bit a bit, letra por letra. | Formar a palavra-alvo completa. | Time-out     |
| Fase 5   | Imagem: uma grade 8×8 de bits (64 interruptores, em grade, não em fileira) vira um desenho simples (carinha, seta, coração) quando os bits "1" ficam pretos e os "0" ficam brancos — 1 bit = 1 pixel. | Reproduzir o desenho-alvo mostrado ao lado, bit a bit. | Time-out     |

Cinco fases além do tutorial (dentro do intervalo de 3 a 5 do README se consideramos 3-5 "fases
principais"; aqui avisamos o risco abaixo, já que o rascunho previa 4 fases + tutorial). Ver
seção **Riscos**.

Modo sem tempo: desliga o cronômetro; a meta passa a ser "sem erro grosseiro" — a Fase 3 (sem
cola) é a única em que existe "erro" fora do tempo (passar do valor e precisar desfazer), e nesse
modo as estrelas vêm da eficiência de toques (ver **Regras puras a testar**).

## Falas do Kernel

- Abertura:
  1. "Oi! Eu sou o **Kernel**. Todo computador, por dentro, só entende duas coisas: **ligado** e
     **desligado**."
  2. "Cada interruptor desses é um **bit**. Um sozinho conta até 1. Juntos, eles contam **muito**
     mais longe."
  3. "Vamos ligar o primeiro?"
- Dica (por fase):
  - Fase 1: "Cada casa vale o dobro da anterior: 1, 2, 4, 8… Some só as casas **ligadas**."
  - Fase 2: "Oito interruptores já chegam a 255. Olhe o valor embaixo de cada um e some."
  - Fase 3: "Sem cola agora! Lembre: 1, 2, 4, 8, 16, 32, 64, 128. Comece pela casa mais alta que
    ainda cabe no número."
  - Fase 4: "Cada letra tem o próprio código em binário, igual um número. Confira na tabela."
  - Fase 5: "Pense nos bits como pixels: 1 pinta, 0 deixa em branco. Vá linha por linha."
- Conexão com a próxima estação: "Interruptores guardam **0** e **1**. Mas para **decidir** com
  eles — tipo 'se os dois estiverem ligados, faça algo' — a gente combina interruptores de um
  jeito especial: são as **portas lógicas**."

## Card de conceito

1. `bit-byte` — "Bit e byte" / termo técnico **Bit e byte** / resumo: "Um bit é um interruptor:
   0 ou 1. Oito bits juntos formam um **byte**, que já conta de 0 a 255." / analogia: "Como um
   interruptor de luz: ou está apagado, ou está aceso — nunca os dois." / mundo real: "O tamanho
   de um arquivo (KB, MB, GB) é sempre medido em bytes." / ícone `binary`. Liberado na **Fase 2**
   (primeira vez que 8 bits aparecem juntos).
2. `codigo-caractere` — "Código de caractere" / termo técnico **ASCII/Unicode** / resumo: "Letras
   também são números: cada caractere tem um código binário combinado entre todos os
   computadores." / analogia: "Como uma tabela de bandeiras: cada uma representa um país
   combinado antes." / mundo real: "É por isso que um emoji vira '???' quando o programa não
   conhece o código certo." / ícone `letter`. Liberado na **Fase 4**.

## Layout mobile e desktop

```
celular em pé                     desktop / tablet deitado
┌────────────────────┐            ┌──────────────────────────────────┐
│ nível         ctrl  │            │ nível                      ctrl  │
├────────────────────┤            ├───────────┬────────────────────-─┤
│  alvo: 182          │            │  HUD      │     alvo: 182        │
├────────────────────┤            │ (acertos, │  ┌──┐┌──┐┌──┐┌──┐    │
│ [1][0][1][1][0][1] │            │  tempo)   │  │1 ││0 ││1 ││1 │…   │
│  128 64 32 16 8 4  │            │           │  └──┘└──┘└──┘└──┘    │
│  = 182              │            │           │   128 64 32 16 …     │
├────────────────────┤            │           │   soma = 182          │
│      narrador       │            ├───────────┴────────────────────-─┤
└────────────────────┘            │          narrador                │
                                   └──────────────────────────────────┘
```

Celular deitado: mesma ordem do celular em pé, mas o painel de alvo e a fileira de interruptores
ficam lado a lado (fileira à direita) para caber na altura de 375–400px. Na Fase 5 (grade 8×8), a
grade some com a fileira única — ela ocupa o espaço do campo (`children` do `GameFrame`) como um
grid `8x8` que se adapta a `compact`/`roomy`: cada célula é um botão de 44px mínimo mesmo em
`compact`, rolando a página verticalmente se necessário (sem rolagem horizontal).

## Contrato de dados das fases

```ts
export type BitsTargetKind = 'number' | 'letters' | 'image'

export interface BitsPhase extends PhaseBase {
  /** Quantos interruptores a fileira tem (4, 8 ou 64 na Fase 5, em grade 8x8). */
  bitCount: 4 | 8 | 64
  /** Fase 5 usa grade 8x8 em vez de fileira única. */
  layout: 'row' | 'grid'
  /** Fases 1 e 2 mostram o valor de cada casa; Fases 3, 4 e 5 escondem. */
  showPlaceValues: boolean
  /** Tipo de alvo desta fase. */
  targetKind: BitsTargetKind
  /** Quantos alvos sorteados o jogador precisa acertar para vencer a fase. */
  targetCount: number
  /** Segundos por alvo, usado para o relógio e para a meta de tempo. */
  secondsPerTarget: number
  /** Só para `targetKind: 'letters'`: o alfabeto reduzido disponível (índice = código). */
  alphabet?: readonly string[]
  /** Só para `targetKind: 'image'`: os desenhos possíveis, cada um como 64 bits (0|1). */
  images?: readonly (readonly (0 | 1)[])[]
}
```

`goalValues(phase, { difficulty, untimed })` devolve:

- `goal`: `phase.targetCount` (ajustado -1 no fácil, +1 no difícil, fora do tutorial);
- `time`: `phase.targetCount * phase.secondsPerTarget`, ajustado pela dificuldade (fácil: ×1.3;
  difícil: ×0.8); omitido/ignorado se `untimed`.

Contrato do módulo compartilhado `src/games/shared/binary/` (criado por esta estação; outras
estações — Memória para endereços binários, Portas lógicas e ULA para operandos — só importam,
nunca editam):

```ts
// src/games/shared/binary/convert.ts

/** Converte um inteiro não-negativo para um array de bits (MSB primeiro). */
export function toBits(value: number, bitCount: number): readonly (0 | 1)[]

/** Converte um array de bits (MSB primeiro) para o inteiro que ele representa. */
export function fromBits(bits: readonly (0 | 1)[]): number

/** Valor decimal da casa `index` (0 = bit mais significativo) numa fileira de `bitCount` bits. */
export function placeValue(index: number, bitCount: number): number

/** Formata um número em binário com espaçamento a cada 4 bits, para exibição ("1011 0110"). */
export function formatBinary(value: number, bitCount: number): string

// src/games/shared/binary/BitSwitch.tsx

export interface BitSwitchProps {
  /** 0 ou 1. */
  value: 0 | 1
  /** Valor decimal da casa, exibido abaixo quando `showPlaceValue` é true. */
  placeValue?: number
  showPlaceValue?: boolean
  /** Rótulo acessível completo, ex. "bit 3 de 8, valor 8, ligado". */
  label: string
  disabled?: boolean
  onToggle: () => void
}

/**
 * Interruptor acessível: <button role="switch" aria-checked={value === 1}
 * aria-label={label}>. Alvo de toque mínimo 44x44px. Foco visível (outline),
 * navegável por Tab, ativa com Enter/Espaço (comportamento nativo de <button>).
 * Nunca comunica o estado só pela cor: usa também um ícone (lâmpada
 * apagada/aceso) e o texto "0"/"1" dentro do botão.
 */
export function BitSwitch(props: BitSwitchProps): JSX.Element

// src/games/shared/binary/BitRow.tsx

export interface BitRowProps {
  bits: readonly (0 | 1)[]
  showPlaceValues?: boolean
  disabled?: boolean
  onChange: (index: number, next: 0 | 1) => void
  /** Prefixo para os rótulos acessíveis de cada bit, ex. "Interruptor". */
  labelPrefix?: string
}

/** Fileira de BitSwitch com gerenciamento de foco por teclado (setas movem o foco). */
export function BitRow(props: BitRowProps): JSX.Element
```

A Fase 5 (grade 8×8) usa `BitSwitch` diretamente numa grade CSS própria da cena de `bits`, não um
novo componente do módulo compartilhado (o encaixe em grade é específico dessa fase).

## Regras puras a testar

`src/games/bits/logic/rules.ts`, estado → estado com eventos, sem React:

- `toggleBit(state, index)`: alterna o bit `index`, devolve novo estado com `bits` atualizado e
  evento `{ type: 'toggled', index, value }`.
- `checkTarget(state)`: compara `fromBits(state.bits)` (ou, para `letters`/`image`, o valor
  bit a bit) com o alvo atual; devolve `{ type: 'matched' }` ou `{ type: 'mismatch' }`.
- `nextTarget(state, seed)`: sorteia o próximo alvo com `engine/random.ts` (determinístico pela
  semente), devolve novo estado e `{ type: 'advanced', target }`.
- `countToggles(session)`: conta toques desde o início do alvo atual, para o bônus de eficiência
  da Fase 3 (mínimo teórico = número de bits ligados no alvo; qualquer toque extra é "desfazer").

Casos de teste:

- `toBits`/`fromBits` são inversas para todo valor de 0 a 2^bitCount - 1 (teste de propriedade com
  alguns valores fixos: 0, 1, 170, 255).
- `placeValue(0, 8) === 128`, `placeValue(7, 8) === 1`.
- Vitória: acertar `targetCount` alvos sem exceder o tempo da fase.
- Derrota: tempo zera antes do `targetCount`-ésimo acerto (fases 1 a 5; nunca no tutorial).
- Estrelas: tempo restante ≥ 30% → 3 estrelas; ≥ 12% → 2; vitória simples → 1 (replica a fórmula
  de Núcleos fase 1, já combinada em `DECISIONS.md`).
- Determinismo: duas sessões com a mesma semente geram a mesma sequência de alvos sorteados.
- `nextTarget` nunca repete o alvo imediatamente anterior (evita "o mesmo número de novo").

## Riscos

- **Risco de escopo:** o rascunho do planejamento previa 4 fases; este doc detalha para 5 (F1
  valor-das-casas, F2 8 bits, F3 sem cola, F4 letras, F5 imagem) porque "8 bits sem cola" e "8
  bits com cola" são ideias didáticas distintas o bastante para não caber numa fase só. Se o dono
  do projeto preferir manter 4 fases, a fusão recomendada é juntar F1+F2 (ir direto para 8 bits
  com cola) — revisar antes da implementação.
- **Mecânica confusa na Fase 3 (sem cola):** sem o valor da casa visível, o jogador pode travar.
  Mitigação: a dica do Kernel sempre lista os valores das casas por extenso; considerar um botão
  "lembrar os valores" com custo de pontos (não de vida).
- **Acessibilidade na Fase 5 (grade 64 bits):** uma grade grande em celular pode exigir rolagem
  vertical dentro do campo — aceitável (só rolagem horizontal é proibida), mas o alvo de 44px por
  célula em 8 colunas exige ao menos ~352px de largura útil; testar em 320px (iPhone SE antigo) e,
  se necessário, permitir zoom da grade sem zoom da página.
- **Ambiguidade de "código de letra":** usar um alfabeto reduzido de 8 letras com código de 5 bits
  (não ASCII real de 7-8 bits) para caber na mecânica de 8 interruptores; o card de conceito deixa
  claro que é uma versão simplificada do ASCII/Unicode real, para não ensinar um código errado
  como se fosse o padrão oficial.
- **Dependência de outras estações:** `shared/binary` é consumido futuramente por Memória (fase
  "endereços em binário") e pela ULA. A interface acima foi desenhada para bastar a esses dois
  casos sem mudança (conversão e exibição); qualquer campo extra necessário deve virar pedido para
  a onda seguinte, não uma edição direta por outro agente.
