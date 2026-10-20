/** Types de la gestion des utilisateurs (ROLE_ADMIN uniquement, Phase 9). */

import type { UserRole } from '../supabase/types'

/** Taille de page de la liste d'administration. */
export const UTILISATEURS_PAGE_SIZE = 20

/**
 * Ligne renvoyée par la RPC `admin_list_profiles`.
 *
 * Les colonnes nullables le sont réellement côté base : le type généré par
 * Supabase ne modélise pas la nullabilité des fonctions `returns table`, on la
 * rétablit donc ici.
 */
export type AdminUtilisateur = {
  id: string
  email: string | null
  role: UserRole
  personne_id: string | null
  personne_nom: string | null
  personne_prenom: string | null
  personne_appellation: string | null
  personne_url_img_thumb: string | null
  created_at: string
  updated_at: string
  total_count: number
  /** Nombre total d'administrateurs (toutes pages / tous filtres confondus). */
  admin_count: number
}

/** Filtres de la liste d'administration. */
export type AdminUtilisateursFiltres = {
  query: string
  role: UserRole | null
  page: number
}
