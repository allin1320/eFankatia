import { cn } from 'cn'

import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import { initialFromPersonne } from '#/lib/personnes/format'

type PersonAvatarProps = {
  nom?: string | null
  prenom?: string | null
  appellation?: string | null
  /** URL de l'image (miniature ou aperçu local). */
  src?: string | null
  size?: 'sm' | 'default' | 'lg'
  className?: string
  fallbackClassName?: string
}

/**
 * Avatar d'une personne : photo si disponible, sinon première lettre de
 * l'appellation (repli prénom puis nom). Décoratif par défaut : le nom est
 * toujours affiché à proximité.
 */
export function PersonAvatar({
  nom,
  prenom,
  appellation,
  src,
  size = 'default',
  className,
  fallbackClassName,
}: PersonAvatarProps) {
  const image = src ?? null
  const initial = initialFromPersonne({ nom, prenom, appellation })

  return (
    <Avatar
      size={size}
      aria-hidden="true"
      className={cn('border border-[var(--line)] bg-[var(--sand)]', className)}
    >
      {image ? <AvatarImage src={image} alt="" /> : null}
      <AvatarFallback
        className={cn(
          'bg-[var(--sand)] font-semibold text-[var(--palm)]',
          fallbackClassName,
        )}
      >
        {initial}
      </AvatarFallback>
    </Avatar>
  )
}
