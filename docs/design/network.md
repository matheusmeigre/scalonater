# Design doc: Rede (`network`)

## Objetivo didático

Uma mensagem grande não viaja inteira de uma vez: ela é cortada em **pacotes numerados**,
cada um com o endereço do destino, e cada pacote pode seguir um caminho diferente até
chegar — por isso é preciso **remontar na ordem certa**, não na ordem de chegada. Pacotes
podem se perder no caminho, então a rede **confirma** e **reenvia**. E antes de mandar
qualquer coisa, um nome como "escola.com" precisa virar um endereço, pelo DNS.

## Mecânica principal

Verbo central: **tocar → tocar** (tocar no pacote, depois tocar no roteador por onde ele deve
seguir), com arrastar como alternativa (arrastar o pacote até o roteador), usando o kit
`src/ui/dnd`. Nenhuma fase depende de arrastar.

Loop básico (a partir da F1):

1. Uma mensagem chega dividida em pacotes numerados (`#1`, `#2`, `#3`...), cada um mostrando
   o endereço de destino.
2. Os pacotes aparecem numa "bandeja de saída". O jogador toca num pacote (ele fica
   selecionado, com borda dourada) e depois toca no roteador vizinho por onde ele deve seguir.
3. O pacote anda pela aresta escolhida até o roteador seguinte; de lá, o jogador escolhe o
   próximo salto, até o pacote chegar ao roteador de destino.
4. No destino, os pacotes caem em caixinhas numeradas (1, 2, 3...) **na ordem de chegada**,
   que pode ser diferente da ordem de envio — o jogador não reordena manualmente; o jogo
   mostra visualmente o pacote 3 chegando antes do 2, e a mensagem só fica completa (e
   legível) quando todos os números estão presentes, lidos na ordem correta pela própria
   tela de "mensagem remontada".
5. Vencer = toda a mensagem remontada dentro do tempo (ou sem relógio, com todos os pacotes
   entregues).

## O que cada fase ensina

| Fase                        | Ideia nova                                                                 | Como vencer                                                         | Como perder                                                     |
| ---------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Tutorial                    | Um pacote, um caminho de 2 roteadores, endereço visível                    | Entregar o pacote `#1` guiado passo a passo                            | (nunca)                                                         |
| F1 — Pacotes fora de ordem  | A mensagem vira 3 a 5 pacotes; eles podem chegar fora de ordem              | Entregar `{goal}` mensagens completas em `{time}` s                   | Tempo esgota com mensagem incompleta                            |
| F2 — Rotas congestionadas   | O grafo tem enlaces lentos (fila visível no link); escolher caminho importa | Manter o tempo médio de entrega abaixo do alvo, mesmo com congestion  | Fila de um enlace enche e descarta pacote (perde vida)          |
| F3 — Perda e confirmação    | Pacotes podem se perder; o destino manda confirmação (ACK); sem ACK, reenviar | Entregar `{goal}` mensagens reenviando os pacotes perdidos a tempo    | Um pacote perdido nunca é reenviado antes do fim do tempo        |
| F4 — DNS                    | Antes de enviar, resolver um nome ("escola.com") em um endereço via DNS     | Resolver o nome certo e entregar a mensagem no endereço resolvido      | Enviar para o endereço errado (nome não resolvido corretamente) |

## Falas do Kernel

- **Abertura (3 falas):**
  1. "Lembra das campainhas dos dispositivos? Uma das que mais toca é a placa de rede."
  2. "Mandar uma mensagem grande de uma vez seria arriscado demais. Por isso ela é cortada em
     pacotes — cada um com seu número e seu endereço."
  3. "Cada pacote pode seguir um caminho diferente. No final, a gente remonta tudo na ordem
     certa."
- **Dica por fase (ao perder):**
  - F1: "Olha o número de cada pacote antes de ler a mensagem — eles não combinaram de chegar
    em ordem."
  - F2: "Esse enlace está cheio. Tente outro caminho até o mesmo destino."
  - F3: "Sem confirmação, o pacote some. Se não chegou o 'recebido', manda de novo."
  - F4: "Esse nome ainda não é um endereço. Resolva pelo DNS antes de enviar."
