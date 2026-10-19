import { useEffect, useRef, useState } from 'react'
import { useForm, useStore } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  CircleAlertIcon,
  Loader2Icon,
  MapPinIcon,
  Share2Icon,
  TriangleAlertIcon,
  UserPlusIcon,
  UsersIcon,
} from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { ErrorSummary } from './error-summary'
import type { FormIssue } from './error-summary'
import { IdentiteSection } from './identite-section'
import { OriginesSection } from './origines-section'
import { PersonneApercu } from './personne-apercu'
import { PersonneSuccess } from './personne-success'
import { RattachementSection } from './rattachement-section'
import { SectionCard } from './section-card'
import type { PhotoFieldStatus } from './photo-upload-field'
import { useDebouncedValue } from '#/hooks/use-debounced-value'
import { useAuth } from '#/lib/auth/auth-context'
import { focusField } from '#/lib/forms/focus'
import { prepareImage } from '#/lib/images/prepare-image'
import { uploadPersonnePhoto } from '#/lib/imgbb/server'
import { mapPersonneError, mapPhotoError } from '#/lib/personnes/errors'
import { describeRelation, formatPersonneName } from '#/lib/personnes/format'
import { useCreatePersonne } from '#/lib/personnes/mutations'
import { typeParentFromSexe } from '#/lib/personnes/payload'
import {
  personneDoublonQueryOptions,
  usePersonneAssignee,
  usePersonneDoublon,
  usePersonnesCandidats,
} from '#/lib/personnes/queries'
import {
  FIELD_LABELS,
  FIELD_SECTION,
  defaultPersonneFormValues,
  personneSchema,
} from '#/lib/personnes/schema'
import type {
  MariageCandidat,
  PersonneCandidat,
  PersonneCreationResult,
  PersonneDoublon,
  PersonneFormValues,
  PhotoUrls,
} from '#/lib/personnes/types'

type PhotoState = {
  file: File | null
  previewUrl: string | null
  urls: PhotoUrls | null
  status: PhotoFieldStatus
  error: string | null
}

const EMPTY_PHOTO: PhotoState = {
  file: null,
  previewUrl: null,
  urls: null,
  status: 'empty',
  error: null,
}

