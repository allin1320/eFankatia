import type { PostgrestError } from '@supabase/supabase-js'

/** Erreur métier de création de personne (message déjà prêt pour l'UI). */
export class PersonneError extends Error {
  readonly code?: string

  constructor(message: string, code?: string) {
    super(message)
    this.name = 'PersonneError'
    this.code = code
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isPostgrestError(error: unknown): error is PostgrestError {
  return (
    isObject(error) &&
    typeof error.message === 'string' &&
    typeof error.code === 'string'
  )
}

function isUnauthorized(error: PostgrestError): boolean {
  return (
    error.code === '42501' ||
    error.message.includes('Accès refusé') ||
    error.message.includes('Accès refusé :')
  )
}

function isSessionExpired(error: PostgrestError): boolean {
  return (
    error.code === 'PGRST301' ||
    error.message.toLowerCase().includes('jwt expired') ||
    error.message.toLowerCase().includes('invalid claim')
  )
}

/** Traduit une erreur Supabase/RPC en message affichable dans le formulaire. */
export function mapPersonneError(error: unknown): string {
  if (error instanceof PersonneError) return error.message

  if (typeof error === 'string' && error.trim() !== '') return error

  if (isPostgrestError(error)) {
    if (isSessionExpired(error)) {
      return 'Votre session a expiré. Reconnectez-vous puis réessayez.'
    }

    if (isUnauthorized(error)) {
      return 'Action non autorisée : cette personne ne fait pas partie de votre lignée.'
    }

    if (error.code === '23505') {
      return "Une personne avec ce nom et ce prénom existe déjà. Renseignez une date de naissance différente s'il s'agit d'une autre personne."
    }

    if (error.code === '23514') {
      return 'Relation invalide : vérifiez les personnes sélectionnées.'
    }

    if (error.message.toLowerCase().includes('introuvable')) {
      return "La sélection n'existe plus. Actualisez la liste puis réessayez."
    }

    return 'La création a échoué. Vérifiez les informations saisies puis réessayez.'
  }

  if (error instanceof Error && error.message.trim() !== '') {
    return error.message
  }

  return 'Une erreur inattendue est survenue. Réessayez dans quelques instants.'
}

/** Traduit une erreur d'upload de photo en message affichable. */
export function mapPhotoError(error: unknown): string {
  if (error instanceof Error && error.message.trim() !== '') {
    return error.message
  }

  if (isPostgrestError(error)) {
    if (isSessionExpired(error)) {
      return 'Votre session a expiré. Reconnectez-vous puis réessayez.'
    }
    return "L'envoi de la photo a échoué. Vous pouvez réessayer ou créer la personne sans photo."
  }

  return "L'envoi de la photo a échoué. Vous pouvez réessayer ou créer la personne sans photo."
}
