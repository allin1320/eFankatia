/**
 * Visibilité progressive de l'arbre.
 *
 * La RPC renvoie l'arbre complet (borné en profondeur). L'UI n'affiche au
 * départ que quelques générations autour de la personne focalisée, puis laisse
 * l'utilisateur déplier ou replier chaque branche :
 *   - vers le haut (ascendants) depuis n'importe quel ancêtre ;
 *   - vers le bas (descendants) depuis la personne focalisée et ses
 *     descendants, au niveau du couple (union) ou du parent seul.
 *
 * La visibilité est calculée par parcours depuis la personne focalisée. Les
 * conjoints d'une personne visible le sont toujours (même génération), mais
 * seules les personnes de la lignée portent les boutons de branche.
 */

import type { ArbrePersonneData } from './tree-types'

/** Sens d'action proposé par un bouton de branche. */
export type BranchControl = 'expand' | 'collapse'

export type TreeVisibilityOptions = {
  /** Tout afficher à l'ouverture (arbre complet ouvert depuis une fiche). */
  complet: boolean
  /** Générations affichées de chaque côté par défaut. */
  baseDepth: number
  /** États explicites des branches « parents » (true = dépliée). */
  parentOverrides: ReadonlyMap<string, boolean>
  /** États explicites des enfants hors union (true = dépliés). */
  childOverrides: ReadonlyMap<string, boolean>
  /** États explicites des enfants d'une union (true = dépliés). */
  marriageOverrides: ReadonlyMap<string, boolean>
}

export type TreeVisibility = {
  /** Sous-arbre visible, prêt pour le calcul de disposition. */
  data: ArbrePersonneData
  /** Bouton au-dessus de chaque personne ayant des parents. */
  parentControls: Map<string, BranchControl>
  /** Bouton sous chaque parent seul ayant des enfants hors union. */
  childControls: Map<string, BranchControl>
  /** Bouton au milieu de chaque union ayant des enfants. */
  marriageControls: Map<string, BranchControl>
}

/** Les parents sont-ils dépliés par défaut pour cette génération ? */
export function isParentsExpandedByDefault(
  generation: number,
  complet: boolean,
  baseDepth: number,
): boolean {
  return complet || generation > -baseDepth
}

