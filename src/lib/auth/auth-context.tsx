import { createContext, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'

import type { UserRole } from '../supabase/types'
import type { AppProfile, AppUser } from './types'

export type AuthStatus = {
  user: AppUser | null
  profile: AppProfile | null
  role: UserRole | null
  isAuthenticated: boolean
  isAdmin: boolean
  isModerator: boolean
}

const AuthContext = createContext<AuthStatus | null>(null)

export function AuthProvider({
  user,
  profile,
  children,
}: {
  user: AppUser | null
  profile: AppProfile | null
  children: ReactNode
}) {
  const role = profile?.role ?? null

  const value = useMemo<AuthStatus>(
    () => ({
      user,
      profile,
      role,
      isAuthenticated: user !== null,
      isAdmin: role === 'ROLE_ADMIN',
      isModerator: role === 'ROLE_MODERATEUR',
    }),
    [user, profile, role],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthStatus {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth doit être utilisé à l’intérieur de <AuthProvider>')
  }
  return context
}
