import { createFileRoute, Link } from '@tanstack/react-router'
import { CircleAlertIcon, NetworkIcon, RefreshCwIcon } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { ArbreView } from '#/components/personnes/arbre/arbre-view'
import { validateArbreSearch } from '#/lib/personnes/navigation'
import { usePersonneRacine } from '#/lib/personnes/queries'

export const Route = createFileRoute('/app/arbre')({
  validateSearch: validateArbreSearch,
  component: ArbrePage,
})

function ArbrePage() {
  const { personne, complet } = Route.useSearch()

  if (personne) {
    const isComplet = complet === true
    return (
      <ArbreView
        personneId={personne}
        complet={isComplet}
        fromFiche={isComplet}
      />
    )
  }

  return <ArbreRacine />
}

/** Arbre par défaut : racine familiale, trois générations à l'écran. */
function ArbreRacine() {
  const { data, isPending, isError, error, refetch } = usePersonneRacine()

  if (isPending) {
    return (
      <div className="space-y-6" aria-busy="true" aria-live="polite">
        <span className="sr-only">Chargement de l’arbre…</span>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[72vh] min-h-[520px] rounded-2xl" />
      </div>
    )
  }

  if (isError) {
    return (
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
    )
  }

  if (!data) {
    return (
      <div className="island-shell mx-auto max-w-xl rounded-2xl border border-[var(--line)] p-8 text-center">
        <NetworkIcon className="mx-auto size-8 text-muted-foreground" />
        <h1 className="display-title mt-3 text-2xl font-semibold text-[var(--sea-ink)]">
          Aucun membre dans la famille
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ajoutez une première personne pour voir l’arbre familial apparaître.
        </p>
        <Button asChild variant="brand" className="mt-5">
          <Link to="/app/personnes/nouvelle">Ajouter une personne</Link>
        </Button>
      </div>
    )
  }

  return <ArbreView personneId={data} complet={false} />
}
