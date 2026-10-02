export type KernelMood = 'neutral' | 'happy' | 'sad' | 'think'

const CYAN = '#3DE0FF'

/** O mascote Kernel: um robozinho desenhado em SVG, com quatro humores. */
export function Kernel({ mood = 'neutral', className }: { mood?: KernelMood; className?: string }) {
  const eyes =
    mood === 'happy' ? (
      <path d="M16 29q4-5 8 0M32 29q4-5 8 0" stroke={CYAN} strokeWidth="3" strokeLinecap="round" />
    ) : mood === 'think' ? (
      <>
        <rect x="19" y="21" width="6" height="8" rx="2" fill={CYAN} />
        <rect x="34" y="21" width="6" height="8" rx="2" fill={CYAN} />
      </>
    ) : (
      <g className="motion-safe:animate-[pulse-soft_4s_steps(2)_infinite]">
        <rect x="17" y="23" width="7" height="10" rx="2" fill={CYAN} />
        <rect x="32" y="23" width="7" height="10" rx="2" fill={CYAN} />
      </g>
    )
  const mouth =
    mood === 'happy' ? (
      <path d="M22 36q6 4 12 0" />
    ) : mood === 'sad' ? (
      <path d="M22 40q6-4 12 0" />
    ) : mood === 'think' ? (
      <path d="M24 38h8" />
    ) : (
      <path d="M22 38h12" />
    )
  return (
    <svg viewBox="0 0 56 56" fill="none" aria-hidden="true" focusable="false" className={className}>
      <line x1="28" y1="6" x2="28" y2="14" stroke={CYAN} strokeWidth="3" strokeLinecap="round" />
      <circle cx="28" cy="6" r="3.5" fill="#FFC940" />
      <rect
        x="9"
        y="14"
        width="38"
        height="30"
        rx="9"
        fill="#2E2A55"
        stroke={CYAN}
        strokeWidth="3"
      />
      {eyes}
      <g stroke={CYAN} strokeWidth="3" strokeLinecap="round">
        {mouth}
      </g>
      <rect x="4" y="24" width="5" height="10" rx="2" fill="#5B5485" />
      <rect x="47" y="24" width="5" height="10" rx="2" fill="#5B5485" />
      {mood === 'think' && (
        <g fill="#FFC940">
          <circle cx="48" cy="10" r="2" />
          <circle cx="53" cy="5" r="1.5" />
        </g>
      )}
    </svg>
  )
}

/** Logo do chip (quatro núcleos coloridos). */
export function ChipLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 72 72" fill="none" aria-hidden="true" focusable="false" className={className}>
      <path
        d="M24 4v10M36 4v10M48 4v10M24 58v10M36 58v10M48 58v10M4 24h10M4 36h10M4 48h10M58 24h10M58 36h10M58 48h10"
        stroke="#5B5485"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <rect
        x="14"
        y="14"
        width="44"
        height="44"
        rx="10"
        fill="#17143A"
        stroke="#3A3470"
        strokeWidth="3"
      />
      <rect x="22" y="22" width="12" height="12" rx="3" fill="#5B95FF" />
      <rect x="38" y="22" width="12" height="12" rx="3" fill="#FF8A3D" />
      <rect x="22" y="38" width="12" height="12" rx="3" fill="#43E0A6" />
      <rect x="38" y="38" width="12" height="12" rx="3" fill="#C77DFF" />
    </svg>
  )
}
