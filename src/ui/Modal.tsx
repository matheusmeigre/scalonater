import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { cx } from './format'

export interface ModalProps {
  open: boolean
  /** Esc ou toque fora. Sem ele, o modal só fecha pelos botões de dentro. */
  onDismiss?: () => void
  labelledBy?: string
  label?: string
  className?: string
  children: ReactNode
}

/**
 * Modal acessível sobre o <dialog> nativo: prende o foco, deixa o fundo inerte
 * e devolve o foco ao fechar, sem dependências.
 */
export function Modal({ open, onDismiss, labelledBy, label, className, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const dismissRef = useRef(onDismiss)
  useLayoutEffect(() => {
    dismissRef.current = onDismiss
  })

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  useEffect(() => {
    const d = ref.current
    if (!d) return
    const onCancel = (e: Event) => {
      e.preventDefault()
      dismissRef.current?.()
    }
    d.addEventListener('cancel', onCancel)
    return () => d.removeEventListener('cancel', onCancel)
  }, [])

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      aria-label={label}
      onClick={(e) => {
        if (e.target === ref.current) dismissRef.current?.()
      }}
      className={cx(
        'm-auto max-h-[calc(100dvh-24px)] w-[min(640px,calc(100vw-24px))] overflow-visible bg-transparent p-0 text-ink',
        'backdrop:bg-[rgb(8_7_20/0.84)] backdrop:backdrop-blur-[4px]',
        'open:motion-safe:animate-pop',
        className,
      )}
    >
      {open && (
        <div className="max-h-[calc(100dvh-24px)] scrollbar-thin overflow-y-auto overscroll-contain">
          {children}
        </div>
      )}
    </dialog>
  )
}
