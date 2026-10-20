import type { UserRole } from './types'

/**
 * Clés de cache TanStack Query (source unique de vérité).
 *
 * Les clés sont préfixées par le nom de la ressource afin de pouvoir invalider
 * largement (`['personnes']`) ou précisément (`['personnes', 'candidats', q]`).
 */

export const personneKeys = {
  all: ['personnes'] as const,
  candidats: (query: string) =>
    [...personneKeys.all, 'candidats', query] as const,
  doublon: (nom: string, prenom: string, dateNaissance: string | null) =>
    [...personneKeys.all, 'doublon', { nom, prenom, dateNaissance }] as const,
  resume: (id: string) => [...personneKeys.all, 'resume', id] as const,
  fiche: (id: string) => [...personneKeys.all, 'fiche', id] as const,
  arbre: (id: string) => [...personneKeys.all, 'arbre', id] as const,
  racine: () => [...personneKeys.all, 'racine'] as const,
}

export const mariageKeys = {
  all: ['mariages'] as const,
  candidats: (query: string) =>
    [...mariageKeys.all, 'candidats', query] as const,
}

export const parentEnfantKeys = {
  all: ['parent_enfants'] as const,
}

export const mariageEnfantKeys = {
  all: ['mariage_enfants'] as const,
}

export const searchKeys = {
  all: ['search'] as const,
  personnes: (query: string) =>
    [...searchKeys.all, 'personnes', query] as const,
}

export const utilisateurKeys = {
  all: ['utilisateurs'] as const,
  liste: (query: string, role: UserRole | null, page: number) =>
    [...utilisateurKeys.all, 'liste', { query, role, page }] as const,
}
