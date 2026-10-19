import type { ReactNode } from 'react'
import { cn } from 'cn'

import { Label } from '#/components/ui/label'

/** Props ARIA à appliquer au contrôle (input, bouton, etc.). */
export type FieldControlProps = {
  id: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean
}

type FormFieldProps = {
  id: string
  label: string
  required?: boolean
  helper?: ReactNode
  error?: string | null
  className?: string
  children: (control: FieldControlProps) => ReactNode
}

/**
 * Champ de formulaire accessible : label associé, indicateur de champ requis,
 * texte d'aide et erreur inline (`role="alert"`, reliée via `aria-describedby`).
 */
export function FormField({
  id,
  label,
  required = false,
  helper,
  error,
  className,
  children,
}: FormFieldProps) {
  const helperId = helper ? `${id}-helper` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [helperId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id}>
        {label}
        {required ? (
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        ) : null}
      </Label>

      {children({
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
      })}

      {helper ? (
        <p id={helperId} className="text-xs text-muted-foreground">
          {helper}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
