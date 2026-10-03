/**
 * Módulo compartilhado "Memória (RAM)" — ver `docs/design/memory.md`, seção
 * "Módulo compartilhado `src/games/shared/memory/`". Criado pela estação
 * Memória; Ciclo da CPU e Cache só importam a partir daqui.
 */
export {
  createMemory,
  eraseAll,
  isValidAddress,
  readMemory,
  writeMemory,
  type MemoryCell,
  type MemoryEvent,
  type MemoryState,
} from './model'
export { Drawer, type DrawerProps } from './components/Drawer'
export { MemoryShelf, type MemoryShelfProps } from './components/MemoryShelf'
export { MemoryTrip, type MemoryTripProps } from './components/MemoryTrip'
import './memory.css'
