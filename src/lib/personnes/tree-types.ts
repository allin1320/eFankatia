/** Types de l'arbre généalogique interactif (Phase 8). */

/** Personne telle que renvoyée par la RPC `get_arbre_personne`. */
export type ArbrePersonne = {
  id: string
  nom: string | null
  prenom: string | null
  appellation: string | null
  sexe: string | null
  date_naissance: string | null
  date_deces: string | null
  url_img_thumb: string | null
  est_lignee_generale: boolean
  /** Ascendants en négatif, descendant en positif, personne focalisée = 0. */
  generation: number
}

/** Union entre deux personnes de l'arbre. */
export type ArbreMariage = {
  id: string
  personne_1_id: string
  personne_2_id: string
  date_mariage: string | null
  date_fin: string | null
  type_fin: string | null
}

/** Lien direct parent → enfant. */
export type ArbreParentEnfant = {
  parent_id: string
  enfant_id: string
  type_parent: string | null
}

/** Association enfant ↔ union d'origine. */
export type ArbreMariageEnfant = {
  mariage_id: string
  enfant_id: string
}

/** Réponse de la RPC `get_arbre_personne`. */
export type ArbrePersonneData = {
  focus_id: string
  personnes: ArbrePersonne[]
  mariages: ArbreMariage[]
  parent_enfants: ArbreParentEnfant[]
  mariage_enfants: ArbreMariageEnfant[]
}

/** Profondeur affichée par défaut (3 générations ascendants + 3 descendants). */
export const ARBRE_BASE_DEPTH = 3
/** Profondeur maximale chargée depuis la base (bornée par la RPC). */
export const ARBRE_FETCH_DEPTH = 6
