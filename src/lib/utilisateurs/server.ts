import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { getSupabaseAdminClient } from '../supabase/admin'
import { getSupabaseServerClient } from '../supabase/server'

const createUtilisateurInput = z.object({
  email: z.string().trim().toLowerCase().email('Adresse e-mail invalide.'),
  password: z
    .string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères.')
    .max(72, 'Le mot de passe ne peut pas dépasser 72 caractères.'),
  role: z.enum(['ROLE_ADMIN', 'ROLE_MODERATEUR', 'ROLE_USER']),
  personneId: z.string().uuid().nullable().optional(),
})

export type CreateUtilisateurInput = z.infer<typeof createUtilisateurInput>

export type CreateUtilisateurResult = {
  id: string
  email: string
}

const updateUtilisateurPasswordInput = z.object({
  userId: z.string().uuid('Utilisateur invalide.'),
  password: z
    .string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères.')
    .max(72, 'Le mot de passe ne peut pas dépasser 72 caractères.'),
})

export type UpdateUtilisateurPasswordInput = z.infer<
  typeof updateUtilisateurPasswordInput
>

export type UpdateUtilisateurPasswordResult = {
  id: string
  email: string | null
}

/** Traduit les erreurs Auth/Admin en messages compréhensibles. */
function mapAuthAdminError(message: string): string {
  const normalized = message.toLowerCase()

  if (
    normalized.includes('already registered') ||
    normalized.includes('already been registered') ||
    normalized.includes('user already exists') ||
    normalized.includes('duplicate')
  ) {
    return 'Un compte existe déjà avec cette adresse e-mail.'
  }

  if (normalized.includes('invalid email')) {
    return 'Adresse e-mail invalide.'
  }

  if (normalized.includes('password')) {
    return 'Le mot de passe ne respecte pas les règles de sécurité.'
  }

  if (
    normalized.includes('user not found') ||
    normalized.includes('not found')
  ) {
    return 'Utilisateur introuvable.'
  }

  return message
}

/** Vérifie que la requête provient bien d'un administrateur connecté. */
async function requireAdminSession() {
  const supabase = getSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Authentification requise.')
  }

  const { data: role, error: roleError } = await supabase.rpc('current_role')

  if (roleError) {
    throw new Error('Impossible de vérifier vos droits pour le moment.')
  }

  if (role !== 'ROLE_ADMIN') {
    throw new Error('Accès refusé : rôle administrateur requis.')
  }

  return { supabase, user }
}

/**
 * Crée un compte utilisateur (Supabase Auth) puis applique son rôle et sa
 * lignée via la RPC admin existante.
 *
 * La création Auth nécessite la clé service role : elle reste strictement
 * côté serveur. L'appelant doit être authentifié et `ROLE_ADMIN`.
 */
export const createUtilisateur = createServerFn({ method: 'POST' })
  .validator(createUtilisateurInput)
  .handler(async ({ data }): Promise<CreateUtilisateurResult> => {
    const { supabase } = await requireAdminSession()

    if (data.role === 'ROLE_MODERATEUR' && !data.personneId) {
      throw new Error(
        'Sélectionnez la personne à laquelle rattacher la lignée du modérateur.',
      )
    }

    const admin = getSupabaseAdminClient()
    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
      })

    if (createError) {
      throw new Error(mapAuthAdminError(createError.message))
    }

    const userId = created.user.id

    try {
      // RPC appelée avec la session de l'admin : gardes, lignée et audit
      // restent identiques à une modification depuis l'interface.
      const { error: roleUpdateError } = await supabase.rpc(
        'admin_update_profile_role',
        {
          p_user_id: userId,
          p_role: data.role,
          p_personne_id:
            data.role === 'ROLE_MODERATEUR'
              ? (data.personneId ?? undefined)
              : undefined,
        },
      )

      if (roleUpdateError) throw roleUpdateError
    } catch (error) {
      // Compensation : ne jamais laisser un compte Auth sans rôle appliqué.
      await admin.auth.admin.deleteUser(userId)
      throw new Error(
        error instanceof Error
          ? `Le compte n’a pas pu être configuré : ${error.message}`
          : 'Le compte n’a pas pu être configuré.',
      )
    }

    return { id: userId, email: data.email }
  })

/**
 * Modifie le mot de passe d'un compte utilisateur.
 *
 * Réservé au `ROLE_ADMIN`, via l'Admin API Supabase (clé service role côté
 * serveur). Aucun mot de passe n'est journalisé.
 */
export const updateUtilisateurPassword = createServerFn({ method: 'POST' })
  .validator(updateUtilisateurPasswordInput)
  .handler(async ({ data }): Promise<UpdateUtilisateurPasswordResult> => {
    await requireAdminSession()

    const admin = getSupabaseAdminClient()
    const { data: target, error: targetError } =
      await admin.auth.admin.getUserById(data.userId)

    if (targetError) {
      throw new Error('Utilisateur introuvable.')
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(
      data.userId,
      { password: data.password },
    )

    if (updateError) {
      throw new Error(mapAuthAdminError(updateError.message))
    }

    return { id: target.user.id, email: target.user.email ?? null }
  })
