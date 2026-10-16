import { createServerClient } from '@supabase/ssr'
import {
  getCookies,
  setCookie,
  setResponseHeader,
} from '@tanstack/react-start/server'

import type { Database } from './database.types'

/**
 * Client Supabase côté serveur (SSR).
 *
 * La session est portée par des cookies httpOnly, lus et écrits via les
 * helpers de réponse de TanStack Start. Un nouveau client doit être créé pour
 * chaque requête (il lit les cookies de la requête en cours).
 */
export function getSupabaseServerClient() {
  const url = process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Variables d’environnement manquantes : VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY',
    )
  }

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return Object.entries(getCookies()).map(([name, value]) => ({
          name,
          value,
        }))
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value, options } of cookiesToSet) {
          setCookie(name, value, options)
        }
        for (const [name, value] of Object.entries(headers)) {
          setResponseHeader(name, value)
        }
      },
    },
  })
}
