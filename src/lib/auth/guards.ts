import { redirect } from '@tanstack/react-router'

import type { UserRole } from '../supabase/types'
import type { AppProfile, AppUser } from './types'

/**
 * Garantit qu'un utilisateur est authentifié ; sinon redirige vers la page de
 * connexion en mémorisant la page d'origine.
 */
export function requireAuth(
  user: AppUser | null,
  redirectTo?: string,
): asserts user is AppUser {
  if (!user) {
    throw redirect({
      to: '/login',
      search: redirectTo ? { redirect: redirectTo } : undefined,
    })
  }
}

/**
 * Garantit que l'utilisateur possède l'un des rôles attendus ; sinon redirige
 * vers l'accueil connecté.
 */
export function requireRole(
  profile: AppProfile | null,
  allowed: UserRole[],
): void {
  if (!profile || !allowed.includes(profile.role)) {
    throw redirect({ to: '/app' })
  }
}
