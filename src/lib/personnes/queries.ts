import {
  keepPreviousData,
  queryOptions,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query'

import { getSupabaseBrowserClient } from '../supabase/client'
import { mariageKeys, personneKeys, searchKeys } from '../supabase/query-keys'
import type { PersonneFiche, SearchPersonne } from './fiche-types'
import type {
  MariageCandidat,
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

/** Résumé d'une personne (préremplissage des actions rapides / lignée). */
export function personneResumeQueryOptions(id: string) {
  return queryOptions({
    queryKey: personneKeys.resume(id),
    queryFn: async (): Promise<PersonneCandidat | null> => {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase
        .from('personnes')
        .select(
          'id, nom, prenom, appellation, sexe, date_naissance, date_deces, urlImgThumb, estLigneeGenerale',
        )
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      if (!data) return null
      return {
        id: data.id,
        nom: data.nom,
        prenom: data.prenom,
        appellation: data.appellation,
        sexe: data.sexe,
        date_naissance: data.date_naissance,
        date_deces: data.date_deces,
        url_img_thumb: data.urlImgThumb,
        est_lignee_generale: data.estLigneeGenerale,
      }
    },
    staleTime: 120_000,
  })
}

/** Résumé d'une union (préremplissage des actions rapides). */
export function mariageResumeQueryOptions(id: string) {
  return queryOptions({
    queryKey: [...mariageKeys.all, 'resume', id] as const,
    queryFn: async (): Promise<MariageCandidat | null> => {
      const supabase = getSupabaseBrowserClient()
      const { data: mariage, error } = await supabase
        .from('mariages')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      if (!mariage) return null

      const { data: personnes, error: personnesError } = await supabase
        .from('personnes')
        .select('id, nom, prenom, appellation, sexe, urlImgThumb')
        .in('id', [mariage.personne_1_id, mariage.personne_2_id])
      if (personnesError) throw personnesError

      const p1 = personnes.find((p) => p.id === mariage.personne_1_id)
      const p2 = personnes.find((p) => p.id === mariage.personne_2_id)

      return {
        id: mariage.id,
        date_mariage: mariage.date_mariage,
        date_fin: mariage.date_fin,
        type_fin: mariage.type_fin,
        personne_1_id: mariage.personne_1_id,
        personne_1_nom: p1?.nom ?? null,
        personne_1_prenom: p1?.prenom ?? null,
        personne_1_appellation: p1?.appellation ?? null,
        personne_1_sexe: p1?.sexe ?? null,
        personne_1_url_img_thumb: p1?.urlImgThumb ?? null,
        personne_2_id: mariage.personne_2_id,
        personne_2_nom: p2?.nom ?? null,
        personne_2_prenom: p2?.prenom ?? null,
        personne_2_appellation: p2?.appellation ?? null,
        personne_2_sexe: p2?.sexe ?? null,
        personne_2_url_img_thumb: p2?.urlImgThumb ?? null,
      }
    },
    staleTime: 120_000,
  })
}

/** Fiche détaillée : personne, relations et permissions. */
export function personneFicheQueryOptions(id: string) {
  return queryOptions({
    queryKey: personneKeys.fiche(id),
    queryFn: async (): Promise<PersonneFiche | null> => {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase.rpc('get_personne_fiche', {
        p_id: id,
      })
      if (error) throw error
      return (data as PersonneFiche | null) ?? null
    },
    staleTime: 20_000,
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

/** Hook : résumé d'une personne (ou de la personne assignée au modérateur). */
export function usePersonneResume(id: string | null | undefined) {
  return useQuery({
    ...personneResumeQueryOptions(id ?? ''),
    enabled: Boolean(id),
  })
}

/** Hook : résumé d'une union. */
export function useMariageResume(id: string | null | undefined) {
  return useQuery({
    ...mariageResumeQueryOptions(id ?? ''),
    enabled: Boolean(id),
  })
}

/** Hook : fiche détaillée. */
export function usePersonneFiche(id: string | null | undefined) {
  return useQuery({
    ...personneFicheQueryOptions(id ?? ''),
    enabled: Boolean(id),
  })
}

const SEARCH_PAGE_SIZE = 30

/**
 * Hook : recherche globale paginée.
 *
 * Une requête vide renvoie les membres récents (même RPC), ce qui évite un
 * écran vide à l'arrivée sur la page.
 */
export function useSearchPersonnes(query: string) {
  return useInfiniteQuery({
    queryKey: searchKeys.personnes(query),
    queryFn: async ({ pageParam }): Promise<SearchPersonne[]> => {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase.rpc('search_personnes', {
        p_query: query,
        p_limit: SEARCH_PAGE_SIZE,
        p_offset: pageParam,
      })
      if (error) throw error
      return asArray<SearchPersonne>(data)
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < SEARCH_PAGE_SIZE) return undefined
      const total = lastPage[0]?.total_count ?? 0
      const loaded = allPages.reduce((sum, page) => sum + page.length, 0)
      return loaded < total ? loaded : undefined
    },
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })
}
