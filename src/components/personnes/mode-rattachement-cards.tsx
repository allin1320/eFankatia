import type { ReactNode } from 'react'
import {
  BabyIcon,
  CheckCircle2Icon,
  HeartHandshakeIcon,
  TreePineIcon,
} from 'lucide-react'
import { cn } from 'cn'

import { Badge } from '#/components/ui/badge'
import type { RattachementMode } from '#/lib/personnes/types'

type ModeCardOption = {
  key: 'alliance' | 'naissance' | 'racine'
  /** Modes qui sélectionnent cette carte. */
  matches: RattachementMode[]
  /** Mode appliqué quand la carte est choisie. */
  defaultMode: RattachementMode
  title: string
  description: string
  badge: string
  icon: typeof BabyIcon
  adminOnly?: boolean
}

const OPTIONS: ModeCardOption[] = [
  {
    key: 'alliance',
    matches: ['alliance'],
    defaultMode: 'alliance',
    title: 'Par alliance',
    description:
      'La personne rejoint la famille par une union avec un conjoint existant.',
    badge: 'Alliance',
    icon: HeartHandshakeIcon,
  },
  {
    key: 'naissance',
    matches: ['naissance_mariage', 'naissance_parent'],
    defaultMode: 'naissance_mariage',
    title: 'Par naissance',
    description:
      'La personne descend de la famille, via une union existante ou un parent unique.',
    badge: 'Lignée générale',
    icon: BabyIcon,
  },
  {
    key: 'racine',
    matches: ['racine'],
    defaultMode: 'racine',
    title: 'Ancêtre racine',
    description:
      'Aucun rattachement : la personne sera un point de départ de l’arbre.',
    badge: 'Racine',
    icon: TreePineIcon,
    adminOnly: true,
  },
]

type ModeRattachementCardsProps = {
  value: RattachementMode | ''
  onChange: (mode: RattachementMode) => void
  isAdmin: boolean
  error?: string | null
  hint?: ReactNode
}

/** Cartes radio de choix du mode de rattachement. */
export function ModeRattachementCards({
  value,
  onChange,
  isAdmin,
  error,
  hint,
}: ModeRattachementCardsProps) {
  const options = OPTIONS.filter((option) => !option.adminOnly || isAdmin)

  return (
    <fieldset
      data-field="mode"
      tabIndex={-1}
      className="space-y-2 outline-none"
      aria-describedby={error ? 'mode-error' : undefined}
    >
      <legend className="text-sm font-medium">
        Mode de rattachement
        <span className="ml-1 text-destructive" aria-hidden="true">
          *
        </span>
      </legend>

      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const Icon = option.icon
          const selected = option.matches.includes(value as RattachementMode)
          return (
            <label
              key={option.key}
              className={cn(
                'relative flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-[var(--lagoon)]/40',
                selected
                  ? 'border-[var(--lagoon-deep)] bg-[var(--foam)] ring-1 ring-[var(--lagoon)]/30 dark:bg-[var(--sand)]'
                  : 'border-[var(--line)] bg-[var(--surface)] hover:border-[var(--lagoon-deep)]/50',
              )}
            >
              <input
                type="radio"
                name="mode"
                value={option.key}
                checked={selected}
                onChange={() => {
                  if (!selected) onChange(option.defaultMode)
                }}
                className="sr-only"
              />

              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--sand)] text-[var(--palm)]">
                <Icon className="size-5" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-[var(--sea-ink)]">
                    {option.title}
                  </span>
                  <Badge variant="outline" className="font-normal">
                    {option.badge}
                  </Badge>
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {option.description}
                </span>
              </span>

              <CheckCircle2Icon
                aria-hidden="true"
                className={cn(
                  'size-5 shrink-0 text-[var(--lagoon-deep)] transition-opacity',
                  selected ? 'opacity-100' : 'opacity-0',
                )}
              />
            </label>
          )
        })}
      </div>

      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}

      {error ? (
        <p id="mode-error" role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </fieldset>
  )
}
