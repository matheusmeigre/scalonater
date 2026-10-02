import { memo, type CSSProperties } from 'react'
import { cx } from '@/ui/format'
import { Icon } from '@/ui/icons'
import { APPS_COPY } from '../content'
import type { AppId, Thread } from '../logic/model'

export const APP_COLOR: Record<AppId, string> = {
  game: 'var(--color-app-game)',
  browser: 'var(--color-app-browser)',
  music: 'var(--color-app-music)',
  render: 'var(--color-app-render)',
}

/** Valores já arredondados: o cartão só redesenha quando algo visível muda. */
export interface ThreadView {
  id: number
  app: AppId
  task: number
  /** 0..50 (passos de 2%) */
  patience: number
  /** 0..100 */
  progress: number
  blocks: number
  blocked: boolean
  /** Núcleo preferido (cache quente), ou -1. */
  preferred: number
}

export function viewOf(t: Thread, showPreferred: boolean): ThreadView {
  return {
    id: t.id,
    app: t.app,
    task: t.task,
    patience: Math.round(Math.max(0, t.patience) * 50),
    progress: Math.floor(t.progress * 100),
    blocks: Math.max(1, Math.min(6, Math.round(t.work / 1.6))),
    blocked: t.blocked,
    preferred: showPreferred ? t.lastCore : -1,
  }
}

export const sameView = (a: ThreadView, b: ThreadView) =>
  a.id === b.id &&
  a.app === b.app &&
  a.task === b.task &&
  a.patience === b.patience &&
  a.progress === b.progress &&
  a.blocks === b.blocks &&
  a.blocked === b.blocked &&
  a.preferred === b.preferred

export const ThreadCard = memo(
  function ThreadCard({
    view,
    showPatience,
    selected,
    faded,
    variant = 'queue',
  }: {
    view: ThreadView
    showPatience: boolean
    selected?: boolean
    faded?: boolean
    variant?: 'queue' | 'io' | 'ghost'
  }) {
    const app = APPS_COPY[view.app]
    const patience = view.patience / 50
    const low = patience < 0.35
    const tag = view.blocked ? (
      <span className="tag">
        <Icon name="hourglass" />
      </span>
    ) : view.preferred >= 0 ? (
      <span className="tag">
        <Icon name="flame" />
        {view.preferred + 1}
      </span>
    ) : null
    return (
      <div
        className={cx(
          'thread',
          (view.blocked || variant === 'io') && 'io',
          selected && 'sel',
          faded && 'faded',
          variant === 'ghost' && 'ghost',
          tag && 'has-tag',
        )}
        style={{ '--c': APP_COLOR[view.app] } as CSSProperties}
        aria-hidden="true"
      >
        <span className="ico">
          <Icon name={`app-${view.app}`} />
        </span>
        <span className="tx">
          <b className="ap">{app.name}</b>
          <span className="tk">{app.tasks[view.task]}</span>
        </span>
        <span className="ln">
          <span className="wk">
            {Array.from({ length: view.blocks }, (_, i) => (
              <i key={i} />
            ))}
          </span>
          {showPatience && (
            <span className="pt">
              <i className={low ? 'low' : undefined} style={{ transform: `scaleX(${patience})` }} />
            </span>
          )}
        </span>
        {tag}
        {view.progress > 0 && (
          <span className="pgl" style={{ transform: `scaleX(${view.progress / 100})` }} />
        )}
      </div>
    )
  },
  (a, b) =>
    sameView(a.view, b.view) &&
    a.showPatience === b.showPatience &&
    a.selected === b.selected &&
    a.faded === b.faded &&
    a.variant === b.variant,
)
