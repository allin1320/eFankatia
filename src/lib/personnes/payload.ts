import type { PersonneUpdate } from '../supabase/types'
import type { PhotoUpdate } from './fiche-types'
import type {
  PersonneFormValues,
  PersonneRpcPayload,
  PhotoUrls,
  TypeParent,
} from './types'

/** Chaîne trimmée, ou `undefined` si vide (les clés absentes restent NULL en base). */
function text(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

/** Déduit le rôle du parent depuis son sexe. */
export function typeParentFromSexe(
  sexe: string | null | undefined,
): TypeParent {
  if (sexe === 'M') return 'pere'
  if (sexe === 'F') return 'mere'
  return 'parent'
}

/**
 * Construit le payload `p_new` attendu par les RPC `create_personne_*`.
 *
 * Les champs vides sont omis (NULL en base). Le champ `date_mariage` n'est
 * envoyé qu'en mode alliance, et `type_parent` qu'en mode parent unique.
 */
export function buildPersonnePayload(
  values: PersonneFormValues,
  options: { photo: PhotoUrls | null; typeParent: TypeParent | null },
): PersonneRpcPayload {
  if (values.sexe !== 'M' && values.sexe !== 'F') {
    throw new Error('Le sexe est obligatoire.')
  }

  const payload: PersonneRpcPayload = {
    nom: values.nom.trim(),
    prenom: values.prenom.trim(),
    appellation: values.appellation.trim(),
    sexe: values.sexe,
  }

  const numero = text(values.numero)
  if (numero) payload.numero = numero

  const nomFacebook = text(values.nom_facebook)
  if (nomFacebook) payload.nom_facebook = nomFacebook

  const profession = text(values.profession)
  if (profession) payload.profession = profession

  const naissance = text(values.date_naissance)
  if (naissance) payload.date_naissance = naissance

  if (values.decede) {
    const deces = text(values.date_deces)
    if (deces) payload.date_deces = deces
  }

  const pays = text(values.pays)
  if (pays) payload.pays = pays

  const ville = text(values.ville)
  if (ville) payload.ville = ville

  const quartier = text(values.quartier)
  if (quartier) payload.quartier = quartier

  if (options.photo) {
    payload.urlImg = options.photo.urlImg
    payload.urlImgThumb = options.photo.urlImgThumb
  }

  if (values.mode === 'alliance') {
    const dateMariage = text(values.date_mariage)
    if (dateMariage) payload.date_mariage = dateMariage
  }

  if (values.mode === 'naissance_parent' && options.typeParent) {
    payload.type_parent = options.typeParent
  }

  return payload
}

/**
 * Construit le payload de modification d'une personne.
 *
 * Contrairement à la création, les champs vides deviennent explicitement
 * `null` afin de permettre l'effacement d'une valeur. Les colonnes d'audit et
 * `estLigneeGenerale` ne sont jamais envoyées.
 */
export function buildPersonneUpdatePayload(
  values: PersonneFormValues,
  options: { photo: PhotoUpdate },
): PersonneUpdate {
  if (values.sexe !== 'M' && values.sexe !== 'F') {
    throw new Error('Le sexe est obligatoire.')
  }

  const payload: PersonneUpdate = {
    nom: values.nom.trim(),
    prenom: values.prenom.trim(),
    appellation: values.appellation.trim(),
    sexe: values.sexe,
    numero: text(values.numero) ?? null,
    nom_facebook: text(values.nom_facebook) ?? null,
    profession: text(values.profession) ?? null,
    date_naissance: text(values.date_naissance) ?? null,
    date_deces: values.decede ? (text(values.date_deces) ?? null) : null,
    pays: text(values.pays) ?? null,
    ville: text(values.ville) ?? null,
    quartier: text(values.quartier) ?? null,
  }

  if (options.photo.kind === 'set') {
    payload.urlImg = options.photo.urls.urlImg
    payload.urlImgThumb = options.photo.urls.urlImgThumb
  } else if (options.photo.kind === 'remove') {
    payload.urlImg = null
    payload.urlImgThumb = null
  }

  return payload
}
