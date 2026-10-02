import type { ReactNode } from 'react'

/**
 * Ícones próprios da estação (teclado, mouse, disco, rede), registrados no
 * mapa global (`src/ui/icons.tsx`) pelo registro (`games/registry.ts`) —
 * ver risco "novos ícones" em `docs/design/io.md`. Mesmo traço (24px, 2.2px)
 * dos ícones embutidos.
 */
export const IO_ICONS: Record<string, { node: ReactNode }> = {
  'io-teclado': {
    node: (
      <>
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h12" />
      </>
    ),
  },
  'io-mouse': {
    node: (
      <>
        <rect x="7" y="2" width="10" height="20" rx="5" />
        <path d="M12 2v7M12 9h5" />
      </>
    ),
  },
  'io-disco': {
    node: (
      <>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v7M12 15v7" />
      </>
    ),
  },
  'io-rede': {
    node: (
      <>
        <rect x="9" y="2" width="6" height="6" rx="1" />
        <rect x="2" y="16" width="6" height="6" rx="1" />
        <rect x="16" y="16" width="6" height="6" rx="1" />
        <path d="M12 8v4M5 16v-4h14v4" />
      </>
    ),
  },
}
