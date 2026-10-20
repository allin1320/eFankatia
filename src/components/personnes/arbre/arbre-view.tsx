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
import {
  buildTreeVisibility,
  isChildrenExpandedByDefault,
  isParentsExpandedByDefault,
} from '#/lib/personnes/tree-visibility'
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

  const {
    visibility,
    canReduce,
    toggleParents,
    toggleChildren,
    toggleMarriage,
    reset,
  } = useArbreVisibility(data, complet)

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
            parentControls={visibility.parentControls}
            childControls={visibility.childControls}
            marriageControls={visibility.marriageControls}
            canReduce={canReduce}
            onToggleParents={toggleParents}
            onToggleChildren={toggleChildren}
            onToggleMarriage={toggleMarriage}
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
function useArbreVisibility(
  data: ArbrePersonneData | null | undefined,
  complet: boolean,
) {
  const [parentOverrides, setParentOverrides] = useState<
    ReadonlyMap<string, boolean>
  >(() => new Map())
  const [childOverrides, setChildOverrides] = useState<
    ReadonlyMap<string, boolean>
  >(() => new Map())
  const [marriageOverrides, setMarriageOverrides] = useState<
    ReadonlyMap<string, boolean>
  >(() => new Map())

  const focusId = data?.focus_id ?? null
  useEffect(() => {
    setParentOverrides(new Map())
    setChildOverrides(new Map())
    setMarriageOverrides(new Map())
  }, [focusId])

  const visibility = useMemo(
    () =>
      data
        ? buildTreeVisibility(data, {
            complet,
            baseDepth: ARBRE_BASE_DEPTH,
            parentOverrides,
            childOverrides,
            marriageOverrides,
          })
        : null,
    [data, complet, parentOverrides, childOverrides, marriageOverrides],
  )

  const generationById = useMemo(
    () => new Map(data?.personnes.map((p) => [p.id, p.generation]) ?? []),
    [data],
  )
  const mariageById = useMemo(
    () => new Map(data?.mariages.map((m) => [m.id, m]) ?? []),
    [data],
  )

  const toggleParents = useCallback(
    (id: string, expanded: boolean) => {
      setParentOverrides((previous) => {
        const next = new Map(previous)
        const generation = generationById.get(id) ?? 0
        const defaultValue = isParentsExpandedByDefault(
          generation,
          complet,
          ARBRE_BASE_DEPTH,
        )
        if (expanded === defaultValue) next.delete(id)
        else next.set(id, expanded)
        return next
      })
    },
    [complet, generationById],
  )

  const toggleChildren = useCallback(
    (id: string, expanded: boolean) => {
      setChildOverrides((previous) => {
        const next = new Map(previous)
        const generation = generationById.get(id) ?? 0
        const defaultValue = isChildrenExpandedByDefault(
          generation,
          complet,
          ARBRE_BASE_DEPTH,
        )
        if (expanded === defaultValue) next.delete(id)
        else next.set(id, expanded)
        return next
      })
    },
    [complet, generationById],
  )

  const toggleMarriage = useCallback(
    (id: string, expanded: boolean) => {
      setMarriageOverrides((previous) => {
        const next = new Map(previous)
        const mariage = mariageById.get(id)
        const generation = mariage
          ? (generationById.get(mariage.personne_1_id) ?? 0)
          : 0
        const defaultValue = isChildrenExpandedByDefault(
          generation,
          complet,
          ARBRE_BASE_DEPTH,
        )
        if (expanded === defaultValue) next.delete(id)
        else next.set(id, expanded)
        return next
      })
    },
    [complet, generationById, mariageById],
  )

  const reset = useCallback(() => {
    setParentOverrides(new Map())
    setChildOverrides(new Map())
    setMarriageOverrides(new Map())
  }, [])

  const canReduce =
    parentOverrides.size > 0 ||
    childOverrides.size > 0 ||
    marriageOverrides.size > 0

  return {
    visibility,
    canReduce,
    toggleParents,
    toggleChildren,
    toggleMarriage,
    reset,
  }
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
