/**
 * Ícones próprios desta estação, registrados em `index.ts` via
 * `GameModule.icons` (README, "Como criar um novo minigame", passo 7). O
 * ícone "alu" já existe em `src/ui/icons.tsx` (usado pela peça da placa-mãe
 * no mapa) e é reaproveitado pelo card de conceito "ULA" — só "carry"
 * (vai-um) precisa de um ícone novo aqui.
 */

/** Uma ficha subindo de uma coluna para a outra, para "vai-um". */
export const CARRY_ICON = (
  <>
    <rect x="3" y="13" width="7" height="7" rx="1.5" />
    <rect x="14" y="4" width="7" height="7" rx="1.5" />
    <path d="M9 13V9a2 2 0 0 1 2-2h3" />
    <path d="M12.5 5.5 14 4l1.5 1.5" />
  </>
)
