import { createBrowserClient } from '@supabase/ssr'

import type { Database } from './database.types'

/**
 * Client Supabase côté navigateur. `createBrowserClient` gère le singleton en
 * interne : appeler cette fonction plusieurs fois renvoie la même instance.
 */
export function getSupabaseBrowserClient() {
  const url = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Variables d’environnement manquantes : VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY',
    )
  }

  return createBrowserClient<Database>(url, anonKey)
}
