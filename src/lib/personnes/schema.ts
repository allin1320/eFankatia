import { z } from 'zod'

import type { Personne } from '../supabase/types'
import type { PersonneFormValues } from './types'

/** Date ISO `YYYY-MM-DD` ou chaîne vide (champ optionnel). */
const optionalDate = z
  .string()
  .trim()
  .refine(
    (value) => value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value),
    'Date invalide (format attendu : AAAA-MM-JJ).',
  )

const optionalText = (max: number, message: string) =>
  z.string().trim().max(max, message)

/**
 * Schéma de base (champs unitaires), réutilisé par les validateurs au blur.
 */
export const personneBaseSchema = z.object({
  nom: z
    .string()
    .trim()
    .min(1, 'Le nom est obligatoire.')
    .max(120, 'Le nom ne peut pas dépasser 120 caractères.'),
  prenom: z
    .string()
    .trim()
    .min(1, 'Le prénom est obligatoire.')
    .max(120, 'Le prénom ne peut pas dépasser 120 caractères.'),
  appellation: z
    .string()
    .trim()
    .min(1, "L'appellation est obligatoire.")
    .max(120, "L'appellation ne peut pas dépasser 120 caractères."),
  sexe: z.enum(['M', 'F'], {
    message: 'Le sexe est obligatoire.',
  }),
  numero: z
    .string()
    .trim()
    .max(30, 'Le numéro ne peut pas dépasser 30 caractères.')
    .refine(
      (value) => value === '' || /^[\d+\s().-]{6,30}$/.test(value),
      'Numéro de téléphone invalide.',
    ),
  nom_facebook: optionalText(150, 'Le nom Facebook est trop long.'),
  profession: optionalText(
    120,
    'La profession ne peut pas dépasser 120 caractères.',
  ),
  date_naissance: optionalDate,
  date_deces: optionalDate,
  decede: z.boolean(),
  pays: optionalText(100, 'Le pays ne peut pas dépasser 100 caractères.'),
  ville: optionalText(120, 'La ville ne peut pas dépasser 120 caractères.'),
  quartier: optionalText(
    120,
    'Le quartier ne peut pas dépasser 120 caractères.',
  ),
  mode: z.enum(
    ['racine', 'alliance', 'naissance_mariage', 'naissance_parent'],
    { message: 'Choisissez un mode de rattachement.' },
  ),
  conjoint_id: z.string(),
  mariage_id: z.string(),
  parent_id: z.string(),
  date_mariage: optionalDate,
  photo: z.custom<File | null>(
    (value) => value === null || (value instanceof Object && 'size' in value),
    'Photo invalide.',
  ),
})

/**
 * Règles de validation du formulaire de création.
 *
 * Les champs requis sont : nom, prénom, appellation et sexe. Les règles
 * conditionnelles (mode de rattachement) et de cohérence des dates sont
 * vérifiées via `superRefine`.
 */
export const personneSchema = personneBaseSchema.superRefine((value, ctx) => {
  const today = new Date()
  today.setHours(23, 59, 59, 999)

  const naissance = value.date_naissance
    ? new Date(`${value.date_naissance}T00:00:00`)
    : null
  const deces = value.date_deces
    ? new Date(`${value.date_deces}T00:00:00`)
    : null
  const mariage = value.date_mariage
    ? new Date(`${value.date_mariage}T00:00:00`)
    : null

  if (naissance && naissance.getTime() > today.getTime()) {
    ctx.addIssue({
      code: 'custom',
      path: ['date_naissance'],
      message: 'La date de naissance ne peut pas être dans le futur.',
    })
  }

  if (deces && deces.getTime() > today.getTime()) {
    ctx.addIssue({
      code: 'custom',
      path: ['date_deces'],
      message: 'La date de décès ne peut pas être dans le futur.',
    })
  }

  if (naissance && deces && deces.getTime() < naissance.getTime()) {
    ctx.addIssue({
      code: 'custom',
      path: ['date_deces'],
      message: 'La date de décès doit être postérieure à la naissance.',
    })
  }

  if (mariage && mariage.getTime() > today.getTime()) {
    ctx.addIssue({
      code: 'custom',
      path: ['date_mariage'],
      message: "La date de l'union ne peut pas être dans le futur.",
    })
  }

  if (mariage && naissance && mariage.getTime() < naissance.getTime()) {
    ctx.addIssue({
      code: 'custom',
      path: ['date_mariage'],
      message: "La date de l'union doit être postérieure à la naissance.",
    })
  }

  if (value.mode === 'alliance' && !value.conjoint_id) {
    ctx.addIssue({
      code: 'custom',
      path: ['conjoint_id'],
      message: 'Sélectionnez le conjoint ou la conjointe.',
    })
  }

  if (value.mode === 'naissance_mariage' && !value.mariage_id) {
    ctx.addIssue({
      code: 'custom',
      path: ['mariage_id'],
      message: 'Sélectionnez une union.',
    })
  }

  if (value.mode === 'naissance_parent' && !value.parent_id) {
    ctx.addIssue({
      code: 'custom',
      path: ['parent_id'],
      message: 'Sélectionnez le parent.',
    })
  }
})

