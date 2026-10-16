import type { Database } from './database.types'

export type { Database }

/** Rôle applicatif (enum `user_role`). */
export type UserRole = Database['public']['Enums']['user_role']

/** Lignes complètes des tables applicatives. */
export type Personne = Database['public']['Tables']['personnes']['Row']
export type PersonneInsert = Database['public']['Tables']['personnes']['Insert']
export type Mariage = Database['public']['Tables']['mariages']['Row']
export type ParentEnfant = Database['public']['Tables']['parent_enfants']['Row']
export type MariageEnfant =
  Database['public']['Tables']['mariage_enfants']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
