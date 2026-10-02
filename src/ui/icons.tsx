import type { ReactNode, SVGProps } from 'react'

/** Ícones de traço (24px, 2.2px, pontas arredondadas). Preenchidos só os da lista FILLED. */
const STROKE = {
  // programas (Núcleos)
  'app-game': (
    <>
      <rect x="2" y="6" width="20" height="12" rx="6" />
      <path d="M6 12h4M8 10v4M15 11h.01M18 13h.01" />
    </>
  ),
  'app-browser': (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
    </>
  ),
  'app-music': (
    <>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </>
  ),
  'app-render': (
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M7 4v16M17 4v16M2 9h5M2 15h5M17 9h5M17 15h5" />
    </>
  ),
  // interface
  hourglass: <path d="M6 2h12M6 22h12M7 2c0 5 5 6 5 10s-5 5-5 10M17 2c0 5-5 6-5 10s5 5 5 10" />,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  restart: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </>
  ),
  'sound-on': (
    <>
      <path d="M11 5 6 9H2v6h4l5 4z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />
    </>
  ),
  'sound-off': (
    <>
      <path d="M11 5 6 9H2v6h4l5 4z" />
      <path d="m22 9-6 6M16 9l6 6" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  book: (
    <path d="M4 19.5V5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2.5zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-3" />
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.5v3M12 18.5v3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M2.5 12h3M18.5 12h3M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  'arrow-left': <path d="M19 12H5M11 18l-6-6 6-6" />,
  'arrow-right': <path d="M5 12h14M13 6l6 6-6 6" />,
  clock: (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2 2M9 2h6" />
    </>
  ),
  infinity: (
    <path d="M7.5 8.5C4.5 8.5 3 10.3 3 12s1.5 3.5 4.5 3.5S12 12 12 12s1.5-3.5 4.5-3.5S21 10.3 21 12s-1.5 3.5-4.5 3.5S12 12 12 12 10.5 8.5 7.5 8.5z" />
  ),
  map: (
    <>
      <path d="M9 3 3 6v15l6-3 6 3 6-3V3l-6 3z" />
      <path d="M9 3v15M15 6v15" />
    </>
  ),
  download: <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />,
  info: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </>
  ),
  // estações da placa-mãe
  bits: (
    <>
      <rect x="3" y="7" width="18" height="10" rx="5" />
      <circle cx="16" cy="12" r="2.6" />
    </>
  ),
  gates: <path d="M5 6h6a6 6 0 0 1 0 12H5zM17 12h4M2 9h3M2 15h3" />,
  alu: (
    <>
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h.01M16 19h.01" />
    </>
  ),
  memory: (
    <>
      <rect x="2" y="7" width="20" height="9" rx="1.5" />
      <path d="M6 10.5v2M10 10.5v2M14 10.5v2M18 10.5v2M5 16v3M9 16v3M15 16v3M19 16v3" />
    </>
  ),
  cycle: (
    <>
      <path d="M21 12a9 9 0 0 1-15.5 6.2M3 12A9 9 0 0 1 18.5 5.8" />
      <path d="M18.5 2v4h-4M5.5 22v-4h4" />
    </>
  ),
  cache: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
  storage: (
    <>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M6 10h6M6 14h4" />
      <circle cx="17" cy="12" r="1.5" />
    </>
  ),
  cores: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
      <path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" />
    </>
  ),
  io: (
    <>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </>
  ),
  network: (
    <>
      <rect x="9" y="2" width="6" height="6" rx="1" />
      <rect x="2" y="16" width="6" height="6" rx="1" />
      <rect x="16" y="16" width="6" height="6" rx="1" />
      <path d="M12 8v4M5 16v-4h14v4" />
    </>
  ),
  pixel: (
    <>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </>
  ),
} as const

const FILLED = {
  heart: <path d="M12 21s-8-5.2-8-11a4.6 4.6 0 0 1 8-3 4.6 4.6 0 0 1 8 3c0 5.8-8 11-8 11z" />,
  flame: <path d="M12 2s5 4.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5.5 1-8.5z" />,
  star: (
    <polygon points="12 2 15.1 8.3 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 8.9 8.3 12 2" />
  ),
  pause: (
    <>
      <rect x="5" y="4" width="5" height="16" rx="1.5" />
      <rect x="14" y="4" width="5" height="16" rx="1.5" />
    </>
  ),
  play: <path d="M6 3.5v17a1 1 0 0 0 1.5.9l14-8.5a1 1 0 0 0 0-1.8l-14-8.5A1 1 0 0 0 6 3.5z" />,
} as const

/**
 * Ícones extras registrados por jogos (`GameModule.icons`), carregados no
 * registro (`games/registry.ts`). Cada jogo cuida dos próprios nomes; evite
 * colidir com os ícones embutidos acima.
 */
const EXTRA: Record<string, { node: ReactNode; filled: boolean }> = {}

export function registerIcons(icons: Record<string, { node: ReactNode; filled?: boolean }>) {
  for (const [name, { node, filled = false }] of Object.entries(icons)) {
    EXTRA[name] = { node, filled }
  }
}

/** Nomes embutidos (com autocomplete) mais quaisquer outros registrados em tempo de execução. */
export type IconName = keyof typeof STROKE | keyof typeof FILLED | (string & {})

export const isIconName = (n: string): n is IconName => n in STROKE || n in FILLED || n in EXTRA

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
  /** Texto para leitores de tela. Sem ele, o ícone é decorativo. */
  label?: string
}

export function Icon({ name, label, className, ...rest }: IconProps) {
  const extra = EXTRA[name as string]
  const filled = extra ? extra.filled : name in FILLED
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true as const }
  const content = extra
    ? extra.node
    : filled
      ? FILLED[name as keyof typeof FILLED]
      : STROKE[name as keyof typeof STROKE]
  return (
    <svg
      viewBox="0 0 24 24"
      className={className ?? 'size-[1em]'}
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      {...a11y}
      {...rest}
    >
      {content}
    </svg>
  )
}
