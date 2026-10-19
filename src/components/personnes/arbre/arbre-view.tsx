import { Link } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeftIcon,
  CircleAlertIcon,
  Loader2Icon,
  NetworkIcon,
  RefreshCwIcon,
} from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { ArbreCanvas } from './arbre-canvas'
import { useArbrePersonne } from '#/lib/personnes/queries'
import { computeTreeLayout } from '#/lib/personnes/tree-layout'
import { buildTreeVisibility } from '#/lib/personnes/tree-visibility'
import { ARBRE_BASE_DEPTH } from '#/lib/personnes/tree-types'
import type { ArbrePersonneData } from '#/lib/personnes/tree-types'
import { formatPersonneName } from '#/lib/personnes/format'

type ArbreViewProps = {
  personneId: string
  /** `true` : affiche tout l'arbre (ouvert depuis une fiche). */
  complet: boolean
  /** Affiche le lien de retour vers la fiche. */
  fromFiche?: boolean
}

/** Vue de l'arbre généalogique centrée sur une personne. */
export function ArbreView({
  personneId,
  complet,
  fromFiche = false,
}: ArbreViewProps) {
  const { data, isPending, isFetching, isError, error, refetch } =
    useArbrePersonne(personneId)

  const { visibility, expandParents, expandChildren, reset } =
    useArbreVisibility(data, complet)

  const layout = useMemo(
    () => (visibility ? computeTreeLayout(visibility.data) : null),
    [visibility],
  )

  const focus = data?.personnes.find((p) => p.id === data.focus_id)
  const visibleCount = visibility?.data.personnes.length ?? 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {fromFiche ? (
            <Button asChild variant="ghost" size="sm" className="-ml-2">
              <Link to="/app/personnes/$personneId" params={{ personneId }}>
                <ArrowLeftIcon />
                Retour à la fiche
              </Link>
            </Button>
          ) : null}
          <p className="island-kicker mt-3">Arbre généalogique</p>
          <h1 className="display-title mt-1 flex items-center gap-2 text-3xl font-semibold text-[var(--sea-ink)] sm:text-4xl">
            {focus
              ? formatPersonneName(focus)
              : isPending
                ? 'Chargement…'
                : 'Arbre généalogique'}
            {isFetching && !isPending ? (
              <Loader2Icon
                className="size-5 animate-spin text-muted-foreground"
                aria-hidden="true"
              />
            ) : null}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground" role="status">
            {visibility
              ? `${visibleCount} personne${visibleCount > 1 ? 's' : ''} affichée${visibleCount > 1 ? 's' : ''}${complet ? '' : ' · cliquez sur + pour déplier une branche'}`
              : 'Préparation de l’arbre…'}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          <RefreshCwIcon className={isFetching ? 'animate-spin' : undefined} />
          Actualiser
        </Button>
      </div>

      {isError ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Impossible de charger l’arbre</AlertTitle>
          <AlertDescription>
            <p>{error instanceof Error ? error.message : 'Erreur inconnue.'}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => void refetch()}
            >
              <RefreshCwIcon />
              Réessayer
            </Button>
          </AlertDescription>
        </Alert>
      ) : isPending || !layout || !data || !visibility ? (
        <ArbreSkeleton />
      ) : !focus ? (
        <PersonneIntrouvable />
      ) : data.personnes.length <= 1 ? (
        <EmptyTree personneId={personneId} name={formatPersonneName(focus)} />
      ) : (
        <>
          <ArbreCanvas
            data={visibility.data}
            layout={layout}
            hiddenParents={visibility.hiddenParents}
            hiddenChildren={visibility.hiddenChildren}
            onExpandParents={expandParents}
            onExpandChildren={expandChildren}
            onReset={reset}
            fitKey={`${personneId}:${complet}`}
          />
          <ArbreLegend />
        </>
      )}
    </div>
  )
}

