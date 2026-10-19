import { useEffect, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { CheckIcon, PlusIcon, UserPlusIcon } from 'lucide-react'

import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { PersonAvatar } from './person-avatar'
import { formatDateFr, formatPersonneName } from '#/lib/personnes/format'
import { MODE_LABELS } from '#/lib/personnes/types'
import type { PersonneCreationResult } from '#/lib/personnes/types'

type PersonneSuccessProps = {
  result: PersonneCreationResult
  onCreateAnother: () => void
}

/** Écran de confirmation affiché après une création réussie. */
export function PersonneSuccess({
  result,
  onCreateAnother,
}: PersonneSuccessProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const { personne } = result

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <div className="mx-auto max-w-2xl">
      <div
        role="status"
        className="island-shell rise-in rounded-2xl border border-[var(--line)] p-6 text-center sm:p-8"
      >
        <span
          className="mx-auto flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-[var(--lagoon)] to-[var(--palm)] text-white shadow-sm"
          aria-hidden="true"
        >
          <CheckIcon className="size-7" />
        </span>

        <p className="island-kicker mt-4">Personne ajoutée</p>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="display-title mt-2 text-2xl font-semibold text-[var(--sea-ink)] outline-none sm:text-3xl"
        >
          {formatPersonneName(personne)} a rejoint l’arbre.
        </h1>

        <div className="mt-5 flex items-center justify-center gap-3">
          <PersonAvatar
            size="lg"
            className="size-14"
            fallbackClassName="text-lg"
            nom={personne.nom}
            prenom={personne.prenom}
            appellation={personne.appellation}
            src={personne.urlImgThumb}
          />
          <div className="text-left">
            {personne.appellation ? (
              <p className="text-sm text-muted-foreground">
                « {personne.appellation} »
              </p>
            ) : null}
            <p className="text-sm text-muted-foreground">
              {personne.date_naissance
                ? `Né(e) le ${formatDateFr(personne.date_naissance)}`
                : 'Date de naissance inconnue'}
              {personne.date_deces
                ? ` · Décédé(e) le ${formatDateFr(personne.date_deces)}`
                : ''}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Badge variant="secondary" className="font-normal">
            {MODE_LABELS[result.mode]}
          </Badge>
          <Badge variant="outline" className="font-normal">
            {result.relationLabel}
          </Badge>
        </div>

        <div className="mt-7 flex flex-col-reverse justify-center gap-2 sm:flex-row">
          <Button variant="outline" onClick={onCreateAnother}>
            <PlusIcon />
            Créer une autre personne
          </Button>
          <Button asChild variant="brand">
            <Link
              to="/app/personnes/$personneId"
              params={{ personneId: personne.id }}
            >
              Voir la fiche
            </Link>
          </Button>
        </div>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <UserPlusIcon className="size-3.5" aria-hidden="true" />
          Complétez la fiche pour ajouter les liens familiaux.
        </p>
      </div>
    </div>
  )
}
