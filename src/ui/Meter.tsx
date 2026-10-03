import { cx } from './format'

/**
 * Barra de progresso. Anima com transform (scaleX), nunca com width,
 * para rodar a 60fps em celulares modestos.
 */
export function Track({
  value,
  tone = 'cyan',
  className,
  barClassName,
}: {
  /** 0..1 */
  value: number
  tone?: 'cyan' | 'danger' | 'mint' | 'gold'
  className?: string
  barClassName?: string
}) {
  const color = { cyan: 'bg-cyan', danger: 'bg-danger', mint: 'bg-mint', gold: 'bg-gold' }[tone]
  return (
    <div
      className={cx(
        'h-[9px] overflow-hidden rounded-full border border-line bg-bg roomy:h-3.5 roomy:border-2',
        className,
      )}
    >
      <i
        className={cx('block h-full origin-left rounded-full', color, barClassName)}
        style={{ transform: `scaleX(${Math.max(0, Math.min(1, value))})` }}
      />
    </div>
  )
}

/**
 * Pips de tarefas: um por tarefa, dourados quando feitos. `min-w-0` (em vez
 * de uma largura mínima fixa) deixa cada pip encolher livremente quando
 * `total` é grande (ex. 64 em "Do clique ao pixel"): com um piso fixo, 64
 * pips mais os `gap`s somam bem mais que a largura do painel do HUD e
 * vazam a tela, já que este é um `flex` sem quebra de linha.
 */
export function Pips({ total, done }: { total: number; done: number }) {
  return (
    <div className="flex gap-[3px] overflow-hidden roomy:gap-[5px]" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <i
          key={i}
          className={cx(
            'h-3 max-w-[22px] min-w-0 flex-1 rounded-[3px] roomy:h-6 roomy:rounded-xs roomy:shadow-[inset_0_-4px_0_rgb(0_0_0/0.25)]',
            i < done ? 'bg-gold' : 'bg-line',
          )}
        />
      ))}
    </div>
  )
}