- **Conexão com a próxima estação:** "Você viu cada peça: bits, portas, memória, ciclo, cache,
  disco, núcleos, interrupções e agora a rede. Daqui a pouco, vamos seguir um clique inteiro,
  do mouse até a tela."

## Card de conceito

Três cards, como no rascunho do planejamento — justificado porque a estação introduz três
termos igualmente centrais e independentes (não há como encolher sem perder um conceito core):

1. **"Carta picotada" / Pacote** — liberado na F1 (`unlocksCard: 'packet'`).
   - Resumo: um pedaço numerado de uma mensagem maior, com o endereço de para onde ele vai.
   - Analogia: uma carta grande cortada em várias folhas numeradas, cada uma dentro do seu
     próprio envelope.
   - Mundo real: é por isso que um vídeo pode continuar chegando mesmo se um pedacinho da
     conexão falhar por um instante.
2. **"O cruzamento do caminho" / Roteador** — liberado no tutorial (`unlocksCard: 'router'`).
   - Resumo: um ponto da rede que decide por qual caminho cada pacote segue até o destino.
   - Analogia: um cruzamento com placas, decidindo a rota de cada entregador.
   - Mundo real: entre o seu celular e um site, o pacote passa por vários roteadores.
3. **"Lista telefônica da internet" / DNS** — liberado na F4 (`unlocksCard: 'dns'`).
   - Resumo: o serviço que transforma um nome fácil de lembrar ("site.com") num endereço
     numérico que os roteadores entendem.
   - Analogia: uma lista telefônica — você sabe o nome da pessoa, a lista te dá o número.
   - Mundo real: é por isso que digitar um nome funciona para acessar um site.

## Layout mobile e desktop

```
celular em pé                       desktop / tablet deitado
┌───────────────────────┐           ┌────────────────────────────────────┐
│ Fase: Pacotes fora...   ctrl│      │ Fase: Pacotes fora de ordem   ctrl  │
├───────────────────────┤           ├───────────┬────────────────────────┤
│   HUD (vidas/tempo)    │           │ HUD       │                        │
├───────────────────────┤           │           │   Grafo de roteadores  │
│  Bandeja de saída      │           │ Bandeja   │   (nós e arestas,      │
│  (pacotes #1 #2 #3)    │           │ de saída  │   pacotes em trânsito) │
├───────────────────────┤           │ (vertical)│                        │
│  Grafo de roteadores   │           │           ├────────────────────────┤
│  (rolável lateralmente)│           ├───────────┤  Caixas de chegada     │
├───────────────────────┤           │           │  (mensagem remontada)  │
│  Caixas de chegada     │           ├───────────┴────────────────────────┤
│  (1  2  3)             │           │              narrador              │
├───────────────────────┤           └────────────────────────────────────┘
│      narrador          │
└───────────────────────┘

celular deitado: bandeja de saída e caixas de chegada ficam uma faixa estreita acima e abaixo
do grafo (que ocupa a largura toda), em vez de blocos cheios — o grafo é o elemento que mais
precisa de espaço horizontal.
```

O grafo de roteadores tem no máximo 6 nós visíveis por fase (F2 em diante), desenhado em
coordenadas fixas por fase (não gerado aleatoriamente), para caber sem rolagem em qualquer
tamanho de tela testado. O caminho entre a origem e o destino sempre tem pelo menos duas
rotas possíveis a partir da F2, para a escolha de rota ter sentido.

## Contrato de dados das fases

