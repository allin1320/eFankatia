import { createClient } from '@supabase/supabase-js'

import type { Database } from './database.types'

/**
 * Client Supabase d'administration (service role).
 *
 * **Serveur uniquement** : la clé `SUPABASE_SERVICE_ROLE_KEY` ne doit jamais
 * être exposée au navigateur (pas de préfixe `VITE_`). Ce client contourne la
 * RLS et ne doit être utilisé que dans des server functions qui ont déjà
 * vérifié la session et le rôle de l'appelant.
 */
export function getSupabaseAdminClient() {
  const url = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Variables d’environnement manquantes : VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY',
    )
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
