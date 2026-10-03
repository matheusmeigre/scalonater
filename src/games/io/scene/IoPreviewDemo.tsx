import { useState } from 'react'
import { IoDevicePreview } from './IoDevicePreview'

/**
 * Demo estática de `IoDevicePreview`, registrada em `GameModule.preview`
 * (ver `src/engine/types.ts`) — usada por telas que só precisam de uma
 * ilustração da estação (ex.: Manual), sem rodar `useIoSession`.
 *
 * Quem precisa controlar o estado de fora (ex.: a estação `pixel`) deve
 * importar `IoDevicePreview` diretamente, não este wrapper.
 */
export function IoPreviewDemo({ className }: { className?: string }) {
  const [guarded, setGuarded] = useState(false)
  return (
    <IoDevicePreview
      device="mouse"
      ringing={!guarded}
      guarded={guarded}
      guardLabel="Guardar e atender"
      onGuard={() => setGuarded(true)}
      onAttend={() => setGuarded(false)}
      className={className}
    />
  )
}
