/** Types de la fiche détaillée, des actions rapides et de la recherche. */

import type { Personne } from '../supabase/types'

/** Personne résumée utilisée dans les relations et les listes. */
export type PersonneResume = {
  id: string
  nom: string | null
  prenom: string | null
  appellation: string | null
  sexe: string | null
  date_naissance: string | null
  date_deces: string | null
  url_img_thumb: string | null
}

/** Parent direct, avec le rôle enregistré dans `parent_enfants`. */
export type PersonneParent = PersonneResume & {
  type_parent: string | null
}

/** Enfant direct, avec l'union d'origine si elle est connue. */
export type PersonneEnfant = PersonneResume & {
  type_parent: string | null
  mariage_id: string | null
}

/** Union affichée sur la fiche, du point de vue de la personne consultée. */
export type PersonneUnion = {
  id: string
  date_mariage: string | null
  date_fin: string | null
  type_fin: string | null
  conjoint: PersonneResume
  enfants: PersonneResume[]
}

/** Réponse de la RPC `get_personne_fiche`. */
export type PersonneFiche = {
  personne: Personne
  parents: PersonneParent[]
  unions: PersonneUnion[]
  enfants: PersonneEnfant[]
  can_edit: boolean
  can_delete: boolean
}

/** Compteurs renvoyés par la RPC `delete_personne`. */
export type DeletePersonneResult = {
  unions_supprimees: number
  liens_enfants: number
  liens_parents: number
}

/** Ligne renvoyée par la RPC `search_personnes`. */
export type SearchPersonne = {
  id: string
  nom: string | null
  prenom: string | null
  appellation: string | null
  sexe: string | null
  profession: string | null
  date_naissance: string | null
  date_deces: string | null
  ville: string | null
  pays: string | null
  url_img_thumb: string | null
  est_lignee_generale: boolean
  total_count: number
}

/** Photo lors d'une modification : conserver, remplacer ou retirer. */
export type PhotoUpdate =
  | { kind: 'keep' }
  | { kind: 'set'; urls: { urlImg: string; urlImgThumb: string } }
  | { kind: 'remove' }

/** Libellés des types de fin d'union. */
export const TYPE_FIN_LABELS: Record<string, string> = {
  divorce: 'Divorce',
  veuvage: 'Veuvage',
  separation: 'Séparation',
  autre: 'Autre',
}
