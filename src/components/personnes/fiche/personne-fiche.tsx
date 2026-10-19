import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import {
  BabyIcon,
  CalendarDaysIcon,
  HeartHandshakeIcon,
  MapPinIcon,
  PencilIcon,
  PlusIcon,
  UserRoundIcon,
  UsersIcon,
} from 'lucide-react'

import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { PersonAvatar } from '../person-avatar'
import { PersonneDeleteDialog } from '../personne-delete-dialog'
import { MariageEditDialog } from '../mariage-edit-dialog'
import { TYPE_FIN_LABELS } from '#/lib/personnes/fiche-types'
import type {
  PersonneEnfant,
  PersonneFiche,
  PersonneParent,
  PersonneResume,
  PersonneUnion,
} from '#/lib/personnes/fiche-types'
import {
  formatDateFr,
  formatDateRange,
  formatPersonneName,
} from '#/lib/personnes/format'
import { SEXE_LABELS } from '#/lib/personnes/types'

type PersonneFicheViewProps = {
  fiche: PersonneFiche
  isOwnLignee: boolean
}

/** Vue complète d'une fiche : identité, famille et actions. */
export function PersonneFicheView({
  fiche,
  isOwnLignee,
}: PersonneFicheViewProps) {
  const { personne, parents, unions, enfants } = fiche
  const canEdit = fiche.can_edit
  const sexeLabel =
    personne.sexe === 'M' || personne.sexe === 'F'
      ? SEXE_LABELS[personne.sexe]
      : null

  return (
    <div className="space-y-6">
      <section className="island-shell rise-in rounded-2xl border border-[var(--line)] p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <PersonAvatar
            size="lg"
            className="size-24 shrink-0"
            fallbackClassName="text-3xl"
            nom={personne.nom}
            prenom={personne.prenom}
            appellation={personne.appellation}
            src={personne.urlImgThumb ?? personne.urlImg}
          />

          <div className="min-w-0 flex-1">
            <p className="island-kicker">Fiche personne</p>
            <h1 className="display-title mt-1 text-3xl font-semibold text-[var(--sea-ink)] sm:text-4xl">
              {formatPersonneName(personne)}
            </h1>
            {personne.appellation ? (
              <p className="mt-1 text-muted-foreground">
                « {personne.appellation} »
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {sexeLabel ? (
                <Badge variant="secondary" className="font-normal">
                  {sexeLabel}
                </Badge>
              ) : null}
              {personne.estLigneeGenerale ? (
                <Badge variant="outline" className="font-normal">
                  Lignée générale
                </Badge>
              ) : null}
              {personne.date_deces ? (
                <Badge variant="outline" className="font-normal">
                  Décédé(e)
                </Badge>
              ) : null}
              {personne.profession ? (
                <Badge variant="outline" className="font-normal">
                  {personne.profession}
                </Badge>
              ) : null}
            </div>

            <p className="mt-3 text-sm text-muted-foreground">
              {formatDateRange(personne.date_naissance, personne.date_deces) ||
                'Dates inconnues'}
              {personne.ville || personne.pays
                ? ` · ${[personne.ville, personne.pays].filter(Boolean).join(', ')}`
                : ''}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2 border-t border-[var(--line)] pt-5">
          {canEdit ? (
            <>
              <Button asChild variant="brand" className="h-10">
                <Link
                  to="/app/personnes/$personneId/modifier"
                  params={{ personneId: personne.id }}
                >
                  <PencilIcon />
                  Modifier
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-10">
                <Link
                  to="/app/personnes/nouvelle"
                  search={{ mode: 'naissance_parent', parent: personne.id }}
                >
                  <BabyIcon />
                  Ajouter un enfant
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-10">
                <Link
                  to="/app/personnes/nouvelle"
                  search={{ mode: 'alliance', conjoint: personne.id }}
                >
                  <HeartHandshakeIcon />
                  Ajouter une union
                </Link>
              </Button>
            </>
          ) : null}

          {fiche.can_delete ? (
            <PersonneDeleteDialog fiche={fiche} isOwnLignee={isOwnLignee} />
          ) : null}
        </div>

        {canEdit && !fiche.can_delete ? (
          <p className="mt-3 text-xs text-muted-foreground">
            La suppression est réservée à un administrateur : cette personne
            sert de référence de lignée à un compte.
          </p>
        ) : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section
          aria-labelledby="etat-civil-title"
          className="island-shell rounded-2xl border border-[var(--line)] p-5 sm:p-6"
        >
          <header className="mb-5 flex items-start gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--sand)] text-[var(--palm)]">
              <UserRoundIcon className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="display-title text-xs font-semibold tracking-widest text-muted-foreground">
                01
              </p>
              <h2
                id="etat-civil-title"
                className="display-title text-lg font-semibold text-[var(--sea-ink)]"
              >
                État civil
              </h2>
            </div>
          </header>

          <dl className="grid gap-4 sm:grid-cols-2">
            <DefinitionItem
              label="Date de naissance"
              value={
                personne.date_naissance
                  ? formatDateFr(personne.date_naissance)
                  : null
              }
              icon={CalendarDaysIcon}
            />
            <DefinitionItem
              label="Date de décès"
              value={
                personne.date_deces ? formatDateFr(personne.date_deces) : null
              }
              icon={CalendarDaysIcon}
            />
            <DefinitionItem label="Profession" value={personne.profession} />
            <DefinitionItem label="Téléphone" value={personne.numero} />
            <DefinitionItem label="Facebook" value={personne.nom_facebook} />
            <DefinitionItem
              label="Localisation"
              value={
                [personne.quartier, personne.ville, personne.pays]
                  .filter(Boolean)
                  .join(', ') || null
              }
              icon={MapPinIcon}
            />
          </dl>
        </section>

        <section
          aria-labelledby="famille-title"
          className="island-shell rounded-2xl border border-[var(--line)] p-5 sm:p-6"
        >
          <header className="mb-5 flex items-start gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--sand)] text-[var(--palm)]">
              <UsersIcon className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="display-title text-xs font-semibold tracking-widest text-muted-foreground">
                02
              </p>
              <h2
                id="famille-title"
                className="display-title text-lg font-semibold text-[var(--sea-ink)]"
              >
                Famille
              </h2>
            </div>
          </header>

          <div className="space-y-6">
            <RelationGroup
              title="Parents"
              emptyLabel="Aucun parent renseigné."
              count={parents.length}
            >
              {parents.map((parent) => (
                <PersonneLinkCard
                  key={parent.id}
                  personne={parent}
                  secondary={typeParentLabel(parent)}
                />
              ))}
            </RelationGroup>

            <RelationGroup
              title="Unions"
              emptyLabel="Aucune union renseignée."
              count={unions.length}
            >
              {unions.map((union) => (
                <UnionCard key={union.id} union={union} canEdit={canEdit} />
              ))}
            </RelationGroup>

            <RelationGroup
              title="Enfants"
              emptyLabel="Aucun enfant renseigné."
              count={enfants.length}
            >
              {enfants.map((enfant) => (
                <PersonneLinkCard
                  key={enfant.id}
                  personne={enfant}
                  secondary={
                    enfant.mariage_id
                      ? 'Issu(e) d’une union'
                      : typeParentLabel(enfant)
                  }
                />
              ))}
            </RelationGroup>

            {canEdit &&
            parents.length + unions.length + enfants.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Utilisez les actions rapides pour rattacher cette personne à sa
                famille.
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  )
}

function DefinitionItem({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string | null | undefined
  icon?: typeof CalendarDaysIcon
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {Icon ? <Icon className="size-3.5" aria-hidden="true" /> : null}
        {label}
      </dt>
      <dd className="mt-1 text-sm text-[var(--sea-ink)]">
        {value || <span className="text-muted-foreground">Non renseigné</span>}
      </dd>
    </div>
  )
}

function RelationGroup({
  title,
  count,
  emptyLabel,
  children,
}: {
  title: string
  count: number
  emptyLabel: string
  children: ReactNode
}) {
  return (
    <div>
      <h3 className="flex items-center justify-between gap-2 text-sm font-semibold text-[var(--sea-ink)]">
        {title}
        <Badge variant="outline" className="font-normal">
          {count}
        </Badge>
      </h3>
      {count > 0 ? (
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">{children}</ul>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">{emptyLabel}</p>
      )}
    </div>
  )
}

function PersonneLinkCard({
  personne,
  secondary,
}: {
  personne: PersonneResume
  secondary?: string | null
}) {
  return (
    <li>
      <Link
        to="/app/personnes/$personneId"
        params={{ personneId: personne.id }}
        className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 outline-none transition-colors hover:border-[var(--lagoon-deep)]/50 focus-visible:ring-[3px] focus-visible:ring-[var(--lagoon)]/40"
      >
        <PersonAvatar
          size="default"
          className="size-9"
          nom={personne.nom}
          prenom={personne.prenom}
          appellation={personne.appellation}
          src={personne.url_img_thumb}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-[var(--sea-ink)]">
            {formatPersonneName(personne)}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {secondary
              ? `${secondary}${personne.date_naissance ? ' · ' : ''}`
              : ''}
            {formatDateRange(personne.date_naissance, personne.date_deces)}
          </span>
        </span>
      </Link>
    </li>
  )
}

function UnionCard({
  union,
  canEdit,
}: {
  union: PersonneUnion
  canEdit: boolean
}) {
  const finLabel = union.date_fin
    ? `${union.type_fin ? (TYPE_FIN_LABELS[union.type_fin] ?? union.type_fin) : 'Terminée'} le ${formatDateFr(union.date_fin)}`
    : null

  return (
    <li className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
      <div className="flex items-start gap-3">
        <Link
          to="/app/personnes/$personneId"
          params={{ personneId: union.conjoint.id }}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--lagoon)]/40"
        >
          <PersonAvatar
            size="default"
            className="size-9"
            nom={union.conjoint.nom}
            prenom={union.conjoint.prenom}
            appellation={union.conjoint.appellation}
            src={union.conjoint.url_img_thumb}
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-[var(--sea-ink)]">
              {formatPersonneName(union.conjoint)}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {union.date_mariage
                ? `Union le ${formatDateFr(union.date_mariage)}`
                : 'Date d’union inconnue'}
              {finLabel ? ` · ${finLabel}` : ''}
            </span>
          </span>
        </Link>

        {canEdit ? (
          <MariageEditDialog
            union={union}
            conjointName={formatPersonneName(union.conjoint)}
          />
        ) : null}
      </div>

      {union.enfants.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1.5 border-t border-[var(--line)] pt-2">
          {union.enfants.map((enfant) => (
            <li key={enfant.id}>
              <Link
                to="/app/personnes/$personneId"
                params={{ personneId: enfant.id }}
                className="inline-flex rounded-full border border-[var(--line)] px-2 py-0.5 text-xs text-muted-foreground outline-none hover:border-[var(--lagoon-deep)]/50 hover:text-[var(--sea-ink)] focus-visible:ring-[3px] focus-visible:ring-[var(--lagoon)]/40"
              >
                {formatPersonneName(enfant)}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {canEdit ? (
        <Button asChild variant="ghost" size="sm" className="mt-2 h-8">
          <Link
            to="/app/personnes/nouvelle"
            search={{ mode: 'naissance_mariage', mariage: union.id }}
          >
            <PlusIcon />
            Enfant de cette union
          </Link>
        </Button>
      ) : null}
    </li>
  )
}

function typeParentLabel(parent: PersonneParent | PersonneEnfant): string {
  if (parent.type_parent === 'pere') return 'Père'
  if (parent.type_parent === 'mere') return 'Mère'
  if (parent.type_parent === 'parent') return 'Parent'
  return 'Lien de parenté'
}
