/**
 * Calcul de la disposition de l'arbre généalogique.
 *
 * L'algorithme est un placement en couches (une génération = une ligne) :
 *  1. chaque personne est placée sur la ligne de sa génération ;
 *  2. les positions horizontales sont affinées par plusieurs passes de
 *     barycentre (conjoints, parents, enfants) afin de rapprocher les familles
 *     et de limiter les croisements ;
 *  3. un espacement minimal est garanti entre les cartes.
 *
 * Les coordonnées sont exprimées dans l'espace « monde » : `x`/`y` correspondent
 * au coin supérieur gauche d'une carte. La génération 0 (personne focalisée)
 * est centrée horizontalement sur 0.
 */

import { formatDateFr } from './format'
import type { ArbrePersonneData } from './tree-types'

/** Dimensions d'une carte personne. */
export const CARD_WIDTH = 176
export const CARD_HEIGHT = 100
/** Espace horizontal minimal entre deux cartes d'une même génération. */
export const COLUMN_GAP = 36
/** Distance verticale entre deux générations. */
export const ROW_GAP = 172
/** Marge ajoutée autour de l'arbre. */
export const LAYOUT_PADDING = 140

/** Barycentre : nombre de passes d'affinage. */
const LAYOUT_ITERATIONS = 150
/** Poids d'attraction d'un conjoint (rapproche les couples). */
const SPOUSE_WEIGHT = 3
/** Poids d'attraction vers la génération 0 pour la personne focalisée. */
const FOCUS_WEIGHT = 4

export type TreeNode = {
  id: string
  generation: number
  /** Coin supérieur gauche de la carte. */
  x: number
  y: number
}

export type TreeParentLink = {
  key: string
  parentId: string
  childId: string
  /** Chemin SVG (coordonnées monde). */
  path: string
}

export type TreeUnionLink = {
  key: string
  mariageId: string
  /** Chemin SVG (coordonnées monde). */
  path: string
}

export type TreeMarriageLine = {
  mariageId: string
  path: string
  midX: number
  midY: number
  /** Libellé accessible de l'union. */
  label: string
}

export type TreeLayout = {
  nodes: TreeNode[]
  parentLinks: TreeParentLink[]
  unionLinks: TreeUnionLink[]
  marriageLines: TreeMarriageLine[]
  /** Boîte englobante dans l'espace monde, marge comprise. */
  bounds: { x: number; y: number; width: number; height: number }
}

/** Disposition vide (sécurité). */
const EMPTY_LAYOUT: TreeLayout = {
  nodes: [],
  parentLinks: [],
  unionLinks: [],
  marriageLines: [],
  bounds: { x: 0, y: 0, width: 1, height: 1 },
}

function nameSortKey(p: { nom: string | null; prenom: string | null }): string {
  return `${p.nom ?? ''} ${p.prenom ?? ''}`.toLocaleLowerCase('fr')
}

function pushTo<TKey, TValue>(
  map: Map<TKey, TValue[]>,
  key: TKey,
  value: TValue,
): void {
  const list = map.get(key)
  if (list) list.push(value)
  else map.set(key, [value])
}

/** Courbe parent → enfant (générations adjacentes). */
function verticalPath(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): string {
  const dy = (toY - fromY) * 0.45
  return `M ${round(fromX)} ${round(fromY)} C ${round(fromX)} ${round(fromY + dy)}, ${round(toX)} ${round(toY - dy)}, ${round(toX)} ${round(toY)}`
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}

