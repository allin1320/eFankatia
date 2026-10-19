import { useEffect, useState } from 'react'

/**
 * Renvoie une valeur retardée de `delay` ms.
 * Utilisé pour débouncer les recherches de combobox côté serveur.
 */
export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
