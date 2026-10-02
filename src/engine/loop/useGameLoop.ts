import { useEffect, useLayoutEffect, useRef } from 'react'

export interface GameLoopOptions {
  /** Liga e desliga o loop (pausa). */
  running: boolean
  /** Multiplica o tempo do jogo: 0.5 = metade da velocidade. */
  speed?: number
  /** Maior passo por quadro, em segundos. Evita "saltos" depois de travadas. */
  maxStep?: number
}

/**
 * Chama `tick(dt)` a cada quadro com o tempo de jogo decorrido, em segundos.
 * Para quando `running` é falso, então pausar é só desligar a flag.
 */
export function useGameLoop(
  tick: (dt: number) => void,
  { running, speed = 1, maxStep = 0.1 }: GameLoopOptions,
) {
  const tickRef = useRef(tick)
  useLayoutEffect(() => {
    tickRef.current = tick
  })

  useEffect(() => {
    if (!running) return
    let raf = 0
    let last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(maxStep, Math.max(0, (now - last) / 1000)) * speed
      last = now
      if (dt > 0) tickRef.current(dt)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [running, speed, maxStep])
}

/** Chama `onHide` quando a aba ou o app vai para segundo plano. */
export function usePageHidden(onHide: () => void) {
  const ref = useRef(onHide)
  useLayoutEffect(() => {
    ref.current = onHide
  })
  useEffect(() => {
    const fn = () => {
      if (document.hidden) ref.current()
    }
    document.addEventListener('visibilitychange', fn)
    window.addEventListener('pagehide', fn)
    return () => {
      document.removeEventListener('visibilitychange', fn)
      window.removeEventListener('pagehide', fn)
    }
  }, [])
}