function buildIssues(values: PersonneFormValues): FormIssue[] {
  const parsed = personneSchema.safeParse(values)
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

export function PersonneForm() {
  const { profile, isAdmin, isModerator } = useAuth()
  const queryClient = useQueryClient()
  const mutation = useCreatePersonne()

  const [summary, setSummary] = useState<FormIssue[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  const [created, setCreated] = useState<PersonneCreationResult | null>(null)
  const [photo, setPhoto] = useState<PhotoState>(EMPTY_PHOTO)
  const [conjoint, setConjoint] = useState<PersonneCandidat | null>(null)
  const [mariage, setMariage] = useState<MariageCandidat | null>(null)
  const [parent, setParent] = useState<PersonneCandidat | null>(null)

  const previewUrlRef = useRef<string | null>(null)

  const form = useForm({
    defaultValues: defaultPersonneFormValues(),
    validators: { onSubmit: personneSchema },
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

      const mode = value.mode
      if (mode === '') {
        setFormError('Choisissez un mode de rattachement.')
        return
      }

      // 1. Doublon : vérification finale bloquante.
      try {
        const matches = await queryClient.ensureQueryData(
          personneDoublonQueryOptions(
            value.nom.trim(),
            value.prenom.trim(),
            value.date_naissance ? value.date_naissance : null,
          ),
        )
        if (matches.length > 0) {
          setFormError(
            "Impossible de créer cette personne : un homonyme existe déjà. Renseignez une date de naissance différente s'il s'agit d'une autre personne.",
          )
          focusField('nom')
          return
        }
      } catch {
        // En cas d'échec réseau, la RPC et le trigger trancheront.
      }

      // 2. Photo : upload à la soumission (une seule fois).
      let urls: PhotoUrls | null = photo.urls
      if (!urls && photo.file) {
        setPhoto((prev) => ({ ...prev, status: 'uploading', error: null }))
        try {
          const prepared = await prepareImage(photo.file)
          urls = await uploadPersonnePhoto({
            data: {
              base64: prepared.base64,
              mimeType: prepared.mimeType,
              name: `personne-${value.nom.trim()}-${value.prenom.trim()}`,
            },
          })
          setPhoto((prev) => ({
            ...prev,
            urls,
            status: 'uploaded',
            error: null,
          }))
        } catch (error) {
          const message = mapPhotoError(error)
          setPhoto((prev) => ({ ...prev, status: 'error', error: message }))
          setFormError(message)
          return
        }
      }

      const typeParent =
        mode === 'naissance_parent' && parent
          ? typeParentFromSexe(parent.sexe)
          : null

      try {
        const personne = await mutation.mutateAsync({
          values: value,
          photo: urls,
          typeParent,
        })

        setCreated({
          personne,
          mode,
          relationLabel: describeRelation(mode, {
            conjoint,
            mariage,
            parent,
          }),
        })

        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }
      } catch (error) {
        setFormError(mapPersonneError(error))
      }
    },
  })

  const values = useStore(form.store, (state) => state.values)
  const isSubmitting = useStore(form.store, (state) => state.isSubmitting)

  const debouncedNom = useDebouncedValue(values.nom.trim(), 500)
  const debouncedPrenom = useDebouncedValue(values.prenom.trim(), 500)
  const debouncedDate = useDebouncedValue(values.date_naissance, 500)

  const { data: doublons } = usePersonneDoublon(
    debouncedNom,
    debouncedPrenom,
    debouncedDate ? debouncedDate : null,
  )
  const duplicateMatches: PersonneDoublon[] = doublons ?? []

  const { data: allPersonnes } = usePersonnesCandidats('', isAdmin)
  const baseVide = isAdmin && (allPersonnes?.length ?? 0) === 0

  const { data: assignedPerson } = usePersonneAssignee(
    isModerator ? (profile?.personne_id ?? null) : null,
  )
  const ligneeHint =
    isModerator && assignedPerson
      ? `Vous créez dans la lignée de ${formatPersonneName(assignedPerson)}.`
      : undefined

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }
    }
  }, [])

  const updatePreviewUrl = (url: string | null) => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
    }
    previewUrlRef.current = url
  }

  const handlePhotoSelect = (file: File) => {
    const url = URL.createObjectURL(file)
    updatePreviewUrl(url)
    setPhoto({
      file,
      previewUrl: url,
      urls: null,
      status: 'ready',
      error: null,
    })
    setFormError(null)
  }

  const handlePhotoRemove = () => {
    updatePreviewUrl(null)
    setPhoto(EMPTY_PHOTO)
  }

  const handlePhotoReject = (message: string) => {
    setPhoto((prev) => ({ ...prev, status: 'error', error: message }))
  }

  const handleCreateAnother = () => {
    form.reset()
    updatePreviewUrl(null)
    setPhoto(EMPTY_PHOTO)
    setConjoint(null)
    setMariage(null)
    setParent(null)
    setSummary([])
    setFormError(null)
    setCreated(null)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  if (created) {
    return (
      <PersonneSuccess result={created} onCreateAnother={handleCreateAnother} />
    )
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
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
            <AlertTitle>Création impossible</AlertTitle>
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        {duplicateMatches.length > 0 ? (
          <Alert variant="destructive">
            <TriangleAlertIcon />
            <AlertTitle>Cette personne semble déjà exister</AlertTitle>
            <AlertDescription>
              <ul className="list-disc space-y-1 pl-4">
                {duplicateMatches.map((match) => (
                  <li key={match.id}>
                    {formatPersonneName(match)}
                    {match.date_naissance
                      ? ` (né(e) le ${match.date_naissance})`
                      : ' (date de naissance inconnue)'}
                  </li>
                ))}
              </ul>
              <p>
                Renseignez une date de naissance différente s’il s’agit d’une
                autre personne.
              </p>
            </AlertDescription>
          </Alert>
        ) : null}

        {baseVide ? (
          <Alert>
            <UserPlusIcon />
            <AlertTitle>La base est vide</AlertTitle>
            <AlertDescription>
              Commencez par créer un ancêtre racine, sans rattachement.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="lg:hidden">
          <PersonneApercu
            compact
            values={values}
            relation={{ conjoint, mariage, parent }}
            photoPreviewUrl={photo.previewUrl}
          />
        </div>

        <SectionCard
          id="identite"
          number="01"
          title="Identité"
          description="Les informations civiles de base et la photo de profil."
          icon={UserPlusIcon}
        >
          <IdentiteSection
            form={form}
            photoPreviewUrl={photo.previewUrl}
            photoStatus={photo.status}
            photoError={photo.error}
            onPhotoSelect={handlePhotoSelect}
            onPhotoRemove={handlePhotoRemove}
            onPhotoReject={handlePhotoReject}
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

        <SectionCard
          id="rattachement"
          number="03"
          title="Rattachement"
          description="Comment cette personne rejoint l’arbre familial."
          icon={Share2Icon}
        >
          <RattachementSection
            form={form}
            isAdmin={isAdmin}
            ligneeHint={ligneeHint}
            selectedConjoint={conjoint}
            onConjointSelect={setConjoint}
            selectedMariage={mariage}
            onMariageSelect={setMariage}
            selectedParent={parent}
            onParentSelect={setParent}
          />
        </SectionCard>

        <p className="text-xs text-muted-foreground">
          Les champs marqués d’un <span className="text-destructive">*</span>{' '}
          sont obligatoires.
        </p>

        <div className="sticky bottom-0 z-30 -mx-4 flex flex-col-reverse gap-2 border-t border-[var(--line)] bg-[var(--bg-base)]/85 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-sm sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:flex-row lg:justify-end lg:rounded-2xl lg:border lg:bg-[var(--surface-strong)] lg:px-5">
          <Button asChild variant="ghost" className="h-11 sm:h-10">
            <Link to="/app">Annuler</Link>
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
              <UsersIcon />
            )}
            {isSubmitting ? 'Création…' : 'Créer la personne'}
          </Button>
        </div>
      </form>

      <div className="hidden lg:block">
        <PersonneApercu
          values={values}
          relation={{ conjoint, mariage, parent }}
          photoPreviewUrl={photo.previewUrl}
        />
      </div>
    </div>
  )
}
