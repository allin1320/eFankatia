import type {
  MariageCandidat,
  PersonneCandidat,
  RattachementMode,
} from './types'

/** Valeur brute d'une personne (partielle), pour les helpers d'affichage. */
type PersonneLike = {
  nom?: string | null
  prenom?: string | null
  appellation?: string | null
  date_naissance?: string | null
  date_deces?: string | null
}

/** « Prénom Nom », avec repli sur l'appellation puis le nom. */
export function formatPersonneName(personne: PersonneLike): string {
  const parts = [personne.prenom, personne.nom]
    .map((part) => part?.trim())
    .filter(Boolean)
  if (parts.length > 0) return parts.join(' ')
  return personne.appellation?.trim() || 'Personne sans nom'
}

/** Initiale servant d'avatar quand il n'y a pas de photo. */
export function initialFromPersonne(personne: PersonneLike): string {
  const source =
    personne.appellation?.trim() ||
    personne.prenom?.trim() ||
    personne.nom?.trim() ||
    '?'
  const [first] = Array.from(source)
  return first ? first.toLocaleUpperCase('fr') : '?'
}

/** Formate une date ISO `YYYY-MM-DD` en français (ex. « 12 mars 1950 »). */
export function formatDateFr(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

/** « 1950 – 2020 », « né(e) en 1950 »… selon les dates connues. */
export function formatDateRange(
  naissance: string | null | undefined,
  deces: string | null | undefined,
): string {
  const debut = naissance ? naissance.slice(0, 4) : ''
  const fin = deces ? deces.slice(0, 4) : ''
  if (debut && fin) return `${debut} – ${fin}`
  if (debut) return debut
  if (fin) return `† ${fin}`
  return ''
}

/** Décrit la relation créée, pour l'aperçu et l'écran de succès. */
export function describeRelation(
  mode: RattachementMode,
  data: {
    conjoint?: PersonneCandidat | null
    mariage?: MariageCandidat | null
    parent?: PersonneCandidat | null
  },
): string {
  switch (mode) {
    case 'alliance':
      return data.conjoint
        ? `Conjoint(e) de ${formatPersonneName(data.conjoint)}`
        : 'Alliance avec un conjoint'
    case 'naissance_mariage':
      return data.mariage
        ? `Enfant de ${mariageFirstParentName(data.mariage)} et ${mariageSecondParentName(data.mariage)}`
        : 'Enfant issu d’une union'
    case 'naissance_parent':
      return data.parent
        ? `Enfant de ${formatPersonneName(data.parent)}`
        : 'Enfant d’un parent'
    case 'racine':
      return 'Racine de l’arbre'
  }
}

/** Nom du second conjoint d'une union. */
export function mariageSecondParentName(mariage: MariageCandidat): string {
  return formatPersonneName({
    nom: mariage.personne_2_nom,
    prenom: mariage.personne_2_prenom,
    appellation: mariage.personne_2_appellation,
  })
}

/** Nom du premier conjoint d'une union. */
export function mariageFirstParentName(mariage: MariageCandidat): string {
  return formatPersonneName({
    nom: mariage.personne_1_nom,
    prenom: mariage.personne_1_prenom,
    appellation: mariage.personne_1_appellation,
  })
}
