import { useMutation, useQueryClient } from '@tanstack/react-query'

import { getSupabaseBrowserClient } from '../supabase/client'
import { utilisateurKeys } from '../supabase/query-keys'
import type { UserRole } from '../supabase/types'
import { createUtilisateur } from './server'

export type CreateUtilisateurVariables = {
  email: string
  password: string
  role: UserRole
  personneId: string | null
}

export type UpdateUtilisateurRoleVariables = {
  userId: string
  role: UserRole
  /** Obligatoire pour ROLE_MODERATEUR, ignoré pour les autres rôles. */
  personneId: string | null
}

/**
 * Mutation de création d'un compte utilisateur.
 *
 * L'appel réseau passe par une server function (clé service role côté
 * serveur) ; la liste admin est invalidée au succès.
 */
export function useCreateUtilisateur() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variables: CreateUtilisateurVariables) => {
      return createUtilisateur({
        data: {
          email: variables.email.trim(),
          password: variables.password,
          role: variables.role,
          personneId: variables.personneId,
        },
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: utilisateurKeys.all })
    },
  })
}

/**
 * Mutation de rôle + lignée.
 *
 * Les gardes (dernier administrateur, auto-rétrogradation, lignée d'un
 * modérateur) sont appliquées en base ; l'UI ne fait que prévenir l'utilisateur.
 */
export function useUpdateUtilisateurRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      userId,
      role,
      personneId,
    }: UpdateUtilisateurRoleVariables): Promise<void> => {
      const supabase = getSupabaseBrowserClient()
      const { error } = await supabase.rpc('admin_update_profile_role', {
        p_user_id: userId,
        p_role: role,
        p_personne_id:
          role === 'ROLE_MODERATEUR' ? (personneId ?? undefined) : undefined,
      })
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: utilisateurKeys.all })
    },
  })
}
