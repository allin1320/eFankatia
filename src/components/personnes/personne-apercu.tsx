import { SparklesIcon } from 'lucide-react'
import { cn } from 'cn'

import { Badge } from '#/components/ui/badge'
import { PersonAvatar } from './person-avatar'
import {
  describeRelation,
  formatDateFr,
  formatPersonneName,
} from '#/lib/personnes/format'
import type {
  MariageCandidat,
  PersonneCandidat,
  PersonneFormValues,
  RattachementMode,
} from '#/lib/personnes/types'

export type ApercuRelation = {
  conjoint: PersonneCandidat | null
  mariage: MariageCandidat | null
  parent: PersonneCandidat | null
}

type PersonneApercuProps = {
  values: PersonneFormValues
  relation: ApercuRelation
  photoPreviewUrl: string | null
  compact?: boolean
}

const CREATIONS: Record<RattachementMode, string[]> = {
  racine: ['1 personne'],
  alliance: ['1 personne', '1 union'],
  naissance_mariage: [
    '1 personne',
    '2 liens parent-enfant',
    '1 lien union-enfant',
  ],
  naissance_parent: ['1 personne', '1 lien parent-enfant'],
}

function modeBadge(mode: PersonneFormValues['mode']): string {
  switch (mode) {
    case 'alliance':
      return 'Alliance'
    case 'racine':
      return 'Ancêtre racine'
    case 'naissance_mariage':
    case 'naissance_parent':
      return 'Lignée générale'
    default:
      return 'En attente'
  }
}

/** Aperçu en direct de la personne en cours de saisie. */
export function PersonneApercu({
  values,
  relation,
  photoPreviewUrl,
  compact = false,
}: PersonneApercuProps) {
  const name = formatPersonneName(values)
  const relationLabel =
    values.mode === '' ? null : describeRelation(values.mode, relation)
  const creations = values.mode === '' ? [] : CREATIONS[values.mode]

  return (
    <aside
      className={cn(
        'island-shell rounded-2xl border border-[var(--line)] p-5',
        compact ? 'flex items-center gap-4' : 'space-y-4 lg:sticky lg:top-24',
      )}
      aria-label="Aperçu de la personne"
    >
      <div className={cn(compact && 'shrink-0')}>
        <PersonAvatar
          size="lg"
          className={compact ? 'size-14' : 'size-20'}
          fallbackClassName={compact ? 'text-lg' : 'text-2xl'}
          nom={values.nom}
          prenom={values.prenom}
          appellation={values.appellation}
          src={photoPreviewUrl}
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="island-kicker">Aperçu</p>
        <p className="display-title mt-1 truncate text-lg font-semibold text-[var(--sea-ink)]">
          {name}
        </p>
        {values.appellation ? (
          <p className="truncate text-sm text-muted-foreground">
            « {values.appellation} »
          </p>
        ) : null}
        {values.date_naissance || (values.decede && values.date_deces) ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {values.date_naissance
              ? `Né(e) le ${formatDateFr(values.date_naissance)}`
              : ''}
            {values.date_naissance && values.decede && values.date_deces
              ? ' · '
              : ''}
            {values.decede && values.date_deces
              ? `Décédé(e) le ${formatDateFr(values.date_deces)}`
              : ''}
          </p>
        ) : null}

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="font-normal">
            {modeBadge(values.mode)}
          </Badge>
          {relationLabel ? (
            <span className="text-xs text-muted-foreground">
              {relationLabel}
            </span>
          ) : null}
        </div>

        {!compact && creations.length > 0 ? (
          <div className="mt-4 border-t border-[var(--line)] pt-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--sea-ink)]">
              <SparklesIcon
                className="size-3.5 text-[var(--lagoon-deep)]"
                aria-hidden="true"
              />
              Ce qui sera créé
            </p>
            <ul className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
              {creations.map((item) => (
                <li key={item}>· {item}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </aside>
  )
}
