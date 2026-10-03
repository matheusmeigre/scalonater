import { useEffect, useRef, type ReactNode, type RefObject } from 'react'

export interface MemoryTripProps {
  /** Referências DOM de origem e destino; o componente mede `getBoundingClientRect()`. */
  from: RefObject<HTMLElement>
  to: RefObject<HTMLElement>
  /** Dispara a viagem quando muda (ex.: um contador incrementado a cada viagem). */
  tripKey: number
  durationMs: number
  label: ReactNode
  onArrive?: () => void
}

/**
 * Token que "viaja" de `from` até `to` (ex.: o valor saindo da gaveta até o
 * visor do pedido). Anima só `transform: translate()` e `opacity`, com
 * `position: fixed` (não afeta o layout ao redor). Fica sempre montado, mas
 * só visível enquanto uma viagem está em andamento (`data-active`) — tudo
 * feito imperativamente (refs e DOM direto), sem `setState` dentro de
 * efeito, para não disparar re-renderizações em cascata.
 */
export function MemoryTrip({ from, to, tripKey, durationMs, label, onArrive }: MemoryTripProps) {
  const elRef = useRef<HTMLSpanElement>(null)
  const arriveRef = useRef(onArrive)
  useEffect(() => {
    arriveRef.current = onArrive
  })

  const lastKey = useRef(tripKey)
  const timerRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (tripKey === lastKey.current) return
    lastKey.current = tripKey
    const el = elRef.current
    const a = from.current?.getBoundingClientRect()
    const b = to.current?.getBoundingClientRect()
    window.clearTimeout(timerRef.current)
    if (!el || !a || !b) return
    const dx = b.left + b.width / 2 - (a.left + a.width / 2)
    const dy = b.top + b.height / 2 - (a.top + a.height / 2)
    el.style.setProperty('--trip-dx', `${dx}px`)
    el.style.setProperty('--trip-dy', `${dy}px`)
    el.style.setProperty('--trip-duration', `${durationMs}ms`)
    el.style.left = `${a.left + a.width / 2}px`
    el.style.top = `${a.top + a.height / 2}px`
    el.setAttribute('data-active', 'true')
    timerRef.current = window.setTimeout(() => {
      el.removeAttribute('data-active')
      arriveRef.current?.()
    }, durationMs)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só a mudança de tripKey dispara a viagem
  }, [tripKey])

  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  return (
    <span className="memory-trip" ref={elRef} aria-hidden="true">
      {label}
    </span>
  )
}
