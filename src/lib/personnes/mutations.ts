import { useMutation, useQueryClient } from '@tanstack/react-query'

import { getSupabaseBrowserClient } from '../supabase/client'
import {
  mariageEnfantKeys,
  mariageKeys,
  parentEnfantKeys,
  personneKeys,
} from '../supabase/query-keys'
import type { Personne } from '../supabase/types'
import { PersonneError } from './errors'
import { buildPersonnePayload } from './payload'
import type { PersonneFormValues, PhotoUrls, TypeParent } from './types'

export type CreatePersonneVariables = {
  values: PersonneFormValues
  photo: PhotoUrls | null
  typeParent: TypeParent | null
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: personneKeys.all })
      void queryClient.invalidateQueries({ queryKey: mariageKeys.all })
      void queryClient.invalidateQueries({ queryKey: parentEnfantKeys.all })
      void queryClient.invalidateQueries({ queryKey: mariageEnfantKeys.all })
    },
  })
}
