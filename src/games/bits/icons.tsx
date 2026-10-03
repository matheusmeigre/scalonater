/**
 * Ícones próprios do jogo Bits, registrados em `index.ts` (`GameModule.icons`).
 * Em arquivo próprio porque o registro automático (`games/registry.ts`) só
 * descobre `index.ts` (sem JSX), não `index.tsx`.
 */
export const BINARY_ICON = (
  <>
    <rect x="2" y="9" width="4" height="6" rx="1" />
    <rect x="7" y="5" width="4" height="10" rx="1" />
    <rect x="12" y="9" width="4" height="6" rx="1" />
    <rect x="17" y="3" width="4" height="12" rx="1" />
    <path d="M2 19h19" />
  </>
)

export const LETTER_ICON = <path d="M5 19 10 5h4l5 14M7 14h10" />
