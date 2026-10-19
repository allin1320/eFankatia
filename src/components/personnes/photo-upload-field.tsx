import { useId, useRef, useState } from 'react'
import { CameraIcon, Loader2Icon, RefreshCwIcon, XIcon } from 'lucide-react'
import { cn } from 'cn'

import { Button } from '#/components/ui/button'
import { PersonAvatar } from './person-avatar'
import { validateImageFile } from '#/lib/images/prepare-image'

export type PhotoFieldStatus =
  'empty' | 'ready' | 'uploading' | 'uploaded' | 'error'

type PhotoUploadFieldProps = {
  previewUrl: string | null
  status: PhotoFieldStatus
  error?: string | null
  disabled?: boolean
  onSelect: (file: File) => void
  onRemove: () => void
  onReject: (message: string) => void
}

/** Zone d'upload photo avec prévisualisation, drag & drop et statut annoncé. */
export function PhotoUploadField({
  previewUrl,
  status,
  error,
  disabled = false,
  onSelect,
  onRemove,
  onReject,
}: PhotoUploadFieldProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return

    const validationError = validateImageFile(file)
    if (validationError) {
      onReject(validationError)
      return
    }
    onSelect(file)
  }

  const statusLabel = (() => {
    switch (status) {
      case 'uploading':
        return 'Envoi de la photo…'
      case 'uploaded':
        return 'Photo prête à être enregistrée.'
      case 'ready':
        return 'Photo sélectionnée : elle sera envoyée à l’enregistrement.'
      case 'error':
        return error ?? "L'envoi de la photo a échoué."
      default:
        return 'Aucune photo sélectionnée.'
    }
  })()

  return (
    <div className="space-y-3">
      <div
        onDragOver={(event) => {
          event.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          if (!disabled) handleFiles(event.dataTransfer.files)
        }}
        className={cn(
          'flex items-center gap-4 rounded-xl border border-dashed p-4 transition-colors',
          dragging
            ? 'border-[var(--lagoon-deep)] bg-[var(--foam)] dark:bg-[var(--sand)]'
            : 'border-[var(--line)] bg-[var(--surface)]',
        )}
      >
        <PersonAvatar
          size="lg"
          className="size-16"
          fallbackClassName="text-lg"
          src={previewUrl}
        />

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--sea-ink)]">
            Photo de profil
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            JPG, PNG ou WebP — 10 Mo max. L’image est optimisée automatiquement.
          </p>

          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || status === 'uploading'}
              onClick={() => inputRef.current?.click()}
            >
              {status === 'uploading' ? (
                <Loader2Icon className="animate-spin" />
              ) : previewUrl ? (
                <RefreshCwIcon />
              ) : (
                <CameraIcon />
              )}
              {previewUrl ? 'Remplacer' : 'Choisir une photo'}
            </Button>

            {previewUrl ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled || status === 'uploading'}
                onClick={onRemove}
              >
                <XIcon />
                Retirer
              </Button>
            ) : null}
          </div>
        </div>

        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={disabled}
          onChange={(event) => {
            handleFiles(event.target.files)
            event.target.value = ''
          }}
        />
      </div>

      <p
        role="status"
        aria-live="polite"
        className={cn(
          'text-xs',
          status === 'error' ? 'text-destructive' : 'text-muted-foreground',
        )}
      >
        {statusLabel}
      </p>
    </div>
  )
}
