# Design doc: <nome da estação> (`<id>`)

> Modelo para o mini design doc de cada minigame (`docs/PLANEJAMENTO.md`, seção 2 "Onda 2").
> Copie para `docs/design/<id>.md`, preencha cada seção e apague estas notas em `>`.
> O design doc manda; o rascunho do planejamento (seção 4) só orienta.

## Objetivo didático

> O que o jogador entende de arquitetura de computadores depois de jogar esta estação, em
> uma ou duas frases. Qual é a "ideia-chave"?

## Mecânica principal

> A ação central do jogador (um verbo: tocar, arrastar, ligar, montar…) e por que ela
> ensina o conceito. Cite se usa arraste (e então o kit `src/ui/dnd`) ou só toque/teclado.

## O que cada fase ensina

> Tutorial (sem derrota) + 3 a 5 fases, cada uma com **uma ideia nova** (não só mais
> velocidade ou mais itens). Para cada fase: nome, o que é novo, como vencer, como perder
> (se aplicável).

| Fase     | Ideia nova | Como vencer | Como perder |
| -------- | ---------- | ----------- | ----------- |
| Tutorial |            |             | (nunca)     |
| Fase 1   |            |             |             |
| Fase 2   |            |             |             |
| Fase 3   |            |             |             |

## Falas do Kernel

> Abertura (até 3 falas), dica de cada fase ao perder, e a frase de conexão com a próxima
> estação da trilha. Tom do Kernel: direto, caloroso, nunca didático demais.

- Abertura: …
- Dica (por fase): …
- Conexão com a próxima estação: …

## Card de conceito

> Um ou dois `ConceptCard` (título popular, termo técnico, resumo, analogia, fato do mundo
> real, ícone). Qual fase libera cada um (`unlocksCard`)?

## Layout mobile e desktop

> Esboço ASCII das áreas principais (nível, HUD, controles, campo, narrador) em celular em
> pé, celular deitado e desktop/tablet. Use `GameFrame` (`src/ui/GameFrame.tsx`) para a
> moldura comum; o campo é todo seu.

```
celular em pé          desktop
┌──────────────┐       ┌───────────────────────┐
│ nível   ctrl │       │ nível          ctrl    │
├──────────────┤       ├───────┬────────────────┤
│    HUD       │       │ HUD   │                │
├──────────────┤       │       │     campo      │
│              │       │ campo │                │
│    campo     │       │       │                │
│              │       ├───────┴────────────────┤
├──────────────┤       │       narrador          │
│   narrador   │       └───────────────────────-┘
└──────────────┘
```

## Contrato de dados das fases

> Os campos que estendem `PhaseBase` (ver `src/games/_template/phases.ts` para o modelo) e
> o que `goalValues` devolve para preencher `{goal}`/`{time}`/etc. no texto.

```ts
interface MinhaFase extends PhaseBase {
  // ...
}
```

## Regras puras a testar

> As funções de `logic/` (estado → estado, com eventos) e os casos de teste que comprovam
> vitória, derrota, estrelas e determinismo com semente.

## Riscos

> O que pode dar errado (mecânica confusa, dependência de reflexo, acessibilidade, texto
> ambíguo) e como mitigar.
