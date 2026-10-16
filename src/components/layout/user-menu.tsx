'use client'

import { LogOut } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'

import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { useAuth } from '#/lib/auth/auth-context'
import { ROLE_LABELS } from '#/lib/auth/roles'
import { getSupabaseBrowserClient } from '#/lib/supabase/client'

function initials(email: string | null): string {
  const source = email?.trim()
  if (!source) return '?'
  return source.charAt(0).toUpperCase()
}

export function UserMenu() {
  const { user, role } = useAuth()
  const navigate = useNavigate()

  if (!user) return null

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient()
    await supabase.auth.signOut()
    await navigate({ to: '/login', replace: true })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-10 gap-2 px-2"
          aria-label="Menu utilisateur"
        >
          <Avatar className="size-8">
            <AvatarFallback>{initials(user.email)}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-36 truncate text-sm text-foreground sm:inline">
            {user.email}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate text-sm font-medium">
            {user.email}
          </span>
          {role && (
            <Badge variant="secondary" className="mt-1.5 font-normal">
              {ROLE_LABELS[role]}
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => void handleSignOut()}
        >
          <LogOut />
          Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
