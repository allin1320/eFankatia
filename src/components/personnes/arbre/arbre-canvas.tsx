import { useMemo } from 'react'
import { MaximizeIcon, MinusIcon, PlusIcon, RotateCcwIcon } from 'lucide-react'
import { cn } from 'cn'

import { Button } from '#/components/ui/button'
import { ArbreNode } from './arbre-node'
import { useTreeViewport } from './use-tree-viewport'
import type { ArbrePersonneData } from '#/lib/personnes/tree-types'
import { CARD_HEIGHT, CARD_WIDTH } from '#/lib/personnes/tree-layout'
import type { TreeLayout } from '#/lib/personnes/tree-layout'
import type { BranchControl } from '#/lib/personnes/tree-visibility'

type ArbreCanvasProps = {
  data: ArbrePersonneData
  layout: TreeLayout
  /** Bouton « + / − » au-dessus de chaque personne ayant des parents. */
  parentControls: Map<string, BranchControl>
  /** Bouton « + / − » en dessous de chaque personne ayant des enfants. */
  childControls: Map<string, BranchControl>
  /** Bouton « + / − » au milieu de chaque union ayant des enfants. */
  marriageControls: Map<string, BranchControl>
  /** `true` si au moins une branche a été repliée/dépliée manuellement. */
  canReduce: boolean
  onToggleParents: (personneId: string, expanded: boolean) => void
  onToggleChildren: (personneId: string, expanded: boolean) => void
  onToggleMarriage: (mariageId: string, expanded: boolean) => void
  onReset: () => void
  /** Change lorsque l'on souhaite recadrer automatiquement. */
  fitKey: string
}

const EXPAND_BUTTON_SIZE = 28

