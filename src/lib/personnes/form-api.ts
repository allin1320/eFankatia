import type { ReactFormExtendedApi } from '@tanstack/react-form'

import type { PersonneFormValues } from './types'

/**
 * Type de l'API de formulaire partagée entre l'orchestrateur
 * (`personne-form.tsx`) et ses sections.
 *
 * `useForm` déclare 12 paramètres de type sans valeur par défaut ; on les
 * laisse ouverts (`any`) pour rester compatible avec l'instance concrète.
 */
export type PersonneFormApi = ReactFormExtendedApi<
  PersonneFormValues,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any
>
