import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  EyeIcon,
  EyeOffIcon,
  InfoIcon,
  Loader2Icon,
  UserPlusIcon,
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
import { PersonCombobox } from '#/components/personnes/person-combobox'
import { Input } from '#/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import type { PersonneCandidat } from '#/lib/personnes/types'
import type { UserRole } from '#/lib/supabase/types'
import { useCreateUtilisateur } from '#/lib/utilisateurs/mutations'
import { ROLE_OPTIONS } from '#/lib/utilisateurs/format'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type UtilisateurCreateDialogProps = {
  onSuccess: (message: string) => void
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Une erreur inattendue est survenue.'
}

/** Création d'un compte : email, mot de passe provisoire, rôle et lignée. */
export function UtilisateurCreateDialog({
  onSuccess,
}: UtilisateurCreateDialogProps) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState<UserRole>('ROLE_USER')
  const [personne, setPersonne] = useState<PersonneCandidat | null>(null)
  const [errors, setErrors] = useState<{
    email?: string
    password?: string
    personne?: string
  }>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const mutation = useCreateUtilisateur()

  function resetForm() {
    setEmail('')
    setPassword('')
    setShowPassword(false)
    setRole('ROLE_USER')
    setPersonne(null)
    setErrors({})
    setServerError(null)
  }

  function handleOpenChange(nextOpen: boolean) {
    if (mutation.isPending) return
    setOpen(nextOpen)
    if (nextOpen) resetForm()
  }

  function handleRoleChange(value: string) {
    const nextRole = value as UserRole
    setRole(nextRole)
    setErrors((current) => ({ ...current, personne: undefined }))
    if (nextRole !== 'ROLE_MODERATEUR') setPersonne(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: typeof errors = {}
    const trimmedEmail = email.trim()

    if (!trimmedEmail) {
      nextErrors.email = 'L’adresse e-mail est obligatoire.'
    } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
      nextErrors.email = 'Adresse e-mail invalide.'
    }

    if (!password) {
      nextErrors.password = 'Le mot de passe est obligatoire.'
    } else if (password.length < 8) {
      nextErrors.password =
        'Le mot de passe doit contenir au moins 8 caractères.'
    } else if (password.length > 72) {
      nextErrors.password =
        'Le mot de passe ne peut pas dépasser 72 caractères.'
    }

    if (role === 'ROLE_MODERATEUR' && !personne) {
      nextErrors.personne =
        'Sélectionnez la personne à laquelle rattacher la lignée du modérateur.'
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setServerError(null)

    try {
      const created = await mutation.mutateAsync({
        email: trimmedEmail,
        password,
        role,
        personneId: role === 'ROLE_MODERATEUR' ? (personne?.id ?? null) : null,
      })
      setOpen(false)
      onSuccess(`Le compte ${created.email} a été créé.`)
    } catch (error) {
      setServerError(errorMessage(error))
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="brand" className="h-10">
          <UserPlusIcon />
          Ajouter un compte
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter un utilisateur</DialogTitle>
          <DialogDescription>
            Créez le compte, puis attribuez son rôle et, si nécessaire, sa
            lignée.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <FormField
            id="nouvel-utilisateur-email"
            label="Adresse e-mail"
            required
            error={errors.email}
          >
            {({ id, ...aria }) => (
              <Input
                id={id}
                type="email"
                autoComplete="off"
                autoFocus
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setErrors((current) => ({ ...current, email: undefined }))
                }}
                placeholder="personne@exemple.com"
                {...aria}
              />
            )}
          </FormField>

          <FormField
            id="nouvel-utilisateur-password"
            label="Mot de passe provisoire"
            required
            error={errors.password}
            helper="8 caractères minimum. Communiquez-le à la personne après la création."
          >
            {({ id, ...aria }) => (
              <div className="relative">
                <Input
                  id={id}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
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
                      ? 'Masquer le mot de passe'
                      : 'Afficher le mot de passe'
                  }
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </Button>
              </div>
            )}
          </FormField>

          <FormField
            id="nouvel-utilisateur-role"
            label="Rôle"
            required
            helper={
              role === 'ROLE_MODERATEUR'
                ? 'Le modérateur peut créer et modifier les fiches de sa lignée.'
                : role === 'ROLE_ADMIN'
                  ? 'Accès complet : personnes, unions, suppressions et gestion des comptes.'
                  : 'Le compte pourra consulter l’arbre en lecture seule.'
            }
          >
            {({ id, ...aria }) => (
              <Select value={role} onValueChange={handleRoleChange}>
                <SelectTrigger id={id} className="w-full" {...aria}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>

          {role === 'ROLE_MODERATEUR' ? (
            <PersonCombobox
              id="nouvel-utilisateur-lignee"
              label="Lignée assignée"
              placeholder="Rechercher la personne de référence…"
              required
              hint="Les droits d’écriture du modérateur couvrent cette personne, ses descendants et leurs conjoints."
              error={errors.personne}
              selected={personne}
              onSelect={(nextPersonne) => {
                setPersonne(nextPersonne)
                setErrors((current) => ({ ...current, personne: undefined }))
              }}
            />
          ) : null}

          <Alert>
            <InfoIcon />
            <AlertDescription>
              Le compte est immédiatement actif. Transmettez l’adresse e-mail et
              le mot de passe provisoire à la personne concernée.
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
                <UserPlusIcon />
              )}
              {mutation.isPending ? 'Création…' : 'Créer le compte'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
