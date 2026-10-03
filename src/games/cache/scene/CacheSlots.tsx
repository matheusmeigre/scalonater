import { Icon } from '@/ui/icons'
import { cx } from '@/ui/format'
import type { CacheSlot } from '../logic/model'
import { UI } from '../content'
import type { CacheFlash } from './useCacheSession'

export interface CacheSlotsProps {
  /** Rótulo de acessibilidade do grupo (ex.: "Bancada (L1)"). */
  label: string
  slots: readonly CacheSlot[]
  /** O jogo está pausado esperando o jogador escolher quem sai deste nível. */
  awaitingEviction: boolean
  flash?: CacheFlash | null
  onEvict?: (address: number) => void
}

/**
 * Os "espaços de cache" (acerto, falha, remoção) — componente próprio desta
 * estação (ver `docs/design/cache.md`, cabeçalho). Cada espaço é um
 * `<button>`: toque e teclado (Tab + Enter) funcionam sem nada extra.
 * Acerto/falha/"precisa escolher quem sai" nunca só por cor: ícone e texto
 * no `aria-label`.
 */
export function CacheSlots({ label, slots, awaitingEviction, flash, onEvict }: CacheSlotsProps) {
  return (
    <div className="cache-slots" role="group" aria-label={label}>
      {slots.map((slot, i) => {
        const empty = slot === null
        const flashed = !empty && flash && slot.includes(flash.address) ? flash.kind : null
        const evictable = awaitingEviction && !empty
        const valueText = empty ? UI.emptySlot : slot.join(', ')
        const stateText = flashed === 'hit' || flashed === 'l2-hit' ? ' (acerto)' : ''
        return (
          <button
            key={i}
            type="button"
            className={cx(
              'cache-slot',
              empty && 'is-empty',
              evictable && 'is-evictable',
              flashed && `cache-slot-${flashed}`,
            )}
            data-slot={i}
            data-empty={empty}
            data-flash={flashed ?? undefined}
            disabled={!evictable}
            aria-label={
              empty
                ? `${label}: espaço ${i + 1} vazio`
                : `${label}: espaço ${i + 1}, endereços ${valueText}${stateText}${
                    evictable ? ', toque para remover' : ''
                  }`
            }
            onClick={evictable && slot ? () => onEvict?.(slot[0]!) : undefined}
          >
            <Icon
              name={flashed === 'miss' ? 'hourglass' : flashed ? 'check' : empty ? 'plus' : 'cache'}
              className="cache-slot-icon"
            />
            <span className="cache-slot-value">{valueText}</span>
          </button>
        )
      })}
    </div>
  )
}
