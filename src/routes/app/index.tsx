import { createFileRoute, Link } from '@tanstack/react-router'
import { Lock, Network, Search, UserPlus } from 'lucide-react'

import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { useAuth } from '#/lib/auth/auth-context'
import { ROLE_LABELS } from '#/lib/auth/roles'

export const Route = createFileRoute('/app/')({
  component: Dashboard,
})

const FEATURES = [
  {
    icon: Search,
    title: 'Recherche',
    description: 'Retrouvez un membre par nom, prénom ou profession.',
  },
  {
    icon: Network,
    title: 'Arbre généalogique',
    description: 'Explorez l’arbre de manière interactive et fluide.',
  },
] as const

function Dashboard() {
  const { user, role, isAdmin, isModerator } = useAuth()
  const canCreate = isAdmin || isModerator

  return (
    <div className="space-y-8">
      <section className="rise-in">
        <p className="island-kicker">Bienvenue</p>
        <h1 className="display-title mt-2 text-3xl font-semibold text-[var(--sea-ink)] sm:text-4xl">
          {user?.email ?? 'Bonjour'}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <p className="text-muted-foreground">Votre espace familial</p>
          {role && (
            <Badge variant="secondary" className="font-normal">
              {ROLE_LABELS[role]}
            </Badge>
          )}
        </div>

        {canCreate ? (
          <Button asChild variant="brand" size="lg" className="mt-5">
            <Link to="/app/personnes/nouvelle">
              <UserPlus />
              Ajouter une personne
            </Link>
          </Button>
        ) : null}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, description }) => (
          <article key={title} className="feature-card rounded-2xl p-6">
            <span className="flex size-10 items-center justify-center rounded-xl bg-[var(--sand)] text-[var(--palm)]">
              <Icon className="size-5" />
            </span>
            <h2 className="mt-4 text-base font-semibold text-[var(--sea-ink)]">
              {title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            <Badge variant="outline" className="mt-4">
              Bientôt disponible
            </Badge>
          </article>
        ))}

        <article className="feature-card rounded-2xl p-6">
          <span className="flex size-10 items-center justify-center rounded-xl bg-[var(--sand)] text-[var(--palm)]">
            <UserPlus className="size-5" />
          </span>
          <h2 className="mt-4 text-base font-semibold text-[var(--sea-ink)]">
            Ajouter une personne
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enrichissez l’histoire de la famille en créant une nouvelle fiche.
          </p>
          {canCreate ? (
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link to="/app/personnes/nouvelle">Commencer</Link>
            </Button>
          ) : (
            <Badge variant="outline" className="mt-4 gap-1.5 font-normal">
              <Lock className="size-3.5" aria-hidden="true" />
              Lecture seule
            </Badge>
          )}
        </article>
      </section>
    </div>
  )
}
