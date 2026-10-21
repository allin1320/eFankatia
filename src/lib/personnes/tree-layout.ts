/**
 * Calcul de la disposition de l'arbre généalogique.
 *
 * L'algorithme est un placement en couches (une génération = une ligne) :
 *  1. les conjoints d'une même génération sont regroupés en **blocs
 *     insécables** : ils restent toujours côte à côte, dans l'ordre de leurs
 *     alliances successives ;
 *  2. chaque bloc est placé sur la ligne de sa génération, puis les positions
 *     horizontales sont affinées par plusieurs passes de barycentre
 *     (conjoints, parents, enfants) afin de rapprocher les familles et de
 *     limiter les croisements ;
 *  3. un espacement minimal est garanti entre les cartes (resserré au sein d'un
 *     couple, élargi entre deux familles).
 *
 * Les coordonnées sont exprimées dans l'espace « monde » : `x`/`y` correspondent
 * au coin supérieur gauche d'une carte. La génération 0 (personne focalisée)
 * est centrée horizontalement sur 0.
 */

import { formatDateFr } from './format'
import type { ArbrePersonne, ArbrePersonneData } from './tree-types'

/** Dimensions d'une carte personne. */
export const CARD_WIDTH = 176
export const CARD_HEIGHT = 100
/** Espace horizontal entre les deux cartes d'un couple (ligne d'union). */
export const COUPLE_GAP = 36
/** Espace horizontal entre deux familles d'une même génération. */
export const BLOCK_GAP = 64
/** Distance verticale entre deux générations. */
export const ROW_GAP = 172
/** Marge ajoutée autour de l'arbre. */
export const LAYOUT_PADDING = 140

/** Barycentre : nombre de passes d'affinage. */
const LAYOUT_ITERATIONS = 150
/** Alignement vertical : nombre de passes de relaxation par rangée. */
const ALIGNMENT_ITERATIONS = 60
/** Poids d'attraction d'un conjoint (rapproche les couples). */
const SPOUSE_WEIGHT = 3
/** Poids d'attraction vers la génération 0 pour la personne focalisée. */
const FOCUS_WEIGHT = 4
/** Amplitude du détour d'une ligne d'union qui croiserait des cartes. */
const UNION_DETOUR = 30
/** Rayon des angles du détour d'une ligne d'union. */
const UNION_DETOUR_RADIUS = 38

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
  /** Point d'ancrage de la pastille / du bouton d'union. */
  midX: number
  midY: number
  /** Point de départ des liens vers les enfants de l'union. */
  childX: number
  childY: number
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

/**
 * Comparateur de naissance : l'aîné(e) (date la plus ancienne) passe en
 * premier ; les dates inconnues (`null`) sont repoussées à la fin.
 */
function compareBirth(
  a: { date: string | null },
  b: { date: string | null },
): number {
  const da = a.date
  const db = b.date
  if (da && db) return da < db ? -1 : da > db ? 1 : 0
  if (da) return -1
  if (db) return 1
  return 0
}

/**
 * Repère d'ordre d'une personne dans sa génération.
 *
 * La lignée générale (personne née dans la famille) est ordonnée par sa propre
 * date de naissance. Un conjoint par alliance hérite de la date de son conjoint
 * de lignée, afin de rester accolé à lui et de ne jamais être trié par son
 * propre âge (ex. un mari de 60 ans ne passe pas devant la lignée de sa femme).
 */
