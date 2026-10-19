import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

type SectionCardProps = {
  id: string
  number: string
  title: string
  description?: string
  icon: LucideIcon
  children: ReactNode
}

/** Carte de section numérotée, dans l'esprit « island » du dashboard. */
export function SectionCard({
  id,
  number,
  title,
  description,
  icon: Icon,
  children,
}: SectionCardProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="island-shell scroll-mt-24 rounded-2xl border border-[var(--line)] p-5 sm:p-6"
    >
      <header className="mb-5 flex items-start gap-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--sand)] text-[var(--palm)]">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="display-title text-xs font-semibold tracking-widest text-muted-foreground">
            {number}
          </p>
          <h2
            id={`${id}-title`}
            className="display-title text-lg font-semibold text-[var(--sea-ink)]"
          >
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </header>
      {children}
    </section>
  )
}
