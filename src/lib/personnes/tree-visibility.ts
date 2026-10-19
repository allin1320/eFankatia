/**
 * Visibilité progressive de l'arbre.
 *
 * La RPC renvoie l'arbre complet (borné en profondeur). L'UI n'affiche par
 * défaut que quelques générations autour de la personne focalisée, puis laisse
 * l'utilisateur déplier une branche précise via les boutons « + ».
 */

import type { ArbrePersonneData } from './tree-types'

export type TreeVisibilityOptions = {
  /** Tout afficher (arbre complet ouvert depuis une fiche). */
  complet: boolean
  /** Nombre de générations affichées de chaque côté en mode progressif. */
  baseDepth: number
  /** Personnes dont on a demandé à afficher les parents. */
  revealParents: ReadonlySet<string>
  /** Personnes dont on a demandé à afficher les enfants. */
  revealChildren: ReadonlySet<string>
}

export type TreeVisibility = {
  /** Sous-arbre visible, prêt pour le calcul de disposition. */
  data: ArbrePersonneData
  /** Personnes visibles ayant des parents encore masqués. */
  hiddenParents: Set<string>
  /** Personnes visibles ayant des enfants encore masqués. */
  hiddenChildren: Set<string>
}

function pushTo<TValue>(
  map: Map<string, TValue[]>,
  key: string,
  value: TValue,
) {
  const list = map.get(key)
  if (list) list.push(value)
  else map.set(key, [value])
}

/** Construit le sous-arbre visible et repère les branches dépliables. */
export function buildTreeVisibility(
  source: ArbrePersonneData,
  options: TreeVisibilityOptions,
): TreeVisibility {
  const { complet, baseDepth, revealParents, revealChildren } = options

  const parentsOf = new Map<string, string[]>()
  const childrenOf = new Map<string, string[]>()
  const spousesOf = new Map<string, string[]>()

  for (const lien of source.parent_enfants) {
    pushTo(childrenOf, lien.parent_id, lien.enfant_id)
    pushTo(parentsOf, lien.enfant_id, lien.parent_id)
  }
  for (const mariage of source.mariages) {
    pushTo(spousesOf, mariage.personne_1_id, mariage.personne_2_id)
    pushTo(spousesOf, mariage.personne_2_id, mariage.personne_1_id)
  }

  const visible = new Set<string>()
  for (const personne of source.personnes) {
    if (complet || Math.abs(personne.generation) <= baseDepth) {
      visible.add(personne.id)
    }
  }

  // Dépliage demandé : parents / enfants d'une branche précise, une génération
  // à la fois.
  for (const id of revealParents) {
    for (const parent of parentsOf.get(id) ?? []) visible.add(parent)
  }
  for (const id of revealChildren) {
    for (const child of childrenOf.get(id) ?? []) visible.add(child)
  }

  // Le ou la conjoint(e) accompagne toujours une personne visible : il forme le
  // couple et le second parent des enfants.
  for (const id of [...visible]) {
    for (const spouse of spousesOf.get(id) ?? []) visible.add(spouse)
  }

  const hiddenParents = new Set<string>()
  const hiddenChildren = new Set<string>()
  for (const id of visible) {
    if ((parentsOf.get(id) ?? []).some((parent) => !visible.has(parent))) {
      hiddenParents.add(id)
    }
    if ((childrenOf.get(id) ?? []).some((child) => !visible.has(child))) {
      hiddenChildren.add(id)
    }
  }

  const visibleMariages = source.mariages.filter(
    (mariage) =>
      visible.has(mariage.personne_1_id) && visible.has(mariage.personne_2_id),
  )
  const visibleMariageIds = new Set(visibleMariages.map((m) => m.id))

  return {
    data: {
      focus_id: source.focus_id,
      personnes: source.personnes.filter((p) => visible.has(p.id)),
      mariages: visibleMariages,
      parent_enfants: source.parent_enfants.filter(
        (lien) => visible.has(lien.parent_id) && visible.has(lien.enfant_id),
      ),
      mariage_enfants: source.mariage_enfants.filter(
        (lien) =>
          visible.has(lien.enfant_id) && visibleMariageIds.has(lien.mariage_id),
      ),
    },
    hiddenParents,
    hiddenChildren,
  }
}
