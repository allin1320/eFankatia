import { QueryClient } from '@tanstack/react-query'

import type { AppProfile, AppUser } from '#/lib/auth/types'

/** Contexte partagé du routeur, disponible dans toutes les routes. */
export interface RouterContext {
  queryClient: QueryClient
  user: AppUser | null
  profile: AppProfile | null
}

export function getContext(): RouterContext {
  const queryClient = new QueryClient()

  return {
    queryClient,
    user: null,
    profile: null,
  }
}

export default function TanstackQueryProvider() {}
