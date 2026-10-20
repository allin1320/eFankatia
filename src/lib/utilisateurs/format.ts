import type { UserRole } from '../supabase/types'

/** Libellés courts des rôles dans les filtres et le tableau. */
export const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'ROLE_ADMIN', label: 'Administrateur' },
  { value: 'ROLE_MODERATEUR', label: 'Modérateur' },
  { value: 'ROLE_USER', label: 'Membre' },
]

/** Formate un horodatage ISO en date + heure françaises. */
export function formatDateTimeFr(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
