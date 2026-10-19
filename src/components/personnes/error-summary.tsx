import { useEffect, useRef } from 'react'
import { CircleAlert } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { focusField } from '#/lib/forms/focus'

export type FormIssue = {
  field: string
  label: string
  section: string
  message: string
}

/**
 * Résumé d'erreurs placé en haut du formulaire : focusable, annoncé
 * (`role="alert"`) et relié à chaque champ invalide.
 */
export function ErrorSummary({ issues }: { issues: FormIssue[] }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (issues.length > 0) {
      containerRef.current?.focus()
    }
  }, [issues])

  if (issues.length === 0) return null

  return (
    <Alert
      ref={containerRef}
      tabIndex={-1}
      className="scroll-mt-24"
      variant="destructive"
    >
      <CircleAlert />
      <AlertTitle>
        {issues.length > 1
          ? `Corrigez ${issues.length} champs`
          : 'Corrigez ce champ'}
      </AlertTitle>
      <AlertDescription>
        <ul className="list-disc space-y-1 pl-4">
          {issues.map((issue) => (
            <li key={issue.field}>
              <button
                type="button"
                className="text-left underline underline-offset-2"
                onClick={() => focusField(issue.field)}
              >
                {issue.label}
              </button>{' '}
              : {issue.message}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  )
}
