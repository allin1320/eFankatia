/** Types métier de la création / saisie d'une personne (Phase 5). */

import type { Personne } from '../supabase/types'

/** Sexe stocké dans `personnes.sexe` (texte libre côté base, contraint côté UI). */
export type Sexe = 'M' | 'F'

/** Mode de rattachement choisi dans le formulaire. */
export type RattachementMode =
  'racine' | 'alliance' | 'naissance_mariage' | 'naissance_parent'

/** Rôle du parent pour un rattachement par naissance sans mariage. */
export type TypeParent = 'pere' | 'mere' | 'parent'

/** Préremplissage du formulaire de création depuis une fiche (actions rapides). */
export type PersonneCreatePreset = {
  mode: RattachementMode
  conjointId?: string
  mariageId?: string
  parentId?: string
}

/** URLs renvoyées par l'upload imgbb. */
export type PhotoUrls = {
  urlImg: string
  urlImgThumb: string
}

/** Valeurs du formulaire de création (objet plat, validé par Zod). */
export type PersonneFormValues = {
  nom: string
  prenom: string
  appellation: string
  sexe: '' | Sexe
  numero: string
  nom_facebook: string
  profession: string
  date_naissance: string
  date_deces: string
  decede: boolean
  pays: string
  ville: string
  quartier: string
  mode: '' | RattachementMode
  conjoint_id: string
  mariage_id: string
  parent_id: string
  date_mariage: string
  photo: File | null
}

/** Personne proposée par la recherche de candidats. */
export type PersonneCandidat = {
  id: string
  nom: string | null
  prenom: string | null
  appellation: string | null
  sexe: string | null
  date_naissance: string | null
  date_deces: string | null
  url_img_thumb: string | null
  est_lignee_generale: boolean
}

/** Union proposée par la recherche de candidats. */
export type MariageCandidat = {
  id: string
  date_mariage: string | null
  date_fin: string | null
  type_fin: string | null
  personne_1_id: string
  personne_1_nom: string | null
  personne_1_prenom: string | null
  personne_1_appellation: string | null
  personne_1_sexe: string | null
  personne_1_url_img_thumb: string | null
  personne_2_id: string
  personne_2_nom: string | null
  personne_2_prenom: string | null
  personne_2_appellation: string | null
  personne_2_sexe: string | null
  personne_2_url_img_thumb: string | null
}

/** Personne existante susceptible d'être un doublon. */
export type PersonneDoublon = {
  id: string
  nom: string | null
  prenom: string | null
  appellation: string | null
  date_naissance: string | null
  url_img_thumb: string | null
}

/**
 * Payload `p_new` envoyé aux RPC `create_personne_*`.
 * Les champs absents sont ignorés par le helper SQL `_insert_personne`.
 */
export type PersonneRpcPayload = {
  nom: string
  prenom: string
  appellation: string
  sexe: Sexe
  numero?: string
  nom_facebook?: string
  profession?: string
  date_naissance?: string
  date_deces?: string
  pays?: string
  ville?: string
  quartier?: string
  urlImg?: string
  urlImgThumb?: string
  date_mariage?: string
  type_parent?: TypeParent
}

/** Résultat complet d'une création (pour l'écran de succès). */
export type PersonneCreationResult = {
  personne: Personne
  mode: RattachementMode
  relationLabel: string
}

export const SEXE_LABELS: Record<Sexe, string> = {
  M: 'Masculin',
  F: 'Féminin',
}

export const MODE_LABELS: Record<RattachementMode, string> = {
  racine: 'Ancêtre racine',
  alliance: 'Alliance',
  naissance_mariage: 'Naissance (union)',
  naissance_parent: 'Naissance (parent unique)',
}
