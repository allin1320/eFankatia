import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query'

import { getSupabaseBrowserClient } from '../supabase/client'
import { mariageKeys, personneKeys } from '../supabase/query-keys'
import type {
  MariageCandidat,
  PersonneAssignee,
  PersonneCandidat,
  PersonneDoublon,
} from './types'

/** Garantit un tableau, même si PostgREST renvoie `null`. */
function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

/** Recherche de personnes candidates (conjoint / parent). */
export function personnesCandidatsQueryOptions(query: string) {
  return queryOptions({
    queryKey: personneKeys.candidats(query),
    queryFn: async (): Promise<PersonneCandidat[]> => {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase.rpc('search_personnes_candidats', {
        p_query: query,
        p_limit: 20,
      })
      if (error) throw error
      return asArray<PersonneCandidat>(data)
    },
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })
}

/** Recherche d'unions candidates (naissance par mariage). */
export function mariagesCandidatsQueryOptions(query: string) {
  return queryOptions({
    queryKey: mariageKeys.candidats(query),
    queryFn: async (): Promise<MariageCandidat[]> => {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase.rpc('search_mariages_candidats', {
        p_query: query,
        p_limit: 20,
      })
      if (error) throw error
      return asArray<MariageCandidat>(data)
    },
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })
}

/** Vérification de doublon (exécutée au blur et avant la soumission). */
export function personneDoublonQueryOptions(
  nom: string,
  prenom: string,
  dateNaissance: string | null,
) {
  return queryOptions({
    queryKey: personneKeys.doublon(nom, prenom, dateNaissance),
    queryFn: async (): Promise<PersonneDoublon[]> => {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase.rpc('check_personne_doublon', {
        p_nom: nom,
        p_prenom: prenom,
        p_date_naissance: dateNaissance ?? undefined,
      })
      if (error) throw error
      return asArray<PersonneDoublon>(data)
    },
    enabled: Boolean(nom.trim() && prenom.trim()),
    staleTime: 15_000,
  })
}

/** Personne assignée à un modérateur (indicateur de lignée). */
export function personneAssigneeQueryOptions(id: string) {
  return queryOptions({
    queryKey: personneKeys.detail(id),
    queryFn: async (): Promise<PersonneAssignee | null> => {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase
        .from('personnes')
        .select('id, nom, prenom, appellation')
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      return data satisfies PersonneAssignee | null
    },
    staleTime: 120_000,
  })
}

/** Hook : personnes candidates, activé à l'ouverture du combobox. */
export function usePersonnesCandidats(query: string, enabled = true) {
  return useQuery({ ...personnesCandidatsQueryOptions(query), enabled })
}

/** Hook : unions candidates, activées lorsque le mode le nécessite. */
export function useMariagesCandidats(query: string, enabled = true) {
  return useQuery({ ...mariagesCandidatsQueryOptions(query), enabled })
}

/** Hook : vérification de doublon. */
export function usePersonneDoublon(
  nom: string,
  prenom: string,
  dateNaissance: string | null,
) {
  return useQuery(personneDoublonQueryOptions(nom, prenom, dateNaissance))
}

/** Hook : personne assignée au modérateur. */
export function usePersonneAssignee(id: string | null | undefined) {
  return useQuery({
    ...personneAssigneeQueryOptions(id ?? ''),
    enabled: Boolean(id),
  })
}
