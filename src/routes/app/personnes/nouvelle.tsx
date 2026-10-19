import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeftIcon, ShieldAlertIcon } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { PersonneForm } from '#/components/personnes/personne-form'
import { useAuth } from '#/lib/auth/auth-context'
import { requireRole } from '#/lib/auth/guards'

export const Route = createFileRoute('/app/personnes/nouvelle')({
  beforeLoad: ({ context }) => {
    requireRole(context.profile, ['ROLE_ADMIN', 'ROLE_MODERATEUR'])
  },
  component: NouvellePersonnePage,
})

function NouvellePersonnePage() {
  const { isModerator, profile } = useAuth()
  const ligneeManquante = isModerator && !profile?.personne_id

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
          <Link to="/app">
            <ArrowLeftIcon />
            Retour à l’accueil
          </Link>
        </Button>
        <p className="island-kicker">Ajouter une personne</p>
        <h1 className="display-title mt-2 text-3xl font-semibold text-[var(--sea-ink)] sm:text-4xl">
          Une nouvelle branche de l’histoire familiale
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Renseignez l’état civil, la photo et le rattachement de la personne.
          L’aperçu se met à jour au fil de la saisie.
        </p>
      </div>

      {ligneeManquante ? (
        <Alert variant="destructive">
          <ShieldAlertIcon />
          <AlertTitle>Lignée non configurée</AlertTitle>
          <AlertDescription>
            Votre compte modérateur n’est rattaché à aucune personne. Contactez
            un administrateur pour configurer votre lignée.
          </AlertDescription>
        </Alert>
      ) : (
        <PersonneForm />
      )}
    </div>
  )
}