/** Canevas interactif : liens SVG, cartes personnes, zoom et déplacement. */
export function ArbreCanvas({
  data,
  layout,
  parentControls,
  childControls,
  marriageControls,
  canReduce,
  onToggleParents,
  onToggleChildren,
  onToggleMarriage,
  onReset,
  fitKey,
}: ArbreCanvasProps) {
  const {
    containerRef,
    camera,
    isPanning,
    fit,
    zoomBy,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onClickCapture,
    onKeyDown,
  } = useTreeViewport({ bounds: layout.bounds, fitKey })

  const { bounds } = layout
  const scalePercent = Math.round(camera.scale * 100)
  const personById = useMemo(
    () => new Map(data.personnes.map((personne) => [personne.id, personne])),
    [data.personnes],
  )

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--foam)]">
      <div
        ref={containerRef}
        role="group"
        aria-label="Canevas de l’arbre généalogique"
        aria-describedby="arbre-aide"
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onClickCapture={onClickCapture}
        onKeyDown={onKeyDown}
        className={cn(
          'relative h-[72vh] min-h-[520px] touch-none overflow-hidden outline-none select-none focus-visible:ring-[3px] focus-visible:ring-[var(--lagoon)]/40',
          isPanning ? 'cursor-grabbing' : 'cursor-grab',
        )}
      >
        <div
          className="absolute top-0 left-0"
          style={{
            transform: `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.scale})`,
          }}
        >
          <svg
            className="pointer-events-none absolute"
            style={{ left: bounds.x, top: bounds.y }}
            width={bounds.width}
            height={bounds.height}
            viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`}
            aria-hidden="true"
          >
            {layout.parentLinks.map((link) => (
              <path
                key={link.key}
                d={link.path}
                fill="none"
                strokeWidth={1.6}
                strokeLinecap="round"
                style={{
                  stroke:
                    'color-mix(in oklab, var(--sea-ink) 30%, transparent)',
                }}
              />
            ))}

            {layout.unionLinks.map((link) => (
              <path
                key={link.key}
                d={link.path}
                fill="none"
                strokeWidth={1.8}
                strokeLinecap="round"
                style={{ stroke: 'var(--lagoon-deep)', opacity: 0.55 }}
              />
            ))}

            {layout.marriageLines.map((line) => (
              <g key={line.mariageId}>
                <path
                  d={line.path}
                  fill="none"
                  strokeWidth={2}
                  strokeDasharray="7 5"
                  strokeLinecap="round"
                  style={{ stroke: 'var(--lagoon-deep)', opacity: 0.85 }}
                />
                {marriageControls.has(line.mariageId) ? null : (
                  <circle
                    cx={line.midX}
                    cy={line.midY}
                    r={5}
                    className="pointer-events-auto"
                    style={{
                      fill: 'var(--foam)',
                      stroke: 'var(--lagoon-deep)',
                      strokeWidth: 2,
                    }}
                  >
                    <title>{line.label}</title>
                  </circle>
                )}
              </g>
            ))}
          </svg>

          {layout.nodes.map((node) => {
            const personne = personById.get(node.id)
            if (!personne) return null
            const centerX = node.x + CARD_WIDTH / 2 - EXPAND_BUTTON_SIZE / 2
            const top = node.y
            const parentControl = parentControls.get(node.id)
            const childControl = childControls.get(node.id)
            const name = personne.prenom ?? personne.nom ?? 'cette personne'

            return (
              <div key={node.id}>
                <ArbreNode
                  personne={personne}
                  isFocus={node.id === data.focus_id}
                  x={node.x}
                  y={node.y}
                />

                {parentControl ? (
                  <BranchButton
                    kind={parentControl === 'expand' ? 'plus' : 'minus'}
                    left={centerX}
                    top={top - EXPAND_BUTTON_SIZE - 6}
                    label={
                      parentControl === 'expand'
                        ? `Afficher les ascendants de ${name}`
                        : `Réduire les ascendants de ${name}`
                    }
                    onClick={() =>
                      onToggleParents(node.id, parentControl === 'expand')
                    }
                  />
                ) : null}

                {childControl ? (
                  <BranchButton
                    kind={childControl === 'expand' ? 'plus' : 'minus'}
                    left={centerX}
                    top={top + CARD_HEIGHT + 6}
                    label={
                      childControl === 'expand'
                        ? `Afficher les descendants de ${name}`
                        : `Réduire les descendants de ${name}`
                    }
                    onClick={() =>
                      onToggleChildren(node.id, childControl === 'expand')
                    }
                  />
                ) : null}
              </div>
            )
          })}

          {layout.marriageLines.map((line) => {
            const control = marriageControls.get(line.mariageId)
            if (!control) return null
            const label =
              control === 'expand'
                ? 'Afficher les descendants de cette union'
                : 'Réduire les descendants de cette union'
            return (
              <BranchButton
                key={`union-${line.mariageId}`}
                kind={control === 'expand' ? 'plus' : 'minus'}
                left={line.midX - EXPAND_BUTTON_SIZE / 2}
                top={line.midY - EXPAND_BUTTON_SIZE / 2}
                label={`${label} (${line.label})`}
                onClick={() =>
                  onToggleMarriage(line.mariageId, control === 'expand')
                }
              />
            )
          })}
        </div>

        <p
          id="arbre-aide"
          className="pointer-events-none absolute bottom-3 left-3 hidden max-w-sm rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-1.5 text-xs text-muted-foreground shadow-sm sm:block"
        >
          Glissez pour déplacer · molette ou pincement pour zoomer · utilisez{' '}
          <span aria-hidden="true">＋</span> / <span aria-hidden="true">−</span>{' '}
          pour déplier ou réduire une branche.
        </p>

        <div className="absolute right-3 bottom-3 flex items-center gap-1 rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] p-1 shadow-sm backdrop-blur-sm">
          {canReduce ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onReset}
                aria-label="Réduire l’arbre"
                title="Réduire l’arbre (revenir à 3 générations)"
              >
                <RotateCcwIcon />
              </Button>
              <span
                className="mx-0.5 h-5 w-px bg-[var(--line)]"
                aria-hidden="true"
              />
            </>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => zoomBy(1 / 1.25)}
            aria-label="Zoom arrière"
          >
            <MinusIcon />
          </Button>
          <span
            className="w-12 text-center text-xs tabular-nums text-muted-foreground"
            aria-live="polite"
          >
            {scalePercent}%
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => zoomBy(1.25)}
            aria-label="Zoom avant"
          >
            <PlusIcon />
          </Button>
          <span
            className="mx-0.5 h-5 w-px bg-[var(--line)]"
            aria-hidden="true"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={fit}
            aria-label="Recadrer l’arbre"
          >
            <MaximizeIcon />
          </Button>
        </div>
      </div>
    </div>
  )
}

function BranchButton({
  kind,
  left,
  top,
  label,
  onClick,
}: {
  kind: 'plus' | 'minus'
  left: number
  top: number
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        left,
        top,
        width: EXPAND_BUTTON_SIZE,
        height: EXPAND_BUTTON_SIZE,
      }}
      className="absolute z-20 flex items-center justify-center rounded-full border border-[var(--lagoon-deep)] bg-[var(--surface-strong)] text-[var(--lagoon-deep)] shadow-sm transition-colors hover:bg-[var(--lagoon-deep)] hover:text-white focus-visible:ring-[3px] focus-visible:ring-[var(--lagoon)]/50 focus-visible:outline-none"
    >
      {kind === 'plus' ? (
        <PlusIcon className="size-4" aria-hidden="true" />
      ) : (
        <MinusIcon className="size-4" aria-hidden="true" />
      )}
    </button>
  )
}
