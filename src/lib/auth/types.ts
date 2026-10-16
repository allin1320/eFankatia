import type { UserRole } from '../supabase/types'

/** Utilisateur authentifié minimal (issu de Supabase Auth). */
export type AppUser = {
  id: string
  email: string | null
}

/** Profil applicatif minimal (rôle + lignée assignée). */
export type AppProfile = {
  id: string
  email: string | null
  role: UserRole
  personne_id: string | null
}

/** Session applicative complète (utilisateur + profil). */
export type AppSession = {
  user: AppUser | null
  profile: AppProfile | null
}
