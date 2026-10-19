import { Link } from '@tanstack/react-router'
import { StarIcon } from 'lucide-react'
import { cn } from 'cn'

import { PersonAvatar } from '../person-avatar'
import type { ArbrePersonne } from '#/lib/personnes/tree-types'
import { formatDateRange, formatPersonneName } from '#/lib/personnes/format'
import { CARD_HEIGHT, CARD_WIDTH } from '#/lib/personnes/tree-layout'

type ArbreNodeProps = {
  personne: ArbrePersonne
  isFocus: boolean
  /** Coin supérieur gauche de la carte dans l'espace monde. */
  x: number
  y: number
}

/** Carte d'une personne dans l'arbre : photo (ou initiale) + état civil. */
export function ArbreNode({ personne, isFocus, x, y }: ArbreNodeProps) {
  const dates = formatDateRange(personne.date_naissance, personne.date_deces)

  return (
    <Link
      to="/app/personnes/$personneId"
      params={{ personneId: personne.id }}
      style={{
        left: x,
        top: y,
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
      }}
      aria-current={isFocus ? 'true' : undefined}
      className={cn(
        'group absolute flex items-center gap-3 overflow-hidden rounded-2xl border bg-[var(--surface-strong)] p-3 shadow-sm outline-none backdrop-blur-sm transition-[transform,border-color,box-shadow] hover:z-10 hover:-translate-y-0.5 hover:border-[var(--lagoon-deep)]/60 focus-visible:ring-[3px] focus-visible:ring-[var(--lagoon)]/50',
        isFocus
          ? 'border-[var(--lagoon-deep)] ring-2 ring-[var(--lagoon)]/45'
          : 'border-[var(--line)]',
      )}
    >
      <PersonAvatar
        size="lg"
        className="size-11 shrink-0"
        nom={personne.nom}
        prenom={personne.prenom}
        appellation={personne.appellation}
        src={personne.url_img_thumb}
      />

      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-1">
          <span className="truncate text-sm font-semibold text-[var(--sea-ink)]">
            {formatPersonneName(personne)}
          </span>
          {isFocus ? (
            <StarIcon
              className="size-3.5 shrink-0 text-[var(--lagoon-deep)]"
              aria-hidden="true"
            />
          ) : null}
        </span>

        {personne.appellation ? (
          <span className="truncate text-xs text-muted-foreground">
            « {personne.appellation} »
          </span>
        ) : null}

        <span className="mt-0.5 truncate text-xs text-muted-foreground">
          {dates || 'Dates inconnues'}
        </span>
      </span>

      {isFocus ? (
        <span className="sr-only">Personne affichée au centre</span>
      ) : null}
    </Link>
  )
}
