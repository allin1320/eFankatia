import type { UserRole } from '../supabase/types'

/** Libellés affichables des rôles applicatifs. */
export const ROLE_LABELS: Record<UserRole, string> = {
  ROLE_ADMIN: 'Administrateur',
  ROLE_MODERATEUR: 'Modérateur',
  ROLE_USER: 'Membre',
}
