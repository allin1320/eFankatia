import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import type { ReactNode } from 'react'

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
  }),
  shellComponent: RootDocument,
  component: RootComponent,
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

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
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
