import { useState } from 'react'
import type { FormEvent } from 'react'
import { Loader2Icon, PencilIcon, ShieldAlertIcon } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
import { FormField } from '#/components/personnes/form-field'
import { PersonCombobox } from '#/components/personnes/person-combobox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { ROLE_LABELS } from '#/lib/auth/roles'
import type { PersonneCandidat } from '#/lib/personnes/types'
import { formatPersonneName } from '#/lib/personnes/format'
import type { UserRole } from '#/lib/supabase/types'
import { useUpdateUtilisateurRole } from '#/lib/utilisateurs/mutations'
import { ROLE_OPTIONS } from '#/lib/utilisateurs/format'
import type { AdminUtilisateur } from '#/lib/utilisateurs/types'

type UtilisateurEditDialogProps = {
  utilisateur: AdminUtilisateur
  isSelf: boolean
  onSuccess: (message: string) => void
}

/** Construit la sélection initiale de lignée à partir de la ligne de liste. */
function toPersonneCandidat(
  utilisateur: AdminUtilisateur,
): PersonneCandidat | null {
  if (!utilisateur.personne_id) return null
  return {
    id: utilisateur.personne_id,
    nom: utilisateur.personne_nom,
    prenom: utilisateur.personne_prenom,
    appellation: utilisateur.personne_appellation,
    sexe: null,
    date_naissance: null,
    date_deces: null,
    url_img_thumb: utilisateur.personne_url_img_thumb,
    est_lignee_generale: false,
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Une erreur inattendue est survenue.'
}

/**
 * Modification du rôle et de la lignée d'un compte.
 *
 * Le changement est confirmé dans un second dialogue ; la base reste seule
 * juge des gardes (dernier admin, auto-rétrogradation, lignée obligatoire).
 */
export function UtilisateurEditDialog({
  utilisateur,
  isSelf,
  onSuccess,
}: UtilisateurEditDialogProps) {
  const [open, setOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [role, setRole] = useState<UserRole>(utilisateur.role)
  const [personne, setPersonne] = useState<PersonneCandidat | null>(() =>
    toPersonneCandidat(utilisateur),
  )
  const [personneError, setPersonneError] = useState<string | null>(null)
  const [mutationError, setMutationError] = useState<string | null>(null)
  const mutation = useUpdateUtilisateurRole()

  const isLastAdmin =
    utilisateur.role === 'ROLE_ADMIN' && utilisateur.admin_count <= 1
  const personneId = role === 'ROLE_MODERATEUR' ? (personne?.id ?? null) : null
  const changed =
    role !== utilisateur.role || personneId !== utilisateur.personne_id
  const email = utilisateur.email ?? 'ce compte'

  function resetForm() {
    setRole(utilisateur.role)
    setPersonne(toPersonneCandidat(utilisateur))
    setPersonneError(null)
    setMutationError(null)
  }

  function handleOpenChange(nextOpen: boolean) {
    if (mutation.isPending) return
    setOpen(nextOpen)
    if (nextOpen) resetForm()
  }

  function handleRoleChange(value: string) {
    const nextRole = value as UserRole
    setRole(nextRole)
    setPersonneError(null)
    if (nextRole !== 'ROLE_MODERATEUR') setPersonne(null)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (role === 'ROLE_MODERATEUR' && !personne) {
      setPersonneError(
        'Sélectionnez la personne à laquelle rattacher la lignée du modérateur.',
      )
      return
    }

    setPersonneError(null)
    setMutationError(null)
    setOpen(false)
    setConfirmOpen(true)
  }

  async function handleConfirm() {
    setMutationError(null)
    try {
      await mutation.mutateAsync({
        userId: utilisateur.id,
        role,
        personneId,
      })
      setConfirmOpen(false)
      onSuccess(`Le rôle de ${email} a été mis à jour.`)
    } catch (error) {
      setMutationError(errorMessage(error))
    }
  }

  function handleConfirmOpenChange(nextOpen: boolean) {
    if (mutation.isPending) return
    setConfirmOpen(nextOpen)
    if (!nextOpen) setMutationError(null)
  }

  function handleCancelConfirm() {
    if (mutation.isPending) return
    setConfirmOpen(false)
    setMutationError(null)
    setOpen(true)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <PencilIcon />
            Modifier
          </Button>
        </DialogTrigger>

        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier le compte</DialogTitle>
            <DialogDescription>
              {email} — rôle et lignée assignée.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {isSelf ? (
              <Alert>
                <ShieldAlertIcon />
                <AlertTitle>Votre compte</AlertTitle>
                <AlertDescription>
                  Vous ne pouvez pas retirer votre propre rôle administrateur.
                  Un autre administrateur doit effectuer cette opération.
                </AlertDescription>
              </Alert>
            ) : isLastAdmin ? (
              <Alert>
                <ShieldAlertIcon />
                <AlertTitle>Dernier administrateur</AlertTitle>
                <AlertDescription>
                  Ce compte est le seul à porter le rôle administrateur. Il ne
                  peut pas être rétrogradé.
                </AlertDescription>
              </Alert>
            ) : null}

            <FormField
              id="role-utilisateur"
              label="Rôle"
              required
              helper={
                role === 'ROLE_MODERATEUR'
                  ? 'Le modérateur peut créer et modifier les fiches de sa lignée.'
                  : 'La lignée assignée est automatiquement retirée pour ce rôle.'
              }
            >
              {({ id, ...aria }) => (
                <Select
                  value={role}
                  onValueChange={handleRoleChange}
                  disabled={mutation.isPending}
                >
                  <SelectTrigger id={id} className="w-full" {...aria}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((option) => {
                      const disabled =
                        (isSelf || isLastAdmin) && option.value !== 'ROLE_ADMIN'
                      return (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          disabled={disabled}
                        >
                          {option.label}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              )}
            </FormField>

            {role === 'ROLE_MODERATEUR' ? (
              <PersonCombobox
                id="lignee-utilisateur"
                label="Lignée assignée"
                placeholder="Rechercher la personne de référence…"
                required
                hint="Les droits d’écriture du modérateur couvrent cette personne, ses descendants et leurs conjoints."
                error={personneError}
                selected={personne}
                onSelect={(nextPersonne) => {
                  setPersonne(nextPersonne)
                  setPersonneError(null)
                }}
              />
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={mutation.isPending}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                variant="brand"
                disabled={!changed || mutation.isPending}
              >
                Continuer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={handleConfirmOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer le changement ?</AlertDialogTitle>
            <AlertDialogDescription>
              {email} passera du rôle{' '}
              <strong>{ROLE_LABELS[utilisateur.role]}</strong> au rôle{' '}
              <strong>{ROLE_LABELS[role]}</strong>.
              {role === 'ROLE_MODERATEUR' && personne
                ? ` Lignée assignée : ${formatPersonneName(personne)}.`
                : ' Aucune lignée ne sera assignée.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {mutationError ? (
            <Alert variant="destructive">
              <AlertDescription>{mutationError}</AlertDescription>
            </Alert>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={mutation.isPending}
              onClick={(event) => {
                event.preventDefault()
                handleCancelConfirm()
              }}
            >
              Revenir
            </AlertDialogCancel>
            <AlertDialogAction
              variant="brand"
              disabled={mutation.isPending}
              onClick={(event) => {
                event.preventDefault()
                void handleConfirm()
              }}
            >
              {mutation.isPending ? (
                <Loader2Icon className="animate-spin" />
              ) : null}
              {mutation.isPending ? 'Enregistrement…' : 'Confirmer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
