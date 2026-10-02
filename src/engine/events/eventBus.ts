/** Barramento de eventos tipado e minúsculo (sem dependências). */
export type EventMap = Record<string, unknown>
type Handler<T> = (payload: T) => void

export interface EventBus<E extends EventMap> {
  on<K extends keyof E>(type: K, handler: Handler<E[K]>): () => void
  emit<K extends keyof E>(type: K, payload: E[K]): void
  clear(): void
}

export function createEventBus<E extends EventMap>(): EventBus<E> {
  const handlers = new Map<keyof E, Set<Handler<never>>>()
  return {
    on(type, handler) {
      let set = handlers.get(type)
      if (!set) handlers.set(type, (set = new Set()))
      set.add(handler as Handler<never>)
      return () => set.delete(handler as Handler<never>)
    },
    emit(type, payload) {
      handlers.get(type)?.forEach((h) => (h as Handler<typeof payload>)(payload))
    },
    clear() {
      handlers.clear()
    },
  }
}
