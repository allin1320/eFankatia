import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

import { AppHeader } from '#/components/layout/app-header'

export const Route = createFileRoute('/app')({
  beforeLoad: ({ context, location }) => {
    if (!context.user) {
      throw redirect({
        to: '/login',
        search: { redirect: location.pathname },
      })
    }
  },
  component: AppLayout,
})

function AppLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:py-10">
        <Outlet />
      </main>
    </div>
  )
}
