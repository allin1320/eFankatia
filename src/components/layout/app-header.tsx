import { Link } from '@tanstack/react-router'
import { Network, Search, TreeDeciduous } from 'lucide-react'

import { Button } from '#/components/ui/button'
import { ThemeToggle } from './theme-toggle'
import { UserMenu } from './user-menu'

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-[var(--header-bg)] backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          to="/app"
          className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--lagoon)] to-[var(--palm)] text-white shadow-sm">
            <TreeDeciduous className="size-5" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="display-title text-lg font-semibold text-[var(--sea-ink)]">
              eFankatia
            </span>
            <span className="mt-0.5 text-[11px] font-medium tracking-wide text-muted-foreground">
              Arbre familial
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="size-11 sm:size-9"
          >
            <Link to="/app/arbre" search={{}}>
              <Network />
              <span className="sr-only">Arbre généalogique</span>
            </Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="size-11 sm:size-9"
          >
            <Link to="/app/recherche" search={{ q: '', notice: undefined }}>
              <Search />
              <span className="sr-only">Rechercher un membre</span>
            </Link>
          </Button>
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
