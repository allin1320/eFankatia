import { createFileRoute, redirect } from '@tanstack/react-router'
import { TreeDeciduous } from 'lucide-react'
import { z } from 'zod'

import { LoginForm } from '#/components/auth/login-form'

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/login')({
  validateSearch: loginSearchSchema,
  beforeLoad: ({ context }) => {
    if (context.user) {
      throw redirect({ to: '/app' })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--lagoon)] to-[var(--palm)] text-white shadow-lg">
            <TreeDeciduous className="size-6" />
          </span>
          <div>
            <h1 className="display-title text-2xl font-semibold text-[var(--sea-ink)]">
              eFankatia
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Connectez-vous pour explorer votre arbre familial
            </p>
          </div>
        </div>

        <div className="island-shell rounded-2xl p-6 sm:p-8">
          <LoginForm />
        </div>
      </div>
    </main>
  )
}
