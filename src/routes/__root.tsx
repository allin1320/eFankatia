import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { CircleAlertIcon, RefreshCwIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '#/components/ui/button'
import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'
import type { RouterContext } from '../integrations/tanstack-query/root-provider'
import { ThemeProvider } from '../components/layout/theme-provider'
import { AuthProvider } from '../lib/auth/auth-context'
import { getSession } from '../lib/auth/session'

import appCss from '../styles.css?url'

const themeInitScript = `(function(){try{var t=localStorage.getItem('efankatia-theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async () => {
    const session = await getSession()
    return { user: session.user, profile: session.profile }
  },
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'eFankatia — Arbre généalogique familial' },
      {
        name: 'description',
        content:
          'Application familiale pour retracer l’histoire de la famille et explorer l’arbre généalogique.',
      },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
    // Injecté dans le <head> par le routeur (évite le warning React sur les
    // balises <script> rendues dans un composant).
    scripts: [{ children: themeInitScript }],
  }),
  shellComponent: RootDocument,
  component: RootComponent,
  notFoundComponent: RootNotFound,
  errorComponent: RootError,
})

function RootComponent() {
  const context = Route.useRouteContext()

  return (
    <ThemeProvider>
      <AuthProvider user={context.user} profile={context.profile}>
        <Outlet />
      </AuthProvider>
    </ThemeProvider>
  )
}

function RootNotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="island-shell w-full max-w-lg rounded-2xl border border-[var(--line)] p-8 text-center">
        <p className="island-kicker">Erreur 404</p>
        <h1 className="display-title mt-2 text-2xl font-semibold text-[var(--sea-ink)]">
          Page introuvable
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          La page demandée n’existe pas ou a été déplacée.
        </p>
        <Button asChild variant="brand" className="mt-6">
          <Link to="/app">Retour à l’accueil</Link>
        </Button>
      </div>
    </main>
  )
}

function RootError({ error, reset }: ErrorComponentProps) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div
        role="alert"
        className="island-shell w-full max-w-lg rounded-2xl border border-[var(--line)] p-8 text-center"
      >
        <CircleAlertIcon
          className="mx-auto size-8 text-destructive"
          aria-hidden="true"
        />
        <p className="island-kicker mt-3">Erreur inattendue</p>
        <h1 className="display-title mt-2 text-2xl font-semibold text-[var(--sea-ink)]">
          Une erreur est survenue
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error instanceof Error && error.message
            ? error.message
            : 'Erreur inconnue.'}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button type="button" variant="brand" onClick={reset}>
            <RefreshCwIcon />
            Réessayer
          </Button>
          <Button asChild variant="outline">
            <Link to="/app">Retour à l’accueil</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
