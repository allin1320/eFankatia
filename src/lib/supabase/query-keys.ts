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
  detail: (id: string) => [...personneKeys.all, 'detail', id] as const,
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