/** État de dépliage des branches et sous-arbre visible associé. */
function useArbreVisibility(data: ArbrePersonneData | null, complet: boolean) {
  const [revealParents, setRevealParents] = useState<ReadonlySet<string>>(
    () => new Set(),
  )
  const [revealChildren, setRevealChildren] = useState<ReadonlySet<string>>(
    () => new Set(),
  )

  const focusId = data?.focus_id ?? null
  useEffect(() => {
    setRevealParents(new Set())
    setRevealChildren(new Set())
  }, [focusId])

  const visibility = useMemo(
    () =>
      data
        ? buildTreeVisibility(data, {
            complet,
            baseDepth: ARBRE_BASE_DEPTH,
            revealParents,
            revealChildren,
          })
        : null,
    [data, complet, revealParents, revealChildren],
  )

  const expandParents = useCallback((id: string) => {
    setRevealParents((previous) => new Set(previous).add(id))
  }, [])
  const expandChildren = useCallback((id: string) => {
    setRevealChildren((previous) => new Set(previous).add(id))
  }, [])
  const reset = useCallback(() => {
    setRevealParents(new Set())
    setRevealChildren(new Set())
  }, [])

  return { visibility, expandParents, expandChildren, reset }
}

function ArbreLegend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
      <li className="flex items-center gap-2">
        <svg width="34" height="10" aria-hidden="true">
          <path
            d="M0 5 H34"
            fill="none"
            strokeWidth="2"
            strokeDasharray="7 5"
            style={{ stroke: 'var(--lagoon-deep)' }}
          />
        </svg>
        Union
      </li>
      <li className="flex items-center gap-2">
        <svg width="34" height="10" aria-hidden="true">
          <path
            d="M17 0 C 17 4, 17 6, 17 10"
            fill="none"
            strokeWidth="1.6"
            style={{ stroke: 'var(--lagoon-deep)', opacity: 0.55 }}
          />
        </svg>
        Filiation (union)
      </li>
      <li className="flex items-center gap-2">
        <svg width="34" height="10" aria-hidden="true">
          <path
            d="M17 0 C 17 4, 17 6, 17 10"
            fill="none"
            strokeWidth="1.6"
            style={{
              stroke: 'color-mix(in oklab, var(--sea-ink) 30%, transparent)',
            }}
          />
        </svg>
        Filiation directe
      </li>
    </ul>
  )
}

function ArbreSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Chargement de l’arbre…</span>
      <Skeleton className="h-[72vh] min-h-[520px] rounded-2xl" />
      <div className="flex gap-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  )
}

function EmptyTree({ personneId, name }: { personneId: string; name: string }) {
  return (
    <div className="island-shell rounded-2xl border border-[var(--line)] p-8 text-center">
      <NetworkIcon className="mx-auto size-8 text-muted-foreground" />
      <h2 className="display-title mt-3 text-lg font-semibold text-[var(--sea-ink)]">
        Aucune relation pour {name}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Cette personne n’a encore ni parent, ni union, ni enfant renseigné.
        Ajoutez des liens depuis sa fiche pour voir l’arbre se déployer.
      </p>
      <Button asChild variant="brand" className="mt-5">
        <Link to="/app/personnes/$personneId" params={{ personneId }}>
          Ouvrir la fiche
        </Link>
      </Button>
    </div>
  )
}

function PersonneIntrouvable() {
  return (
    <div className="island-shell mx-auto max-w-xl rounded-2xl border border-[var(--line)] p-8 text-center">
      <p className="island-kicker">Arbre introuvable</p>
      <h2 className="display-title mt-2 text-2xl font-semibold text-[var(--sea-ink)]">
        Cette personne n’existe pas ou a été supprimée.
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Revenez à l’accueil pour explorer l’arbre familial.
      </p>
      <Button asChild variant="brand" className="mt-5">
        <Link to="/app">Retour à l’accueil</Link>
      </Button>
    </div>
  )
}
