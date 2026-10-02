import { motion } from 'motion/react'
import { SHELL } from '@/content/shell'
import type { StarCount } from '@/engine/scoring/scoring'
import { cx, fill } from './format'

const STAR = '12 2 15.1 8.3 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 8.9 8.3 12 2'

/** Três estrelas, a do meio maior. Entram uma a uma (se animação estiver liberada). */
export function Stars({
  count,
  size = 'lg',
  className,
}: {
  count: StarCount
  size?: 'sm' | 'lg'
  className?: string
}) {
  const dims =
    size === 'lg'
      ? ['size-12 sm:size-[72px]', 'size-[66px] sm:size-[100px]', 'size-12 sm:size-[72px]']
      : ['size-4', 'size-5', 'size-4']
  return (
    <div
      role="img"
      aria-label={fill(SHELL.a11y.stars, { n: count })}
      className={cx('flex items-end', size === 'lg' ? 'gap-3' : 'gap-0.5', className)}
    >
      {[0, 1, 2].map((i) => {
        const on = i < count
        const star = (
          <svg viewBox="0 0 24 24" className={dims[i]} aria-hidden="true">
            <polygon
              points={STAR}
              fill={on ? '#FFC940' : '#2E2A55'}
              stroke={on ? 'none' : '#5B5485'}
              strokeWidth={1.2}
            />
          </svg>
        )
        return size === 'lg' && on ? (
          <motion.span
            key={i}
            initial={{ scale: 0, rotate: -30, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ delay: 0.25 + i * 0.22, type: 'spring', stiffness: 380, damping: 14 }}
            className="inline-flex"
          >
            {star}
          </motion.span>
        ) : (
          <span key={i} className="inline-flex">
            {star}
          </span>
        )
      })}
    </div>
  )
}
