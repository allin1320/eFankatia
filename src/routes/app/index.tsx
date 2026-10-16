import { createFileRoute } from '@tanstack/react-router'
import { Network, Search, UserPlus } from 'lucide-react'

import { Badge } from '#/components/ui/badge'
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
  {
    icon: UserPlus,
    title: 'Ajouter une personne',
    description: 'Enrichissez l’histoire de la famille.',
  },
] as const

function Dashboard() {
  const { user, role } = useAuth()

  return (
    <div className="space-y-8">
      <section className="rise-in">
        <p className="island-kicker">Bienvenue</p>
        <h1 className="display-title mt-2 text-3xl font-semibold text-[var(--sea-ink)] sm:text-4xl">
          {user?.email ?? 'Bonjour'}
        </h1>
        <div className="mt-3 flex items-center gap-2">
          <p className="text-muted-foreground">Votre espace familial</p>
          {role && (
            <Badge variant="secondary" className="font-normal">
              {ROLE_LABELS[role]}
            </Badge>
          )}
        </div>
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
      </section>
    </div>
  )
}
