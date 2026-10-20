import { ShieldCheckIcon, UserCogIcon, UserIcon } from 'lucide-react'

import { Badge } from '#/components/ui/badge'
import { ROLE_LABELS } from '#/lib/auth/roles'
import type { UserRole } from '#/lib/supabase/types'

const ROLE_ICONS = {
  ROLE_ADMIN: ShieldCheckIcon,
  ROLE_MODERATEUR: UserCogIcon,
  ROLE_USER: UserIcon,
} satisfies Record<UserRole, typeof UserIcon>

const ROLE_VARIANTS = {
  ROLE_ADMIN: 'default',
  ROLE_MODERATEUR: 'secondary',
  ROLE_USER: 'outline',
} satisfies Record<UserRole, 'default' | 'secondary' | 'outline'>

/** Badge de rôle avec une icône distincte (pas seulement la couleur). */
export function RoleBadge({ role }: { role: UserRole }) {
  const Icon = ROLE_ICONS[role]

  return (
    <Badge variant={ROLE_VARIANTS[role]} className="gap-1.5 font-normal">
      <Icon aria-hidden="true" />
      {ROLE_LABELS[role]}
    </Badge>
  )
}
