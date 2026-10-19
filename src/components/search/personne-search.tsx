import { useEffect, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  CircleAlertIcon,
  Loader2Icon,
  SearchIcon,
  UsersIcon,
  XIcon,
} from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Skeleton } from '#/components/ui/skeleton'
import { PersonAvatar } from '#/components/personnes/person-avatar'
import { useDebouncedValue } from '#/hooks/use-debounced-value'
import type { SearchPersonne } from '#/lib/personnes/fiche-types'
import { formatDateRange, formatPersonneName } from '#/lib/personnes/format'
import { useSearchPersonnes } from '#/lib/personnes/queries'

type PersonneSearchProps = {
  initialQuery: string
  notice?: 'deleted'
}

/** Recherche globale : nom, prénom, appellation, profession. */
export function PersonneSearch({ initialQuery, notice }: PersonneSearchProps) {
  const [query, setQuery] = useState(initialQuery)
  const debouncedQuery = useDebouncedValue(query.trim(), 300)
  const navigate = useNavigate()

  const {
    data,
    isPending,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
  } = useSearchPersonnes(debouncedQuery)

  useEffect(() => {
    if (debouncedQuery === initialQuery) return
    void navigate({
      to: '/app/recherche',
      search: { q: debouncedQuery, notice: undefined },
      replace: true,
    })
  }, [debouncedQuery, initialQuery, navigate])

  const results = data?.pages.flat() ?? []
  const total = data?.pages[0]?.[0]?.total_count ?? 0
  const isInitialLoading = isPending && results.length === 0

  return (
    <div className="space-y-6">
      {notice === 'deleted' ? (
        <Alert>
          <UsersIcon />
          <AlertTitle>Personne supprimée</AlertTitle>
          <AlertDescription>
            La fiche et ses liens ont été retirés de l’arbre familial.
          </AlertDescription>
        </Alert>
      ) : null}

      <form
        role="search"
        className="relative"
        onSubmit={(event) => event.preventDefault()}
      >
        <label htmlFor="recherche-personnes" className="sr-only">
          Rechercher un membre de la famille
        </label>
        <SearchIcon
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id="recherche-personnes"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Nom, prénom, appellation ou profession…"
          autoComplete="off"
          autoFocus
          className="h-12 pr-12 pl-12 text-base"
          aria-describedby="recherche-resultats"
        />
        {query ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-1/2 right-2 -translate-y-1/2"
            onClick={() => setQuery('')}
          >
            <XIcon />
            <span className="sr-only">Effacer la recherche</span>
          </Button>
        ) : null}
      </form>

      <p
        id="recherche-resultats"
        role="status"
        aria-live="polite"
        aria-busy={isFetching}
        className="flex items-center gap-2 text-sm text-muted-foreground"
      >
        {isFetching ? (
          <Loader2Icon className="size-3.5 animate-spin" aria-hidden="true" />
        ) : null}
        {isInitialLoading
          ? 'Recherche en cours…'
          : debouncedQuery
            ? `${total} résultat${total > 1 ? 's' : ''} pour « ${debouncedQuery} »`
            : `${total} membre${total > 1 ? 's' : ''} dans la famille`}
      </p>

      {isError ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Recherche indisponible</AlertTitle>
          <AlertDescription>
            <p>
              {error instanceof Error
                ? error.message
                : 'Une erreur inattendue est survenue.'}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => void refetch()}
            >
              Réessayer
            </Button>
          </AlertDescription>
        </Alert>
      ) : isInitialLoading ? (
        <ul className="space-y-2" aria-hidden="true">
          {Array.from({ length: 5 }).map((_, index) => (
            <li key={index}>
              <Skeleton className="h-20 rounded-xl" />
            </li>
          ))}
        </ul>
      ) : results.length === 0 ? (
        <div className="island-shell rounded-2xl border border-[var(--line)] p-8 text-center">
          <SearchIcon className="mx-auto size-8 text-muted-foreground" />
          <h2 className="display-title mt-3 text-lg font-semibold text-[var(--sea-ink)]">
            {debouncedQuery
              ? 'Aucun membre ne correspond à cette recherche.'
              : 'Aucun membre dans la famille pour le moment.'}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {debouncedQuery
              ? 'Essayez un autre nom, une appellation ou une profession.'
              : 'Les personnes ajoutées apparaîtront ici.'}
          </p>
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {results.map((personne) => (
              <li key={personne.id}>
                <SearchResultItem personne={personne} />
              </li>
            ))}
          </ul>

          {hasNextPage ? (
            <div className="flex justify-center pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={isFetchingNextPage}
                onClick={() => void fetchNextPage()}
              >
                {isFetchingNextPage ? (
                  <Loader2Icon className="animate-spin" />
                ) : null}
                {isFetchingNextPage ? 'Chargement…' : 'Charger plus'}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

function SearchResultItem({ personne }: { personne: SearchPersonne }) {
  const dates = formatDateRange(personne.date_naissance, personne.date_deces)
  const lieu = [personne.ville, personne.pays].filter(Boolean).join(', ')

  return (
    <Link
      to="/app/personnes/$personneId"
      params={{ personneId: personne.id }}
      className="island-shell flex items-center gap-4 rounded-xl border border-[var(--line)] p-4 outline-none transition-colors hover:border-[var(--lagoon-deep)]/50 focus-visible:ring-[3px] focus-visible:ring-[var(--lagoon)]/40"
    >
      <PersonAvatar
        size="lg"
        className="size-12 shrink-0"
        nom={personne.nom}
        prenom={personne.prenom}
        appellation={personne.appellation}
        src={personne.url_img_thumb}
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-medium text-[var(--sea-ink)]">
            {formatPersonneName(personne)}
          </p>
          {personne.appellation ? (
            <span className="truncate text-sm text-muted-foreground">
              « {personne.appellation} »
            </span>
          ) : null}
          {personne.est_lignee_generale ? (
            <Badge variant="outline" className="font-normal">
              Lignée générale
            </Badge>
          ) : null}
        </div>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {[dates, personne.profession, lieu].filter(Boolean).join(' · ') ||
            'Informations à compléter'}
        </p>
      </div>
    </Link>
  )
}
