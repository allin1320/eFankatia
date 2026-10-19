import { createFileRoute } from '@tanstack/react-router'

import { PersonneSearch } from '#/components/search/personne-search'
import { validateSearchPersonnesSearch } from '#/lib/personnes/navigation'

export const Route = createFileRoute('/app/recherche')({
  validateSearch: validateSearchPersonnesSearch,
  component: RecherchePage,
})

function RecherchePage() {
  const { q, notice } = Route.useSearch()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="island-kicker">Recherche</p>
        <h1 className="display-title mt-2 text-3xl font-semibold text-[var(--sea-ink)] sm:text-4xl">
          Retrouver un membre de la famille
        </h1>
        <p className="mt-2 text-muted-foreground">
          Recherchez par nom, prénom, appellation ou profession. La recherche
          ignore les accents et la casse.
        </p>
      </div>

      <PersonneSearch initialQuery={q ?? ''} notice={notice} />
    </div>
  )
}
