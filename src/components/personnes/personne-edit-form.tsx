import { useState } from 'react'
import { useForm, useStore } from '@tanstack/react-form'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  CircleAlertIcon,
  Loader2Icon,
  MapPinIcon,
  SaveIcon,
  UserRoundIcon,
} from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { ErrorSummary } from './error-summary'
import type { FormIssue } from './error-summary'
import { IdentiteSection } from './identite-section'
import { OriginesSection } from './origines-section'
import { SectionCard } from './section-card'
import { usePersonnePhoto } from './use-personne-photo'
import { prepareImage } from '#/lib/images/prepare-image'
import { uploadPersonnePhoto } from '#/lib/imgbb/server'
import { mapPersonneError, mapPhotoError } from '#/lib/personnes/errors'
import type { PhotoUpdate } from '#/lib/personnes/fiche-types'
import { useUpdatePersonne } from '#/lib/personnes/mutations'
import {
  FIELD_LABELS,
  FIELD_SECTION,
  personneBaseSchema,
  personneToFormValues,
} from '#/lib/personnes/schema'
import type { PersonneFormValues } from '#/lib/personnes/types'
import type { Personne } from '#/lib/supabase/types'

function buildIssues(values: PersonneFormValues): FormIssue[] {
  const parsed = personneBaseSchema.safeParse(values)
  if (parsed.success) return []

  const issues: FormIssue[] = []
  const seen = new Set<string>()

  for (const issue of parsed.error.issues) {
    const field = String(issue.path[0] ?? '')
    if (!field || seen.has(field)) continue
    seen.add(field)
    issues.push({
      field,
      label: FIELD_LABELS[field as keyof PersonneFormValues] ?? field,
      section: FIELD_SECTION[field as keyof PersonneFormValues] ?? 'identite',
      message: issue.message,
    })
  }

  return issues
}

type PersonneEditFormProps = {
  personne: Personne
}

/** Formulaire de modification des informations civiles d'une personne. */
export function PersonneEditForm({ personne }: PersonneEditFormProps) {
  const navigate = useNavigate()
  const mutation = useUpdatePersonne()
  const [summary, setSummary] = useState<FormIssue[]>([])
  const [formError, setFormError] = useState<string | null>(null)

  const {
    photo,
    choose: choosePhoto,
    remove: removePhoto,
    reject: rejectPhoto,
    markUploading,
    markUploaded,
    markError,
    reset: resetPhoto,
  } = usePersonnePhoto({
    urlImg: personne.urlImg,
    urlImgThumb: personne.urlImgThumb,
  })

  const form = useForm({
    defaultValues: personneToFormValues(personne),
    validators: { onSubmit: personneBaseSchema },
    listeners: {
      onChange: () => setSummary([]),
    },
    onSubmitInvalid: ({ value }) => {
      setFormError(null)
      setSummary(buildIssues(value))
    },
    onSubmit: async ({ value }) => {
      setFormError(null)
      setSummary([])

      let photoUpdate: PhotoUpdate = { kind: 'keep' }
      let urls = photo.urls

      if (!urls && photo.file) {
        markUploading()
        try {
          const prepared = await prepareImage(photo.file)
          urls = await uploadPersonnePhoto({
            data: {
              base64: prepared.base64,
              mimeType: prepared.mimeType,
              name: `personne-${value.nom.trim()}-${value.prenom.trim()}`,
            },
          })
          markUploaded(urls)
        } catch (error) {
          const message = mapPhotoError(error)
          markError(message)
          setFormError(message)
          return
        }
      }

      if (photo.file && urls) {
        photoUpdate = { kind: 'set', urls }
      } else if (photo.removed) {
        photoUpdate = { kind: 'remove' }
      }

      try {
        await mutation.mutateAsync({
          id: personne.id,
          values: value,
          photo: photoUpdate,
          updatedAt: personne.updated_at,
        })
        resetPhoto()
        await navigate({
          to: '/app/personnes/$personneId',
          params: { personneId: personne.id },
        })
      } catch (error) {
        setFormError(mapPersonneError(error))
      }
    },
  })

  const values = useStore(form.store, (state) => state.values)
  const isSubmitting = useStore(form.store, (state) => state.isSubmitting)

  return (
    <form
      noValidate
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <ErrorSummary issues={summary} />

      {formError ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Modification impossible</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <SectionCard
            id="identite"
            number="01"
            title="Identité"
            description="Les informations civiles de base et la photo de profil."
            icon={UserRoundIcon}
          >
            <IdentiteSection
              form={form}
              photoPreviewUrl={photo.previewUrl}
              photoStatus={photo.status}
              photoError={photo.error}
              onPhotoSelect={(file) => {
                choosePhoto(file)
                setFormError(null)
              }}
              onPhotoRemove={removePhoto}
              onPhotoReject={rejectPhoto}
            />
          </SectionCard>

          <SectionCard
            id="origines"
            number="02"
            title="Origines & localisation"
            description="Dates, métier, contact et lieux de vie."
            icon={MapPinIcon}
          >
            <OriginesSection form={form} />
          </SectionCard>
        </div>

        <aside className="space-y-4">
          <div className="island-shell rounded-2xl border border-[var(--line)] p-5">
            <p className="island-kicker">Résumé</p>
            <p className="display-title mt-1 text-lg font-semibold text-[var(--sea-ink)]">
              {values.prenom || values.nom
                ? `${values.prenom} ${values.nom}`.trim()
                : 'Personne'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Les liens familiaux (parents, unions, enfants) se gèrent depuis la
              fiche, via les actions rapides.
            </p>
          </div>
        </aside>
      </div>

      <div className="sticky bottom-0 z-30 -mx-4 flex flex-col-reverse gap-2 border-t border-[var(--line)] bg-[var(--bg-base)]/85 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-sm sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:flex-row lg:justify-end lg:rounded-2xl lg:border lg:bg-[var(--surface-strong)] lg:px-5">
        <Button asChild variant="ghost" className="h-11 sm:h-10">
          <Link
            to="/app/personnes/$personneId"
            params={{ personneId: personne.id }}
          >
            Annuler
          </Link>
        </Button>
        <Button
          type="submit"
          variant="brand"
          className="h-11 sm:h-10"
          disabled={isSubmitting || photo.status === 'uploading'}
        >
          {isSubmitting ? (
            <Loader2Icon className="animate-spin" />
          ) : (
            <SaveIcon />
          )}
          {isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      </div>
    </form>
  )
}
