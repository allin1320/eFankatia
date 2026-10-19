import type { RattachementMode } from './types'

const MODES: RattachementMode[] = [
  'racine',
  'alliance',
  'naissance_mariage',
  'naissance_parent',
]

function stringParam(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

/** Paramètres d'URL acceptés par le formulaire de création. */
export type PersonneCreateSearch = {
  mode?: RattachementMode
  conjoint?: string
  parent?: string
  mariage?: string
}

/** Valide et normalise les paramètres de préremplissage. */
export function validatePersonneCreateSearch(
  search: Record<string, unknown>,
): PersonneCreateSearch {
  const mode = stringParam(search.mode)

  return {
    mode:
      mode && MODES.includes(mode as RattachementMode)
        ? (mode as RattachementMode)
        : undefined,
    conjoint: stringParam(search.conjoint),
    parent: stringParam(search.parent),
    mariage: stringParam(search.mariage),
  }
}

/** Paramètres d'URL de la page de recherche. */
export type SearchPersonnesSearch = {
  q?: string
  notice?: 'deleted'
}

/** Valide et normalise les paramètres de la recherche. */
export function validateSearchPersonnesSearch(
  search: Record<string, unknown>,
): SearchPersonnesSearch {
  const notice = stringParam(search.notice)

  return {
    q: stringParam(search.q) ?? '',
    notice: notice === 'deleted' ? 'deleted' : undefined,
  }
}
