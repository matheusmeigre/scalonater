import { createLocalStorageRepository } from './localStorageRepository'
import type { ProgressRepository } from './repository'

let repository: ProgressRepository | null = null

export function getRepository(): ProgressRepository {
  return (repository ??= createLocalStorageRepository())
}

/** Troca o backend de persistência (testes, Supabase no futuro). */
export function setRepository(next: ProgressRepository) {
  repository = next
}

export type { ProgressRepository } from './repository'
export * from './progress'