/** Valeurs par défaut du formulaire. */
export function defaultPersonneFormValues(): PersonneFormValues {
  return {
    nom: '',
    prenom: '',
    appellation: '',
    sexe: '',
    numero: '',
    nom_facebook: '',
    profession: '',
    date_naissance: '',
    date_deces: '',
    decede: false,
    pays: '',
    ville: '',
    quartier: '',
    mode: '',
    conjoint_id: '',
    mariage_id: '',
    parent_id: '',
    date_mariage: '',
    photo: null,
  }
}

/** Convertit une personne de la base en valeurs de formulaire. */
export function personneToFormValues(personne: Personne): PersonneFormValues {
  return {
    nom: personne.nom ?? '',
    prenom: personne.prenom ?? '',
    appellation: personne.appellation ?? '',
    sexe: personne.sexe === 'M' || personne.sexe === 'F' ? personne.sexe : '',
    numero: personne.numero ?? '',
    nom_facebook: personne.nom_facebook ?? '',
    profession: personne.profession ?? '',
    date_naissance: personne.date_naissance ?? '',
    date_deces: personne.date_deces ?? '',
    decede: Boolean(personne.date_deces),
    pays: personne.pays ?? '',
    ville: personne.ville ?? '',
    quartier: personne.quartier ?? '',
    mode: 'racine',
    conjoint_id: '',
    mariage_id: '',
    parent_id: '',
    date_mariage: '',
    photo: null,
  }
}

/** Libellés humains des champs, utilisés par le résumé d'erreurs. */
export const FIELD_LABELS: Partial<Record<keyof PersonneFormValues, string>> = {
  nom: 'Nom',
  prenom: 'Prénom',
  appellation: 'Appellation',
  sexe: 'Sexe',
  numero: 'Téléphone',
  nom_facebook: 'Nom Facebook',
  profession: 'Profession',
  date_naissance: 'Date de naissance',
  date_deces: 'Date de décès',
  pays: 'Pays',
  ville: 'Ville',
  quartier: 'Quartier',
  mode: 'Rattachement',
  conjoint_id: 'Conjoint(e)',
  mariage_id: 'Union',
  parent_id: 'Parent',
  date_mariage: "Date de l'union",
}

/** Ancre de section associée à un champ, pour le résumé d'erreurs. */
export const FIELD_SECTION: Partial<Record<keyof PersonneFormValues, string>> =
  {
    nom: 'identite',
    prenom: 'identite',
    appellation: 'identite',
    sexe: 'identite',
    numero: 'origines',
    nom_facebook: 'origines',
    profession: 'origines',
    date_naissance: 'origines',
    date_deces: 'origines',
    pays: 'origines',
    ville: 'origines',
    quartier: 'origines',
    mode: 'rattachement',
    conjoint_id: 'rattachement',
    mariage_id: 'rattachement',
    parent_id: 'rattachement',
    date_mariage: 'rattachement',
  }