function lineageAnchor(
  id: string,
  personById: Map<string, ArbrePersonne>,
  spouses: Map<string, string[]>,
): { date: string | null; isLignee: boolean } {
  const personne = personById.get(id)!
  if (personne.est_lignee_generale) {
    return { date: personne.date_naissance, isLignee: true }
  }
  for (const spouseId of spouses.get(id) ?? []) {
    const spouse = personById.get(spouseId)
    if (spouse?.est_lignee_generale) {
      return { date: spouse.date_naissance, isLignee: false }
    }
  }
  return { date: personne.date_naissance, isLignee: false }
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

/** Un bloc insécable de conjoints sur une même génération. */
type FamilyBlock = {
  /** Identifiant stable (membre le plus ancien dans les données). */
  key: string
  /** Identifiants dans l'ordre d'affichage : les conjoints se suivent. */
  ids: string[]
  /** Largeur totale du bloc (cartes + espacements internes). */
  width: number
  /** Ordre initial, utilisé pour départager deux cibles identiques. */
  sortIndex: number
  /** Centre horizontal visé par le barycentre. */
  targetX: number
}

/**
 * Ordonne les membres d'un bloc pour que chaque conjoint soit voisin du
 * suivant : on parcourt les chaînes d'alliances en partant des extrémités,
 * puis on rattache les éventuels membres isolés.
 */
function orderSpouseChain(
  ids: string[],
  spouseIds: Map<string, string[]>,
  sourceOrder: Map<string, number>,
): string[] {
  if (ids.length <= 2) return ids

  const members = new Set(ids)
  const linkCount = (id: string) =>
    (spouseIds.get(id) ?? []).filter((other) => members.has(other)).length

  const visited = new Set<string>()
  const ordered: string[] = []
  const starts = [...ids].sort(
    (a, b) =>
      linkCount(a) - linkCount(b) || sourceOrder.get(a)! - sourceOrder.get(b)!,
  )

  for (const start of starts) {
    if (visited.has(start)) continue
    let current = start
    visited.add(current)
    ordered.push(current)

    for (;;) {
      const next = (spouseIds.get(current) ?? []).find(
        (other) => members.has(other) && !visited.has(other),
      )
      if (!next) break
      visited.add(next)
      ordered.push(next)
      current = next
    }
  }

  return ordered
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}

/** Une carte (hors conjoints) coupe-t-elle le segment horizontal donné ? */
function crossesCard(
  nodes: TreeNode[],
  excluded: ReadonlySet<string>,
  y: number,
  startX: number,
  endX: number,
): boolean {
  const lo = Math.min(startX, endX)
  const hi = Math.max(startX, endX)
  return nodes.some(
    (node) =>
      !excluded.has(node.id) &&
      node.x < hi &&
      node.x + CARD_WIDTH > lo &&
      y > node.y &&
      y < node.y + CARD_HEIGHT,
  )
}

type UnionGeometry = {
  path: string
  /** Pastille / bouton d'union. */
  midX: number
  midY: number
  /** Départ des liens vers les enfants de l'union. */
  childX: number
  childY: number
}

/**
 * Tracé de la ligne d'union. Deux conjoints d'une même génération sont
 * normalement voisins : un simple trait suffit. Si des cartes s'intercalent
 * malgré tout, la ligne contourne la rangée par le bas ; si les conjoints sont
 * sur deux générations, la courbe passe par le couloir entre les rangées.
 */
function unionGeometry(
  first: TreeNode,
  second: TreeNode,
  nodes: TreeNode[],
): UnionGeometry {
  if (first.generation === second.generation) {
    const [left, right] =
      first.x <= second.x ? [first, second] : [second, first]
    const lineY = left.y + CARD_HEIGHT / 2
    const startX = left.x + CARD_WIDTH
    const endX = right.x
    const midX = (startX + endX) / 2

    if (
      !crossesCard(nodes, new Set([left.id, right.id]), lineY, startX, endX)
    ) {
      return {
        path: `M ${round(startX)} ${round(lineY)} L ${round(endX)} ${round(lineY)}`,
        midX,
        midY: lineY,
        childX: midX,
        childY: lineY,
      }
    }

    // Contournement sous la rangée, pour ne jamais traverser une carte.
    const detourY = left.y + CARD_HEIGHT + UNION_DETOUR
    const radius = Math.max(
      8,
      Math.min(UNION_DETOUR_RADIUS, (endX - startX) / 4),
    )
    return {
      path: [
        `M ${round(startX)} ${round(lineY)}`,
        `C ${round(startX + radius)} ${round(lineY)}, ${round(startX + radius)} ${round(detourY)}, ${round(startX + 2 * radius)} ${round(detourY)}`,
        `L ${round(endX - 2 * radius)} ${round(detourY)}`,
        `C ${round(endX - radius)} ${round(detourY)}, ${round(endX - radius)} ${round(lineY)}, ${round(endX)} ${round(lineY)}`,
      ].join(' '),
      midX,
      midY: detourY,
      childX: midX,
      childY: detourY,
    }
  }

  // Conjoints sur deux générations : courbe en S entre les deux rangées.
  const [upper, lower] = first.y <= second.y ? [first, second] : [second, first]
  const startX = upper.x + CARD_WIDTH / 2
  const startY = upper.y + CARD_HEIGHT
  const endX = lower.x + CARD_WIDTH / 2
  const endY = lower.y
  const dy = Math.max(24, (endY - startY) * 0.55)
  return {
    path: `M ${round(startX)} ${round(startY)} C ${round(startX)} ${round(startY + dy)}, ${round(endX)} ${round(endY - dy)}, ${round(endX)} ${round(endY)}`,
    midX: (startX + endX) / 2,
    midY: (startY + endY) / 2,
    childX: endX,
    childY: endY,
  }
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
  const personById = new Map(personnes.map((p) => [p.id, p]))
  const sourceOrder = new Map(personnes.map((p, index) => [p.id, index]))

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

  // Alliances au sein d'une même génération : elles forment des blocs
  // insécables pour que deux conjoints ne soient jamais séparés par des tiers.
  const sameGenerationSpouses = new Map<string, string[]>()
  const blockRoot = new Map<string, string>()
  const findRoot = (id: string): string => {
    let root = id
    for (;;) {
      const parent = blockRoot.get(root)
      if (parent === undefined || parent === root) break
      root = parent
    }
    let cursor = id
    while (cursor !== root) {
      const next = blockRoot.get(cursor) ?? root
      blockRoot.set(cursor, root)
      cursor = next
    }
    return root
  }
  for (const mariage of mariages) {
    const first = personById.get(mariage.personne_1_id)
    const second = personById.get(mariage.personne_2_id)
    if (!first || !second || first.generation !== second.generation) continue
    pushTo(sameGenerationSpouses, first.id, second.id)
    pushTo(sameGenerationSpouses, second.id, first.id)
    const rootA = findRoot(first.id)
    const rootB = findRoot(second.id)
    if (rootA !== rootB) blockRoot.set(rootA, rootB)
  }

  // Regroupement par génération, puis en blocs de conjoints.
  const byGeneration = new Map<number, string[]>()
  for (const personne of personnes) {
    pushTo(byGeneration, personne.generation, personne.id)
  }
  const generations = [...byGeneration.keys()].sort((a, b) => a - b)

  // Ordre initial : la lignée générale (personnes nées dans la famille) est
  // ordonnée par date de naissance croissante (l'aîné d'abord) ; un conjoint
  // par alliance hérite de la date de son conjoint de lignée et lui succède,
  // sans jamais être trié par son propre âge. Les dates inconnues passent en fin.
  const order = new Map<number, string[]>()
  for (const generation of generations) {
    const list = [...(byGeneration.get(generation) ?? [])]
    list.sort((a, b) => {
      const anchorA = lineageAnchor(a, personById, spouses)
      const anchorB = lineageAnchor(b, personById, spouses)
      return (
        compareBirth(anchorA, anchorB) ||
        Number(anchorB.isLignee) - Number(anchorA.isLignee) ||
        sourceOrder.get(a)! - sourceOrder.get(b)!
      )
    })
    order.set(generation, list)
  }

  const blocksByGeneration = new Map<number, FamilyBlock[]>()
  for (const generation of generations) {
    const groups = new Map<string, string[]>()
    for (const id of order.get(generation)!) {
      pushTo(groups, findRoot(id), id)
    }

    const blocks: FamilyBlock[] = []
    for (const ids of groups.values()) {
      const orderedIds = orderSpouseChain(
        ids,
        sameGenerationSpouses,
        sourceOrder,
      )
      const key = [...orderedIds].sort(
        (a, b) => sourceOrder.get(a)! - sourceOrder.get(b)!,
      )[0]
      blocks.push({
        key,
        ids: orderedIds,
        width:
          orderedIds.length * CARD_WIDTH + (orderedIds.length - 1) * COUPLE_GAP,
        sortIndex: blocks.length,
        targetX: 0,
      })
    }
    blocksByGeneration.set(generation, blocks)
  }

  // Position initiale : blocs répartis régulièrement et centrés sur 0.
  const blockX = new Map<string, number>()
  for (const generation of generations) {
    const blocks = blocksByGeneration.get(generation)!
    const total =
      blocks.reduce((sum, block) => sum + block.width, 0) +
      Math.max(0, blocks.length - 1) * BLOCK_GAP
    let cursor = -total / 2
    for (const block of blocks) {
      blockX.set(block.key, cursor)
      cursor += block.width + BLOCK_GAP
    }
  }

  /** Recalcule la position de chaque carte à partir de son bloc. */
  const positions = new Map<string, number>()
  const applyBlockPositions = () => {
    for (const generation of generations) {
      for (const block of blocksByGeneration.get(generation)!) {
        let cursor = blockX.get(block.key)!
        for (const id of block.ids) {
          positions.set(id, cursor)
          cursor += CARD_WIDTH + COUPLE_GAP
        }
      }
    }
  }
  applyBlockPositions()

  const targets = new Map<string, number>()
  for (let iteration = 0; iteration < LAYOUT_ITERATIONS; iteration += 1) {
    // Barycentre de chaque carte à partir de ses voisins.
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

    for (const generation of generations) {
      const blocks = blocksByGeneration.get(generation)!

      // Cible d'un bloc : moyenne des cibles de ses membres.
      for (const block of blocks) {
        block.targetX =
          block.ids.reduce((sum, id) => sum + targets.get(id)!, 0) /
          block.ids.length
      }

      // Réordonnancement des blocs par barycentre (tri stable).
      blocks.sort((a, b) => a.targetX - b.targetX || a.sortIndex - b.sortIndex)

      // Relaxation : blocs insécables, espacement garanti entre familles.
      const xs = blocks.map((block) => {
        const current = blockX.get(block.key)!
        const target = block.targetX - block.width / 2
        return current + (target - current) * 0.5
      })

      for (let i = 1; i < xs.length; i += 1) {
        xs[i] = Math.max(xs[i], xs[i - 1] + blocks[i - 1].width + BLOCK_GAP)
      }
      for (let i = xs.length - 2; i >= 0; i -= 1) {
        xs[i] = Math.min(xs[i], xs[i + 1] - blocks[i].width - BLOCK_GAP)
      }

      // Recentre la ligne sur la cible moyenne pour éviter une dérive globale.
      if (xs.length > 0) {
        const meanX = xs.reduce((sum, value) => sum + value, 0) / xs.length
        const meanTarget =
          blocks.reduce(
            (sum, block) => sum + block.targetX - block.width / 2,
            0,
          ) / blocks.length
        const shift = meanTarget - meanX
        for (let i = 0; i < xs.length; i += 1) xs[i] += shift
      }

      for (let i = 0; i < blocks.length; i += 1) {
        blockX.set(blocks[i].key, xs[i])
      }
    }

    applyBlockPositions()
  }

  // --- Alignement vertical des filiations -----------------------------------
  // Une carte dont un parent est affiché est placée juste sous le milieu de
  // l'union de ses parents (ou sous le parent seul), afin que la courbe de
  // filiation descende à la verticale. Un couple restant soudé, le conjoint
  // suit la carte concernée. Les personnes sans parent conservent la position
  // issue du barycentre. Les rangées sont traitées du haut vers le bas pour
  // que chaque enfant utilise les positions définitives de ses parents.
  const step = CARD_WIDTH + COUPLE_GAP

  /** Ancre d'un bloc : union parentale visée et décalage de la carte ancrée. */
  type BlockAnchor = {
    /** Parents communs (clé de fratrie), `null` si plusieurs familles. */
    key: string | null
    /** Milieu de l'union parentale. */
    anchorX: number
    /** Distance entre le bord gauche du bloc et la carte ancrée. */
    cardOffset: number
  }

  /** Groupe rigide de blocs partageant la même union parentale. */
  type AlignmentUnit = {
    blocks: FamilyBlock[]
    /** Bord gauche de chaque bloc, relatif à l'ancre du groupe. */
    offsets: number[]
    /** Position visée de l'ancre. */
    anchorX: number
    /** Distance entre le bord gauche du groupe et son ancre. */
    anchorOffset: number
    /** Largeur totale du groupe. */
    width: number
    /** Ordre initial (pour départager deux ancres identiques). */
    sortIndex: number
  }

  const blockAnchor = (block: FamilyBlock): BlockAnchor | null => {
    const anchors: { key: string; x: number; cardOffset: number }[] = []

    block.ids.forEach((id, index) => {
      const parentIds = (parentsOf.get(id) ?? []).filter((parentId) =>
        positions.has(parentId),
      )
      if (parentIds.length === 0) return

      let sum = 0
      for (const parentId of parentIds) {
        sum += positions.get(parentId)! + CARD_WIDTH / 2
      }
      anchors.push({
        key: [...parentIds].sort().join(':'),
        x: sum / parentIds.length,
        cardOffset: index * step + CARD_WIDTH / 2,
      })
    })
    if (anchors.length === 0) return null

    const sameKey = anchors.every((anchor) => anchor.key === anchors[0].key)
    return {
      key: sameKey ? anchors[0].key : null,
      anchorX:
        anchors.reduce((sum, anchor) => sum + anchor.x, 0) / anchors.length,
      cardOffset:
        anchors.reduce((sum, anchor) => sum + anchor.cardOffset, 0) /
        anchors.length,
    }
  }

  for (const generation of generations) {
    const blocks = blocksByGeneration.get(generation)!
    const units: AlignmentUnit[] = []
    const groups = new Map<
      string,
      { anchorX: number; entries: { block: FamilyBlock; cardOffset: number }[] }
    >()

    // 1. Regroupement des blocs par fratrie (même union parentale).
    for (const block of blocks) {
      const anchor = blockAnchor(block)
      if (!anchor) {
        // Bloc sans parent : il garde la position du barycentre.
        const width = block.width
        units.push({
          blocks: [block],
          offsets: [-width / 2],
          anchorX: blockX.get(block.key)! + width / 2,
          anchorOffset: width / 2,
          width,
          sortIndex: block.sortIndex,
        })
        continue
      }

      if (anchor.key) {
        const group = groups.get(anchor.key) ?? {
          anchorX: anchor.anchorX,
          entries: [],
        }
        group.entries.push({ block, cardOffset: anchor.cardOffset })
        groups.set(anchor.key, group)
      } else {
        units.push({
          blocks: [block],
          offsets: [-anchor.cardOffset],
          anchorX: anchor.anchorX,
          anchorOffset: anchor.cardOffset,
          width: block.width,
          sortIndex: block.sortIndex,
        })
      }
    }

    // 2. Placement interne de chaque fratrie : cartes ancrées centrées sous
    //    l'union parentale, blocs espacés entre eux.
    for (const group of groups.values()) {
      const groupBlocks = group.entries.map((entry) => entry.block)

      const xs: number[] = []
      let cursor = 0
      for (const block of groupBlocks) {
        xs.push(cursor)
        cursor += block.width + BLOCK_GAP
      }
      // Recentre la fratrie : moyenne des cartes ancrées = ancre parentale.
      const anchoredCenters = xs.map(
        (x, index) => x + group.entries[index].cardOffset,
      )
      const shift =
        group.anchorX -
        anchoredCenters.reduce((sum, value) => sum + value, 0) /
          anchoredCenters.length

      const offsets = xs.map((x) => x + shift - group.anchorX)
      const minOffset = Math.min(...offsets)
      const maxRight = Math.max(
        ...offsets.map((offset, index) => offset + groupBlocks[index].width),
      )
      units.push({
        blocks: groupBlocks,
        offsets,
        anchorX: group.anchorX,
        anchorOffset: -minOffset,
        width: maxRight - minOffset,
        sortIndex: Math.min(...groupBlocks.map((block) => block.sortIndex)),
      })
    }

    // 3. Les groupes sont ordonnés et espacés le long de la rangée ; chacun
    //    reste attiré par l'union de ses parents.
    units.sort((a, b) => a.anchorX - b.anchorX || a.sortIndex - b.sortIndex)

    const xs = units.map((unit) => unit.anchorX - unit.anchorOffset)
    const desired = xs.slice()
    for (let iteration = 0; iteration < ALIGNMENT_ITERATIONS; iteration += 1) {
      for (let i = 0; i < xs.length; i += 1) {
        xs[i] += (desired[i] - xs[i]) * 0.5
      }
      for (let i = 1; i < xs.length; i += 1) {
        xs[i] = Math.max(xs[i], xs[i - 1] + units[i - 1].width + BLOCK_GAP)
      }
      for (let i = xs.length - 2; i >= 0; i -= 1) {
        xs[i] = Math.min(xs[i], xs[i + 1] - units[i].width - BLOCK_GAP)
      }
    }

    for (let i = 0; i < units.length; i += 1) {
      const unit = units[i]
      const anchor = xs[i] + unit.anchorOffset
      for (let j = 0; j < unit.blocks.length; j += 1) {
        blockX.set(unit.blocks[j].key, anchor + unit.offsets[j])
      }
    }
    applyBlockPositions()
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

    const geometry = unionGeometry(first, second, nodes)
    const dateLabel = mariage.date_mariage
      ? `Union du ${formatDateFr(mariage.date_mariage)}`
      : 'Union'
    const label =
      mariage.date_fin && mariage.type_fin
        ? `${dateLabel} · ${mariage.type_fin}`
        : dateLabel

    marriageLines.push({
      mariageId: mariage.id,
      path: geometry.path,
      midX: geometry.midX,
      midY: geometry.midY,
      childX: geometry.childX,
      childY: geometry.childY,
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
        line.childX,
        line.childY,
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
