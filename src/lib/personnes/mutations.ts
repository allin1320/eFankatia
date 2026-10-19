import { useMutation, useQueryClient } from '@tanstack/react-query'

import { getSupabaseBrowserClient } from '../supabase/client'
import {
  mariageEnfantKeys,
  mariageKeys,
  parentEnfantKeys,
  personneKeys,
  searchKeys,
} from '../supabase/query-keys'
import type { Personne } from '../supabase/types'
import { PersonneError } from './errors'
import type { DeletePersonneResult, PhotoUpdate } from './fiche-types'
import { buildPersonnePayload, buildPersonneUpdatePayload } from './payload'
import type { PersonneFormValues, PhotoUrls, TypeParent } from './types'

export type CreatePersonneVariables = {
  values: PersonneFormValues
  photo: PhotoUrls | null
  typeParent: TypeParent | null
}

export type UpdatePersonneVariables = {
  id: string
  values: PersonneFormValues
  photo: PhotoUpdate
  updatedAt: string
}

export type UpdateMariageVariables = {
  id: string
  date_mariage: string | null
  date_fin: string | null
  type_fin: string | null
}

/** Invalide toutes les données dérivées d'une personne ou d'une union. */
function invalidatePersonneGraph(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  void queryClient.invalidateQueries({ queryKey: personneKeys.all })
  void queryClient.invalidateQueries({ queryKey: mariageKeys.all })
  void queryClient.invalidateQueries({ queryKey: parentEnfantKeys.all })
  void queryClient.invalidateQueries({ queryKey: mariageEnfantKeys.all })
  void queryClient.invalidateQueries({ queryKey: searchKeys.all })
}

/** Appelle la bonne RPC `create_personne_*` selon le mode de rattachement. */
async function createPersonne({
  values,
  photo,
  typeParent,
}: CreatePersonneVariables): Promise<Personne> {
  const payload = buildPersonnePayload(values, { photo, typeParent })
  const supabase = getSupabaseBrowserClient()

  switch (values.mode) {
    case 'racine': {
      const { data, error } = await supabase.rpc('create_personne_root', {
        p_new: payload,
      })
      if (error) throw error
      return data
    }
    case 'alliance': {
      if (!values.conjoint_id) {
        throw new PersonneError('Sélectionnez le conjoint ou la conjointe.')
      }
      const { data, error } = await supabase.rpc(
        'create_personne_par_mariage',
        { p_new: payload, p_conjoint_id: values.conjoint_id },
      )
      if (error) throw error
      return data
    }
    case 'naissance_mariage': {
      if (!values.mariage_id) {
        throw new PersonneError('Sélectionnez une union.')
      }
      const { data, error } = await supabase.rpc(
        'create_personne_par_naissance_mariage',
        { p_new: payload, p_mariage_id: values.mariage_id },
      )
      if (error) throw error
      return data
    }
    case 'naissance_parent': {
      if (!values.parent_id) {
        throw new PersonneError('Sélectionnez le parent.')
      }
      const { data, error } = await supabase.rpc(
        'create_personne_par_naissance_parent',
        { p_new: payload, p_parent_id: values.parent_id },
      )
      if (error) throw error
      return data
    }
    default:
      throw new PersonneError('Choisissez un mode de rattachement.')
  }
}

/** Mutation de création d'une personne, avec invalidation du cache. */
export function useCreatePersonne() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createPersonne,
    onSuccess: () => invalidatePersonneGraph(queryClient),
  })
}

/**
 * Mutation de modification.
 *
 * `updated_at` sert de verrou optimiste : si la fiche a changé entre le
 * chargement et l'enregistrement, aucune ligne n'est mise à jour et l'UI
 * invite à recharger.
 */
export function useUpdatePersonne() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      values,
      photo,
      updatedAt,
    }: UpdatePersonneVariables): Promise<Personne> => {
      const payload = buildPersonneUpdatePayload(values, { photo })
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase
        .from('personnes')
        .update(payload)
        .eq('id', id)
        .eq('updated_at', updatedAt)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => invalidatePersonneGraph(queryClient),
  })
}

/** Mutation de suppression (RPC transactionnelle). */
export function useDeletePersonne() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<DeletePersonneResult> => {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase.rpc('delete_personne', {
        p_id: id,
      })
      if (error) throw error
      return data as DeletePersonneResult
    },
    onSuccess: () => invalidatePersonneGraph(queryClient),
  })
}

/** Mutation de modification d'une union. */
export function useUpdateMariage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      date_mariage,
      date_fin,
      type_fin,
    }: UpdateMariageVariables) => {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase
        .from('mariages')
        .update({ date_mariage, date_fin, type_fin })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => invalidatePersonneGraph(queryClient),
  })
}

/** Mutation de suppression d'une union (les personnes restent intactes). */
export function useDeleteMariage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseBrowserClient()
      const { error } = await supabase.from('mariages').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidatePersonneGraph(queryClient),
  })
}
