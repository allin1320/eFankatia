import { useState } from 'react'
import { Loader2Icon, PencilIcon, Trash2Icon } from 'lucide-react'

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
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { mapPersonneError } from '#/lib/personnes/errors'
import type { PersonneUnion } from '#/lib/personnes/fiche-types'
import { TYPE_FIN_LABELS } from '#/lib/personnes/fiche-types'
import { useDeleteMariage, useUpdateMariage } from '#/lib/personnes/mutations'

type MariageEditDialogProps = {
  union: PersonneUnion
  conjointName: string
}

/** Édition des dates et du statut d'une union. */
export function MariageEditDialog({
  union,
  conjointName,
}: MariageEditDialogProps) {
  const [open, setOpen] = useState(false)
  const [dateMariage, setDateMariage] = useState(union.date_mariage ?? '')
  const [dateFin, setDateFin] = useState(union.date_fin ?? '')
  const [typeFin, setTypeFin] = useState(union.type_fin ?? '')
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const updateMutation = useUpdateMariage()
  const deleteMutation = useDeleteMariage()
  const pending = updateMutation.isPending || deleteMutation.isPending

  const reset = () => {
    setDateMariage(union.date_mariage ?? '')
    setDateFin(union.date_fin ?? '')
    setTypeFin(union.type_fin ?? '')
    setError(null)
    setConfirmDelete(false)
  }

  const handleSave = async () => {
    setError(null)

    if (dateMariage && dateFin && dateFin < dateMariage) {
      setError('La date de fin doit être postérieure à la date de l’union.')
      return
    }

    try {
      await updateMutation.mutateAsync({
        id: union.id,
        date_mariage: dateMariage || null,
        date_fin: dateFin || null,
        type_fin: dateFin ? typeFin || null : null,
      })
      setOpen(false)
    } catch (saveError) {
      setError(mapPersonneError(saveError))
    }
  }

  const handleDelete = async () => {
    setError(null)
    try {
      await deleteMutation.mutateAsync(union.id)
      setOpen(false)
    } catch (deleteError) {
      setError(mapPersonneError(deleteError))
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!pending) {
          setOpen(nextOpen)
          if (!nextOpen) reset()
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <PencilIcon />
          Modifier
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Union avec {conjointName}</DialogTitle>
          <DialogDescription>
            Renseignez la date de l’union et, le cas échéant, sa fin (divorce,
            veuvage, séparation).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`date-mariage-${union.id}`}>Date de l’union</Label>
            <Input
              id={`date-mariage-${union.id}`}
              type="date"
              min="1500-01-01"
              max={new Date().toISOString().slice(0, 10)}
              value={dateMariage}
              onChange={(event) => setDateMariage(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`date-fin-${union.id}`}>Date de fin</Label>
            <Input
              id={`date-fin-${union.id}`}
              type="date"
              min="1500-01-01"
              max={new Date().toISOString().slice(0, 10)}
              value={dateFin}
              onChange={(event) => {
                setDateFin(event.target.value)
                if (!event.target.value) setTypeFin('')
              }}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor={`type-fin-${union.id}`}>Type de fin</Label>
            <Select
              value={typeFin}
              onValueChange={setTypeFin}
              disabled={!dateFin}
            >
              <SelectTrigger id={`type-fin-${union.id}`} className="w-full">
                <SelectValue placeholder="Sélectionner un motif" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_FIN_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Le type de fin n’est disponible qu’avec une date de fin.
            </p>
          </div>
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {confirmDelete ? (
          <Alert variant="destructive">
            <AlertDescription>
              <p>
                Supprimer cette union ? Les personnes et les liens parent-enfant
                seront conservés ; seul le lien d’union disparaît.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={deleteMutation.isPending}
                  onClick={() => void handleDelete()}
                >
                  {deleteMutation.isPending ? (
                    <Loader2Icon className="animate-spin" />
                  ) : (
                    <Trash2Icon />
                  )}
                  Confirmer la suppression
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmDelete(false)}
                >
                  Annuler
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : null}

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={pending}
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2Icon />
            Supprimer l’union
          </Button>

          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="brand"
              disabled={pending}
              onClick={() => void handleSave()}
            >
              {updateMutation.isPending ? (
                <Loader2Icon className="animate-spin" />
              ) : null}
              Enregistrer
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
