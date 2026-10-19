import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowLeftIcon,
  CircleAlertIcon,
  RefreshCwIcon,
  ShieldAlertIcon,
} from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { PersonneEditForm } from '#/components/personnes/personne-edit-form'
import { useAuth } from '#/lib/auth/auth-context'
import { requireRole } from '#/lib/auth/guards'
import { usePersonneFiche } from '#/lib/personnes/queries'

export const Route = createFileRoute('/app/personnes/$personneId/modifier')({
  beforeLoad: ({ context }) => {
    requireRole(context.profile, ['ROLE_ADMIN', 'ROLE_MODERATEUR'])
  },
  component: ModifierPersonnePage,
})

function ModifierPersonnePage() {
  const { personneId } = Route.useParams()
  const { profile } = useAuth()
  const {
    data: fiche,
    isPending,
    isError,
    error,
    refetch,
  } = usePersonneFiche(personneId)

  const isSelf = profile?.personne_id === personneId

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/app/personnes/$personneId" params={{ personneId }}>
          <ArrowLeftIcon />
          Retour à la fiche
        </Link>
      </Button>

      <div>
        <p className="island-kicker">Modification</p>
        <h1 className="display-title mt-2 text-3xl font-semibold text-[var(--sea-ink)] sm:text-4xl">
          Mettre à jour la fiche
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Les liens familiaux ne sont pas modifiés ici : utilisez les actions
          rapides depuis la fiche.
        </p>
      </div>

      {isSelf ? (
        <Alert>
          <ShieldAlertIcon />
          <AlertTitle>Personne de référence</AlertTitle>
          <AlertDescription>
            Cette fiche est le point d’ancrage de votre lignée. La modifier ne
            change pas votre périmètre d’écriture.
          </AlertDescription>
        </Alert>
      ) : null}

      {isPending ? (
        <div className="space-y-4" aria-busy="true">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
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
      ) : fiche && !fiche.can_edit ? (
        <Alert variant="destructive">
          <ShieldAlertIcon />
          <AlertTitle>Modification non autorisée</AlertTitle>
          <AlertDescription>
            Cette personne n’appartient pas à votre lignée. Seul un
            administrateur ou le modérateur de sa lignée peut la modifier.
          </AlertDescription>
        </Alert>
      ) : fiche ? (
        <PersonneEditForm personne={fiche.personne} />
      ) : (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Fiche introuvable</AlertTitle>
          <AlertDescription>
            Cette personne n’existe pas ou a été supprimée.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
