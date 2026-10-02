import { describe, expect, it, vi } from 'vitest'
import { createEventBus } from './eventBus'

describe('eventBus', () => {
  it('entrega o payload e permite cancelar a inscrição', () => {
    const bus = createEventBus<{ ping: number }>()
    const fn = vi.fn()
    const off = bus.on('ping', fn)
    bus.emit('ping', 1)
    off()
    bus.emit('ping', 2)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith(1)
  })
})