```ts
export interface RouterNode {
  id: string
  /** Posição relativa (0–1) dentro do campo, para o layout fixo por fase. */
  x: number
  y: number
}

export interface RouterLink {
  from: string
  to: string
  /** Enlaces mais lentos atrasam mais o pacote (usado na F2). */
  latency: number
  /** Fila máxima antes de descartar pacote (F2 em diante). */
  capacity: number
}

export interface NetworkPhase extends PhaseBase {
  nodes: readonly RouterNode[]
  links: readonly RouterLink[]
  origin: string
  destination: string
  /** Quantos pacotes a mensagem é dividida. */
  packetCount: number
  /** Duração em segundos (ignorada no tutorial e no modo sem tempo). */
  duration: number
  goal: number
  /** Chance de um pacote se perder no caminho (liga a confirmação/reenvio, F3). */
  lossChance: number
  /** Liga a etapa de resolução de nome antes do envio (F4). */
  dns: boolean
  stars: { metric: 'timeLeft' | 'hearts' | 'resends'; thresholds: readonly [number, number] }
  tutorial?: TutorialStep[]
}
```

`goalValues` devolve `{ goal }` (mensagens a entregar), `{ time }` (duração ajustada pela
dificuldade) e `{ hearts }`. Em fases sem relógio (tutorial, e qualquer fase no modo sem
tempo), o texto usa `goalUntimed` em vez de `goal`.

## Regras puras a testar

Em `logic/rules.ts`, seguindo o padrão de `games/cores/logic/rules.ts`:

- `splitMessage(message, packetCount, seed)` — divide em pacotes numerados; determinístico.
- `forwardPacket(state, packetId, nextNodeId)` — valida se existe aresta até `nextNodeId`;
  emite `blocked` se a aresta não existe ou o enlace está no limite de `capacity`.
- `tickTransit(state, dt)` — avança pacotes em trânsito conforme `latency` do enlace; emite
  `arrived` quando um pacote chega a um nó.
- `maybeDropPacket(state, packetId, seed)` — aplica `lossChance` (só com F3 ligada); emite
  `lost`.
- `sendAck(state, packetId)` / `resendIfTimeout(state, dt)` — confirmação e reenvio: um pacote
  sem ACK depois de um tempo limite reaparece na bandeja de saída para ser reenviado.
- `resolveDns(state, name)` — só com `dns: true`; traduz o nome para o endereço correto;
  endereço errado emite `wrongAddress` (a mensagem é enviada, mas nunca chega).
- `assembleMessage(state)` — true quando todos os pacotes de uma mensagem chegaram,
  independente da ordem de chegada.
- Casos de teste: remontagem correta mesmo com pacotes chegando fora de ordem; pacote some e
  é reenviado dentro do prazo (vitória) e fora do prazo (derrota); escolher o enlace cheio
  bloqueia o pacote; mesma semente produz a mesma sequência de perdas; resolução de DNS certa
  × nome não resolvido; cálculo de estrelas nos três critérios.

## Riscos

- **Grafo de roteadores confuso em tela pequena:** nós e arestas fixos por fase (não
  gerados), no máximo 6 nós, com rótulos curtos (A, B, C...) e o caminho atual destacado ao
  selecionar um pacote. Testar especificamente em 320×568 e celular deitado.
- **"Fora de ordem" ser difícil de perceber:** a animação precisa mostrar claramente o pacote
  `#3` chegando antes do `#2` (ex.: caixas numeradas fixas 1/2/3, que preenchem fora de ordem
  com uma leve espera antes de "fechar" a mensagem), não só um texto dizendo isso.
- **Perda de pacote parecer injusta/aleatória sem explicação:** o pacote perdido precisa
  "desaparecer" visualmente de um jeito claro (ex.: dissolve com um ícone de interferência),
  e a confirmação pendente precisa aparecer na bandeja de saída antes do reenvio automático,
  para o jogador entender a causa.
- **F2/F3 parecerem depender de reflexo:** o tempo de decisão de rota e o prazo de reenvio
  devem ser generosos e a fase pausável; estrelas medem poucos reenvios/boas rotas, não
  velocidade de toque.
- **DNS (F4) parecer mágico:** mostrar explicitamente o passo "nome → tabela DNS → endereço"
  como uma ação visível (tocar no nome, ver o endereço aparecer), não como algo automático
  escondido.
- **Determinismo com grafo:** como as rotas possíveis multiplicam estados, os testes de
  regras puras precisam fixar a semente também para a escolha de qual pacote se perde e em
  qual ordem os pacotes chegam, não só para o conteúdo da mensagem.