/** Les enfants sont-ils dépliés par défaut pour cette génération ? */
export function isChildrenExpandedByDefault(
  generation: number,
  complet: boolean,
  baseDepth: number,
): boolean {
  return complet || generation < baseDepth
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

/** Construit le sous-arbre visible et les boutons de chaque intersection. */
export function buildTreeVisibility(
  source: ArbrePersonneData,
  options: TreeVisibilityOptions,
): TreeVisibility {
  const {
    complet,
    baseDepth,
    parentOverrides,
    childOverrides,
    marriageOverrides,
  } = options

  const generationById = new Map(
    source.personnes.map((personne) => [personne.id, personne.generation]),
  )

  const parentsOf = new Map<string, string[]>()
  const childrenOf = new Map<string, string[]>()
  const marriagesOf = new Map<string, string[]>()
  const marriageById = new Map(source.mariages.map((m) => [m.id, m]))

  for (const lien of source.parent_enfants) {
    pushTo(childrenOf, lien.parent_id, lien.enfant_id)
    pushTo(parentsOf, lien.enfant_id, lien.parent_id)
  }
  for (const mariage of source.mariages) {
    pushTo(marriagesOf, mariage.personne_1_id, mariage.id)
    pushTo(marriagesOf, mariage.personne_2_id, mariage.id)
  }

  // Enfants issus d'une union et liens parent/enfant déjà couverts par elle.
  const marriageChildren = new Map<string, string[]>()
  const unionManagedLinks = new Set<string>()
  for (const lien of source.mariage_enfants) {
    const mariage = marriageById.get(lien.mariage_id)
    if (!mariage || !generationById.has(lien.enfant_id)) continue
    pushTo(marriageChildren, mariage.id, lien.enfant_id)
    unionManagedLinks.add(`${mariage.personne_1_id}:${lien.enfant_id}`)
    unionManagedLinks.add(`${mariage.personne_2_id}:${lien.enfant_id}`)
  }

  // Enfants d'un parent seul (non rattachés à une union).
  const singleParentChildren = new Map<string, string[]>()
  for (const [parentId, children] of childrenOf) {
    const list = children.filter(
      (childId) => !unionManagedLinks.has(`${parentId}:${childId}`),
    )
    if (list.length > 0) singleParentChildren.set(parentId, list)
  }

  const parentsExpanded = (id: string): boolean => {
    const override = parentOverrides.get(id)
    if (override !== undefined) return override
    return isParentsExpandedByDefault(
      generationById.get(id) ?? 0,
      complet,
      baseDepth,
    )
  }
  const singleParentChildrenExpanded = (id: string): boolean => {
    const override = childOverrides.get(id)
    if (override !== undefined) return override
    return isChildrenExpandedByDefault(
      generationById.get(id) ?? 0,
      complet,
      baseDepth,
    )
  }
  const marriageChildrenExpanded = (id: string): boolean => {
    const override = marriageOverrides.get(id)
    if (override !== undefined) return override
    const mariage = marriageById.get(id)
    const generation = mariage
      ? (generationById.get(mariage.personne_1_id) ?? 0)
      : 0
    return isChildrenExpandedByDefault(generation, complet, baseDepth)
  }

  // Parcours fixe : personnes et unions visibles. Chaque nœud est traité une
  // seule fois, ce qui évite les boucles en cas de parenté croisée.
  const visiblePersons = new Set<string>()
  const visibleMarriages = new Set<string>()
  const personQueue: string[] = []
  const marriageQueue: string[] = []

  const visitPerson = (id: string) => {
    if (!generationById.has(id) || visiblePersons.has(id)) return
    visiblePersons.add(id)
    personQueue.push(id)
  }
  const visitMarriage = (id: string) => {
    if (!marriageById.has(id) || visibleMarriages.has(id)) return
    visibleMarriages.add(id)
    marriageQueue.push(id)
  }

  visitPerson(source.focus_id)

  let personIndex = 0
  let marriageIndex = 0
  while (
    personIndex < personQueue.length ||
    marriageIndex < marriageQueue.length
  ) {
    while (personIndex < personQueue.length) {
      const id = personQueue[personIndex]
      personIndex += 1

      for (const mariageId of marriagesOf.get(id) ?? []) {
        visitMarriage(mariageId)
      }
      if (parentsExpanded(id)) {
        for (const parent of parentsOf.get(id) ?? []) visitPerson(parent)
      }
      if (singleParentChildrenExpanded(id)) {
        for (const child of singleParentChildren.get(id) ?? []) {
          visitPerson(child)
        }
      }
    }

    while (marriageIndex < marriageQueue.length) {
      const id = marriageQueue[marriageIndex]
      marriageIndex += 1
      const mariage = marriageById.get(id)
      if (!mariage) continue
      // Le conjoint devient visible avec la personne (même génération).
      visitPerson(mariage.personne_1_id)
      visitPerson(mariage.personne_2_id)
      if (marriageChildrenExpanded(id)) {
        for (const child of marriageChildren.get(id) ?? []) {
          visitPerson(child)
        }
      }
    }
  }

  // Lignée de sang : focus + ascendants/descendants via parent_enfants.
  // Une personne arrivée par alliance n'a pas de parent : on part alors aussi
  // de ses conjoints, comme la RPC, pour que les boutons de branche couvrent
  // la lignée affichée (celle du conjoint).
  const lineageRoots = [source.focus_id]
  if ((parentsOf.get(source.focus_id) ?? []).length === 0) {
    for (const mariage of source.mariages) {
      if (mariage.personne_1_id === source.focus_id) {
        lineageRoots.push(mariage.personne_2_id)
      } else if (mariage.personne_2_id === source.focus_id) {
        lineageRoots.push(mariage.personne_1_id)
      }
    }
  }

  const lineage = new Set<string>(lineageRoots)
  const lineageQueue = [...lineageRoots]
  for (const id of lineageQueue) {
    for (const parent of parentsOf.get(id) ?? []) {
      if (lineage.has(parent) || !generationById.has(parent)) continue
      lineage.add(parent)
      lineageQueue.push(parent)
    }
    for (const child of childrenOf.get(id) ?? []) {
      if (lineage.has(child) || !generationById.has(child)) continue
      lineage.add(child)
      lineageQueue.push(child)
    }
  }

  // Contrôles directionnels : ascendants vers le haut, descendants vers le bas.
  const parentControls = new Map<string, BranchControl>()
  const childControls = new Map<string, BranchControl>()
  const marriageControls = new Map<string, BranchControl>()

  for (const id of visiblePersons) {
    if (!lineage.has(id)) continue
    const generation = generationById.get(id) ?? 0

    if (generation <= 0) {
      if ((parentsOf.get(id) ?? []).length > 0) {
        parentControls.set(id, parentsExpanded(id) ? 'collapse' : 'expand')
      }
    }

    if (generation >= 0) {
      if ((singleParentChildren.get(id) ?? []).length > 0) {
        childControls.set(
          id,
          singleParentChildrenExpanded(id) ? 'collapse' : 'expand',
        )
      }
    }
  }

  for (const mariage of source.mariages) {
    if (
      !visiblePersons.has(mariage.personne_1_id) ||
      !visiblePersons.has(mariage.personne_2_id)
    ) {
      continue
    }
    if ((marriageChildren.get(mariage.id) ?? []).length === 0) continue
    const generation = generationById.get(mariage.personne_1_id) ?? 0
    if (generation < 0) continue
    marriageControls.set(
      mariage.id,
      marriageChildrenExpanded(mariage.id) ? 'collapse' : 'expand',
    )
  }

  const visibleMariages = source.mariages.filter(
    (mariage) =>
      visiblePersons.has(mariage.personne_1_id) &&
      visiblePersons.has(mariage.personne_2_id),
  )
  const visibleMariageIds = new Set(visibleMariages.map((m) => m.id))

  return {
    data: {
      focus_id: source.focus_id,
      personnes: source.personnes.filter((p) => visiblePersons.has(p.id)),
      mariages: visibleMariages,
      parent_enfants: source.parent_enfants.filter(
        (lien) =>
          visiblePersons.has(lien.parent_id) &&
          visiblePersons.has(lien.enfant_id),
      ),
      mariage_enfants: source.mariage_enfants.filter(
        (lien) =>
          visiblePersons.has(lien.enfant_id) &&
          visibleMariageIds.has(lien.mariage_id),
      ),
    },
    parentControls,
    childControls,
    marriageControls,
  }
}
