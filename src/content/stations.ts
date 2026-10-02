import type { StationId } from '@/engine/types'

export interface StationCopy {
  title: string
  /** Peça da placa-mãe. */
  part: string
  concept: string
}

/** Textos das estações do mapa, inclusive das que ainda não têm jogo. */
export const STATION_COPY: Record<StationId, StationCopy> = {
  bits: { title: 'Bits', part: 'Interruptores', concept: 'Tudo é 0 e 1' },
  gates: { title: 'Portas lógicas', part: 'Circuitos', concept: 'Lógica booleana' },
  alu: { title: 'A calculadora', part: 'ULA', concept: 'Como a CPU faz contas' },
  memory: { title: 'Memória', part: 'RAM', concept: 'Gavetas com endereço' },
  cycle: {
    title: 'O ciclo da CPU',
    part: 'Unidade de controle',
    concept: 'Buscar, decodificar, executar',
  },
  cache: { title: 'Cache', part: 'Cache', concept: 'Guardar perto o que se usa muito' },
  storage: { title: 'Armazenamento', part: 'SSD', concept: 'Arquivos em blocos' },
  cores: { title: 'Núcleos', part: 'Núcleos da CPU', concept: 'Threads e escalonamento' },
  io: { title: 'Interrupções', part: 'Portas de E/S', concept: 'A campainha do hardware' },
  network: { title: 'Rede', part: 'Placa de rede', concept: 'Pacotes e rotas' },
  pixel: { title: 'Do clique ao pixel', part: 'Placa de vídeo', concept: 'O caminho completo' },
}

/** Rótulos das áreas decorativas da placa-mãe. */
export const ZONE_LABELS: Record<string, string> = {
  cpu: 'CPU',
  ram: 'RAM',
  ssd: 'SSD',
  gpu: 'Vídeo',
  backpanel: 'Portas',
}