export function computeTreeLayout(data: ArbrePersonneData): TreeLayout {
  const {
    personnes,
    mariages,
    parent_enfants: parentEnfants,
    focus_id: focusId,
  } = data
  if (personnes.length === 0) return EMPTY_LAYOUT

  const nodeIds = new Set(personnes.map((p) => p.id))

  // Index des voisinages.
  const spouses = new Map<string, string[]>()
  for (const mariage of mariages) {
    if (
      !nodeIds.has(mariage.personne_1_id) ||
      !nodeIds.has(mariage.personne_2_id)
    )
      continue
    pushTo(spouses, mariage.personne_1_id, mariage.personne_2_id)
    pushTo(spouses, mariage.personne_2_id, mariage.personne_1_id)
  }

  const parentsOf = new Map<string, string[]>()
  const childrenOf = new Map<string, string[]>()
  for (const lien of parentEnfants) {
    if (!nodeIds.has(lien.parent_id) || !nodeIds.has(lien.enfant_id)) continue
    pushTo(childrenOf, lien.parent_id, lien.enfant_id)
    pushTo(parentsOf, lien.enfant_id, lien.parent_id)
  }

  // Regroupement par génération.
  const byGeneration = new Map<number, string[]>()
  for (const personne of personnes) {
    pushTo(byGeneration, personne.generation, personne.id)
  }
  const generations = [...byGeneration.keys()].sort((a, b) => a - b)
  const personById = new Map(personnes.map((p) => [p.id, p]))
  const sourceOrder = new Map(personnes.map((p, index) => [p.id, index]))

  // Ordre initial : alphabétique dans chaque génération.
  const order = new Map<number, string[]>()
  for (const generation of generations) {
    const list = [...(byGeneration.get(generation) ?? [])]
    list.sort((a, b) => {
      const pa = personById.get(a)!
      const pb = personById.get(b)!
      return (
        nameSortKey(pa).localeCompare(nameSortKey(pb), 'fr') ||
        sourceOrder.get(a)! - sourceOrder.get(b)!
      )
    })
    order.set(generation, list)
  }

  // Position initiale : répartition régulière centrée sur 0.
  const positions = new Map<string, number>()
  const minGap = CARD_WIDTH + COLUMN_GAP
  for (const generation of generations) {
    const list = order.get(generation)!
    const total = list.length * CARD_WIDTH + (list.length - 1) * COLUMN_GAP
    let cursor = -total / 2
    for (const id of list) {
      positions.set(id, cursor)
      cursor += minGap
    }
  }

  const targets = new Map<string, number>()
  for (let iteration = 0; iteration < LAYOUT_ITERATIONS; iteration += 1) {
    // Barycentre de chaque nœud à partir de ses voisins.
    for (const generation of generations) {
      for (const id of order.get(generation)!) {
        let sum = 0
        let weight = 0
        const pull = (neighborId: string | undefined, w: number) => {
          if (!neighborId) return
          const position = positions.get(neighborId)
          if (position === undefined) return
          sum += (position + CARD_WIDTH / 2) * w
          weight += w
        }

        for (const spouse of spouses.get(id) ?? []) pull(spouse, SPOUSE_WEIGHT)
        for (const parent of parentsOf.get(id) ?? []) pull(parent, 1)
        for (const child of childrenOf.get(id) ?? []) pull(child, 1)

        const current = positions.get(id)! + CARD_WIDTH / 2
        if (id === focusId) {
          sum += 0 * FOCUS_WEIGHT
          weight += FOCUS_WEIGHT
        }
        targets.set(id, weight > 0 ? sum / weight : current)
      }
    }

    // Réordonnancement par barycentre (tri stable).
    for (const generation of generations) {
      const list = order.get(generation)!
      list.sort(
        (a, b) =>
          targets.get(a)! - targets.get(b)! ||
          sourceOrder.get(a)! - sourceOrder.get(b)!,
      )
    }

    // Relaxation avec espacement minimal et amortissement.
    for (const generation of generations) {
      const list = order.get(generation)!
      const xs: number[] = []
      for (const id of list) {
        const current = positions.get(id)!
        const target = targets.get(id)! - CARD_WIDTH / 2
        xs.push(current + (target - current) * 0.5)
      }

      for (let i = 1; i < xs.length; i += 1) {
        xs[i] = Math.max(xs[i], xs[i - 1] + minGap)
      }
      for (let i = xs.length - 2; i >= 0; i -= 1) {
        xs[i] = Math.min(xs[i], xs[i + 1] - minGap)
      }

      // Recentre la ligne sur la cible moyenne pour éviter une dérive globale.
      if (xs.length > 0) {
        const meanX = xs.reduce((sum, value) => sum + value, 0) / xs.length
        const meanTarget =
          list.reduce(
            (sum, id) => sum + (targets.get(id)! - CARD_WIDTH / 2),
            0,
          ) / list.length
        const shift = meanTarget - meanX
        for (let i = 0; i < xs.length; i += 1) xs[i] += shift
      }

      for (let i = 0; i < list.length; i += 1) {
        positions.set(list[i], xs[i])
      }
    }
  }

  // Translation : la personne focalisée est centrée sur x = 0.
  const focusShift = (positions.get(focusId) ?? 0) + CARD_WIDTH / 2

  const nodes: TreeNode[] = personnes.map((personne) => ({
    id: personne.id,
    generation: personne.generation,
    x: (positions.get(personne.id) ?? 0) - focusShift,
    y: personne.generation * ROW_GAP,
  }))
  const nodeById = new Map(nodes.map((node) => [node.id, node]))

  // Liens parent → enfant, en évitant les doublons quand une union porte déjà
  // les enfants (l'union dessine alors un seul lien vers chaque enfant).
  const unionChildKeys = new Set<string>()
  const unionLinks: TreeUnionLink[] = []
  const marriageLines: TreeMarriageLine[] = []

  const nodeEdges = new Map<string, { x: number; y: number; bottom: number }>()
  for (const node of nodes) {
    nodeEdges.set(node.id, {
      x: node.x + CARD_WIDTH / 2,
      y: node.y,
      bottom: node.y + CARD_HEIGHT,
    })
  }

  for (const mariage of mariages) {
    const first = nodeById.get(mariage.personne_1_id)
    const second = nodeById.get(mariage.personne_2_id)
    if (!first || !second) continue

    const [left, right] =
      first.x <= second.x ? [first, second] : [second, first]
    const lineY = left.y + CARD_HEIGHT / 2
    const startX = left.x + CARD_WIDTH
    const endX = right.x
    const midX = (startX + endX) / 2
    const midY = lineY
    const dateLabel = mariage.date_mariage
      ? `Union du ${formatDateFr(mariage.date_mariage)}`
      : 'Union'
    const label =
      mariage.date_fin && mariage.type_fin
        ? `${dateLabel} · ${mariage.type_fin}`
        : dateLabel

    marriageLines.push({
      mariageId: mariage.id,
      path: `M ${round(startX)} ${round(lineY)} L ${round(endX)} ${round(lineY)}`,
      midX,
      midY,
      label,
    })
  }

  // Enfants rattachés à une union : un seul lien depuis le milieu du couple.
  for (const lien of data.mariage_enfants) {
    const mariage = mariages.find((m) => m.id === lien.mariage_id)
    if (!mariage) continue
    const first = nodeById.get(mariage.personne_1_id)
    const second = nodeById.get(mariage.personne_2_id)
    const child = nodeById.get(lien.enfant_id)
    if (!first || !second || !child) continue

    const line = marriageLines.find((l) => l.mariageId === mariage.id)
    if (!line) continue

    unionLinks.push({
      key: `${mariage.id}:${lien.enfant_id}`,
      mariageId: mariage.id,
      path: verticalPath(
        line.midX,
        line.midY,
        child.x + CARD_WIDTH / 2,
        child.y,
      ),
    })

    unionChildKeys.add(`${mariage.personne_1_id}:${lien.enfant_id}`)
    unionChildKeys.add(`${mariage.personne_2_id}:${lien.enfant_id}`)
  }

  const parentLinks: TreeParentLink[] = []
  for (const lien of parentEnfants) {
    if (unionChildKeys.has(`${lien.parent_id}:${lien.enfant_id}`)) continue
    const parent = nodeEdges.get(lien.parent_id)
    const child = nodeEdges.get(lien.enfant_id)
    if (!parent || !child) continue
    parentLinks.push({
      key: `${lien.parent_id}:${lien.enfant_id}`,
      parentId: lien.parent_id,
      childId: lien.enfant_id,
      path: verticalPath(parent.x, parent.bottom, child.x, child.y),
    })
  }

  // Boîte englobante.
  const minX = Math.min(...nodes.map((n) => n.x)) - LAYOUT_PADDING
  const maxX = Math.max(...nodes.map((n) => n.x + CARD_WIDTH)) + LAYOUT_PADDING
  const minY = Math.min(...nodes.map((n) => n.y)) - LAYOUT_PADDING
  const maxY = Math.max(...nodes.map((n) => n.y + CARD_HEIGHT)) + LAYOUT_PADDING

  return {
    nodes,
    parentLinks,
    unionLinks,
    marriageLines,
    bounds: {
      x: round(minX),
      y: round(minY),
      width: round(maxX - minX),
      height: round(maxY - minY),
    },
  }
}
