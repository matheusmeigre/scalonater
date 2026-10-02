import { Fragment, type HTMLAttributes, type ReactNode } from 'react'
import { SHELL } from '@/content/shell'
import { cx } from './format'
import { Icon, isIconName } from './icons'

/** Cores dos ícones no texto. No papel claro, tons mais escuros para manter contraste. */
const ICON_TONE: Record<'dark' | 'paper', Record<string, string>> = {
  dark: {
    hourglass: 'text-orange',
    flame: 'text-orange',
    heart: 'text-danger',
    star: 'text-gold',
    'app-game': 'text-app-game',
    'app-browser': 'text-app-browser',
    'app-music': 'text-app-music',
    'app-render': 'text-app-render',
  },
  paper: {
    hourglass: 'text-[#B23A0B]',
    flame: 'text-[#B23A0B]',
    heart: 'text-[#C0213F]',
    star: 'text-[#8A6100]',
    'app-game': 'text-[#2453B5]',
    'app-browser': 'text-[#B23A0B]',
    'app-music': 'text-[#0E7A52]',
    'app-render': 'text-[#7A2EB8]',
  },
}

export interface RichTextProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  text: string
  /** Superfície onde o texto aparece: muda a cor do negrito e dos ícones. */
  tone?: 'dark' | 'paper'
  as?: 'span' | 'p' | 'div' | 'li'
}

/**
 * Renderiza o mini-formato dos arquivos de conteúdo: **negrito** e {ícone}.
 * Ícones ganham nome falado para leitores de tela.
 */
export function RichText({ text, tone = 'dark', as: Tag = 'span', ...rest }: RichTextProps) {
  return <Tag {...rest}>{renderRich(text, tone)}</Tag>
}

export function renderRich(text: string, tone: 'dark' | 'paper' = 'dark'): ReactNode[] {
  const out: ReactNode[] = []
  const re = /\*\*(.+?)\*\*|\{([\w-]+)\}/g
  let last = 0
  let m: RegExpExecArray | null
  let k = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    if (m[1] !== undefined) {
      out.push(
        <b key={k++} className={cx('font-bold', tone === 'paper' ? 'text-violet' : 'text-gold')}>
          {renderRich(m[1], tone)}
        </b>,
      )
    } else if (m[2] && isIconName(m[2])) {
      const name = m[2]
      out.push(
        <Fragment key={k++}>
          <Icon
            name={name}
            className={cx('inline-block size-[1.05em] align-[-0.16em]', ICON_TONE[tone][name])}
          />
          {SHELL.iconNames[name] && <span className="sr-only">{SHELL.iconNames[name]}</span>}
        </Fragment>,
      )
    } else out.push(m[0])
    last = re.lastIndex
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}
