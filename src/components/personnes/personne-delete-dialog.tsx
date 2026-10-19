import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Loader2Icon, Trash2Icon, TriangleAlertIcon } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '#/components/ui/alert-dialog'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { useDeletePersonne } from '#/lib/personnes/mutations'
import { mapPersonneError } from '#/lib/personnes/errors'
import type { PersonneFiche } from '#/lib/personnes/fiche-types'
import { formatPersonneName } from '#/lib/personnes/format'

type PersonneDeleteDialogProps = {
  fiche: PersonneFiche
  isOwnLignee: boolean
}

/** Confirmation de suppression avec aperçu de l'impact sur les liens. */
export function PersonneDeleteDialog({
  fiche,
  isOwnLignee,
}: PersonneDeleteDialogProps) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mutation = useDeletePersonne()
  const navigate = useNavigate()

  const handleDelete = async () => {
    setError(null)
    try {
      await mutation.mutateAsync(fiche.personne.id)
      setOpen(false)
      await navigate({
        to: '/app/recherche',
        search: { q: '', notice: 'deleted' },
      })
    } catch (deleteError) {
      setError(mapPersonneError(deleteError))
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!mutation.isPending) {
          setOpen(nextOpen)
          if (!nextOpen) setError(null)
        }
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="h-10">
          <Trash2Icon />
          Supprimer
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Supprimer {formatPersonneName(fiche.personne)} ?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Cette action est définitive. La personne sera retirée de l’arbre
            familial, ainsi que ses liens.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ul className="space-y-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 text-sm">
          <li>
            <strong>{fiche.unions.length}</strong>{' '}
            {fiche.unions.length > 1 ? 'unions supprimées' : 'union supprimée'}
          </li>
          <li>
            <strong>{fiche.enfants.length}</strong>{' '}
            {fiche.enfants.length > 1
              ? 'liens vers des enfants retirés'
              : 'lien vers un enfant retiré'}
          </li>
          <li>
            <strong>{fiche.parents.length}</strong>{' '}
            {fiche.parents.length > 1
              ? 'liens vers des parents retirés'
              : 'lien vers un parent retiré'}
          </li>
        </ul>

        <p className="text-sm text-muted-foreground">
          Les autres personnes ne sont pas supprimées. Elles perdent simplement
          le lien avec cette personne.
        </p>

        {isOwnLignee ? (
          <Alert>
            <TriangleAlertIcon />
            <AlertDescription>
              Cette personne est le point d’ancrage de votre lignée. Après
              suppression, votre compte n’aura plus de lignée assignée.
            </AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={mutation.isPending}
            onClick={(event) => {
              event.preventDefault()
              void handleDelete()
            }}
          >
            {mutation.isPending ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <Trash2Icon />
            )}
            {mutation.isPending ? 'Suppression…' : 'Supprimer définitivement'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
