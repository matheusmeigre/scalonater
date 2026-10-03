/**
 * Ícones próprios desta estação, registrados em `index.ts` via
 * `GameModule.icons` (README, "Como criar um novo minigame", passo 7).
 * Usados pelos cards de conceito "Porta lógica" e "Tabela-verdade".
 */

/** Porta AND estilizada (meio-círculo com duas entradas). */
export const GATE_ICON = (
  <>
    <path d="M5 4h4a6 6 0 0 1 0 12H5z" />
    <path d="M2 7h3M2 13h3M15 10h4" />
  </>
)

/** Grade simples (3×3), para "tabela-verdade". */
export const TABLE_ICON = (
  <>
    <rect x="3" y="4" width="18" height="16" rx="1.5" />
    <path d="M3 10h18M3 15h18M9 4v16M15 4v16" />
  </>
)
