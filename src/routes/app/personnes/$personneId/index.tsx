import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeftIcon, CircleAlertIcon, RefreshCwIcon } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { PersonneFicheView } from '#/components/personnes/fiche/personne-fiche'
import { useAuth } from '#/lib/auth/auth-context'
import { usePersonneFiche } from '#/lib/personnes/queries'

export const Route = createFileRoute('/app/personnes/$personneId/')({
  component: PersonneFichePage,
})

function PersonneFichePage() {
  const { personneId } = Route.useParams()
  const { profile } = useAuth()
  const {
    data: fiche,
    isPending,
    isError,
    error,
    refetch,
  } = usePersonneFiche(personneId)

  const isOwnLignee = profile?.personne_id === personneId

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/app/recherche" search={{ q: '', notice: undefined }}>
          <ArrowLeftIcon />
          Retour à la recherche
        </Link>
      </Button>

      {isPending ? (
        <FicheSkeleton />
      ) : isError ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Impossible de charger la fiche</AlertTitle>
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
      ) : fiche ? (
        <PersonneFicheView fiche={fiche} isOwnLignee={isOwnLignee} />
      ) : (
        <div className="island-shell mx-auto max-w-xl rounded-2xl border border-[var(--line)] p-8 text-center">
          <p className="island-kicker">Fiche introuvable</p>
          <h1 className="display-title mt-2 text-2xl font-semibold text-[var(--sea-ink)]">
            Cette personne n’existe pas ou a été supprimée.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Vérifiez le lien ou revenez à la recherche pour retrouver un membre
            de la famille.
          </p>
          <Button asChild variant="brand" className="mt-5">
            <Link to="/app/recherche" search={{ q: '', notice: undefined }}>
              Retour à la recherche
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}

function FicheSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Chargement de la fiche…</span>
      <div className="island-shell rounded-2xl border border-[var(--line)] p-5 sm:p-6">
        <div className="flex gap-5">
          <Skeleton className="size-24 shrink-0 rounded-full" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-10 w-full max-w-md" />
          </div>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  )
}
