/** Donne le focus au contrôle correspondant à un champ du formulaire. */
export function focusField(field: string): void {
  if (typeof document === 'undefined') return

  const target =
    document.getElementById(field) ??
    document.querySelector<HTMLElement>(`[data-field="${field}"]`)

  target?.focus()
}
