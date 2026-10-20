import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import {
  EyeIcon,
  EyeOffIcon,
  InfoIcon,
  KeyRoundIcon,
  Loader2Icon,
} from 'lucide-react'

import { Alert, AlertDescription } from '#/components/ui/alert'
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
import { Input } from '#/components/ui/input'
import { useUpdateUtilisateurPassword } from '#/lib/utilisateurs/mutations'
import type { AdminUtilisateur } from '#/lib/utilisateurs/types'

type UtilisateurPasswordDialogProps = {
  utilisateur: AdminUtilisateur
  onSuccess: (message: string) => void
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Une erreur inattendue est survenue.'
}

/**
 * Réinitialisation du mot de passe d'un compte par un administrateur.
 *
 * Double saisie obligatoire, affichage/masquage et validation locale avant
 * l'appel à l'Admin API (server function).
 */
export function UtilisateurPasswordDialog({
  utilisateur,
  onSuccess,
}: UtilisateurPasswordDialogProps) {
  const passwordId = useId()
  const confirmId = useId()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<{
    password?: string
    confirmation?: string
  }>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const mutation = useUpdateUtilisateurPassword()
  const email = utilisateur.email ?? 'ce compte'

  function resetForm() {
    setPassword('')
    setConfirmation('')
    setShowPassword(false)
    setErrors({})
    setServerError(null)
  }

  function handleOpenChange(nextOpen: boolean) {
    if (mutation.isPending) return
    setOpen(nextOpen)
    if (nextOpen) resetForm()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: typeof errors = {}

    if (!password) {
      nextErrors.password = 'Le mot de passe est obligatoire.'
    } else if (password.length < 8) {
      nextErrors.password =
        'Le mot de passe doit contenir au moins 8 caractères.'
    } else if (password.length > 72) {
      nextErrors.password =
        'Le mot de passe ne peut pas dépasser 72 caractères.'
    }

    if (!confirmation) {
      nextErrors.confirmation = 'Confirmez le mot de passe.'
    } else if (confirmation !== password) {
      nextErrors.confirmation = 'Les deux mots de passe ne correspondent pas.'
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setServerError(null)

    try {
      await mutation.mutateAsync({
        userId: utilisateur.id,
        password,
      })
      setOpen(false)
      onSuccess(`Le mot de passe de ${email} a été mis à jour.`)
    } catch (error) {
      setServerError(errorMessage(error))
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          title="Modifier le mot de passe"
        >
          <KeyRoundIcon />
          <span className="sr-only">Modifier le mot de passe</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier le mot de passe</DialogTitle>
          <DialogDescription>
            {email} — le nouveau mot de passe remplace immédiatement l’ancien.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <FormField
            id={passwordId}
            label="Nouveau mot de passe"
            required
            error={errors.password}
            helper="8 caractères minimum. Aucun e-mail de confirmation n’est envoyé."
          >
            {({ id, ...aria }) => (
              <div className="relative">
                <Input
                  id={id}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  autoFocus
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    setErrors((current) => ({
                      ...current,
                      password: undefined,
                    }))
                  }}
                  placeholder="Au moins 8 caractères"
                  className="pr-10"
                  {...aria}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-1/2 right-1 -translate-y-1/2"
                  aria-label={
                    showPassword
                      ? 'Masquer les mots de passe'
                      : 'Afficher les mots de passe'
                  }
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </Button>
              </div>
            )}
          </FormField>

          <FormField
            id={confirmId}
            label="Confirmer le mot de passe"
            required
            error={errors.confirmation}
          >
            {({ id, ...aria }) => (
              <Input
                id={id}
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => {
                  setConfirmation(event.target.value)
                  setErrors((current) => ({
                    ...current,
                    confirmation: undefined,
                  }))
                }}
                placeholder="Retapez le mot de passe"
                {...aria}
              />
            )}
          </FormField>

          <Alert>
            <InfoIcon />
            <AlertDescription>
              Le changement est immédiat. La personne devra utiliser ce nouveau
              mot de passe à sa prochaine connexion.
            </AlertDescription>
          </Alert>

          {serverError ? (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
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
            <Button type="submit" variant="brand" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <KeyRoundIcon />
              )}
              {mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
