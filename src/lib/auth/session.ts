import { createServerFn } from '@tanstack/react-start'

import { getSupabaseServerClient } from '../supabase/server'
import type { AppSession, AppUser } from './types'

/**
 * Récupère la session côté serveur (utilisateur + profil applicatif).
 * Sûre à appeler depuis un `beforeLoad` (SSR) comme depuis le client (RPC).
 */
export const getSession = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AppSession> => {
    const supabase = getSupabaseServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { user: null, profile: null }
    }

    const appUser: AppUser = { id: user.id, email: user.email ?? null }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, role, personne_id')
      .eq('id', user.id)
      .single()

    return {
      user: appUser,
      profile: profile ?? null,
    }
  },
)
