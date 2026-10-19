/** Helpers d'extraction de messages d'erreur issus de validateurs de formulaire. */

function messageFromObject(value: object): string | null {
  if ('message' in value) {
    const message = (value as { message?: unknown }).message
    if (typeof message === 'string' && message.trim() !== '') return message
  }
  if ('issues' in value) {
    const issues = (value as { issues?: unknown }).issues
    if (Array.isArray(issues)) {
      for (const issue of issues) {
        if (issue && typeof issue === 'object') {
          const message = messageFromObject(issue)
          if (message) return message
        }
      }
    }
  }
  return null
}

/** Renvoie le premier message lisible d'une valeur d'erreur inconnue. */
export function validationMessage(error: unknown): string | null {
  if (!error) return null
  if (typeof error === 'string') return error.trim() !== '' ? error : null
  if (typeof error === 'object') return messageFromObject(error)
  return null
}

/** Renvoie le premier message lisible parmi une liste d'erreurs. */
export function firstValidationMessage(
  errors: ReadonlyArray<unknown>,
): string | null {
  for (const error of errors) {
    const message = validationMessage(error)
    if (message) return message
  }
  return null
}
