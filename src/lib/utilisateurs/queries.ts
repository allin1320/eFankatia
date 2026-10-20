import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query'

import { getSupabaseBrowserClient } from '../supabase/client'
import { utilisateurKeys } from '../supabase/query-keys'
import type { UserRole } from '../supabase/types'
import type { AdminUtilisateur } from './types'
import { UTILISATEURS_PAGE_SIZE } from './types'

/** Garantit un tableau, même si PostgREST renvoie `null`. */
function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

/** Liste admin paginée, avec recherche et filtre par rôle. */
export function adminUtilisateursQueryOptions(
  query: string,
  role: UserRole | null,
  page: number,
) {
  const safePage = Math.max(1, page)

  return queryOptions({
    queryKey: utilisateurKeys.liste(query, role, safePage),
    queryFn: async (): Promise<AdminUtilisateur[]> => {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase.rpc('admin_list_profiles', {
        p_query: query,
        p_role: role ?? undefined,
        p_limit: UTILISATEURS_PAGE_SIZE,
        p_offset: (safePage - 1) * UTILISATEURS_PAGE_SIZE,
      })
      if (error) throw error
      return asArray<AdminUtilisateur>(data)
    },
    staleTime: 20_000,
    placeholderData: keepPreviousData,
  })
}

/** Hook : liste admin paginée. */
export function useAdminUtilisateurs(
  query: string,
  role: UserRole | null,
  page: number,
) {
  return useQuery(adminUtilisateursQueryOptions(query, role, page))
}
