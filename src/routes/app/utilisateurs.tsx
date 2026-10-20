import { createFileRoute } from '@tanstack/react-router'

import { UtilisateursAdmin } from '#/components/utilisateurs/utilisateurs-admin'
import { requireRole } from '#/lib/auth/guards'

export const Route = createFileRoute('/app/utilisateurs')({
  beforeLoad: ({ context }) => {
    // Seul le ROLE_ADMIN accède à la gestion des comptes ; les autres rôles
    // sont renvoyés vers l'accueil connecté.
    requireRole(context.profile, ['ROLE_ADMIN'])
  },
  component: UtilisateursPage,
})

function UtilisateursPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="island-kicker">Administration</p>
        <h1 className="display-title mt-2 text-3xl font-semibold text-[var(--sea-ink)] sm:text-4xl">
          Gestion des utilisateurs
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Attribuez les rôles et la lignée des modérateurs. Chaque changement
          est journalisé et protégé par les règles de sécurité de la base.
        </p>
      </div>

      <UtilisateursAdmin />
    </div>
  )
}
