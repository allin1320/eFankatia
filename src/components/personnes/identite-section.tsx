import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RadioGroup, RadioGroupItem } from '#/components/ui/radio-group'
import { cn } from 'cn'
import { FormField } from './form-field'
import { PhotoUploadField } from './photo-upload-field'
import type { PhotoFieldStatus } from './photo-upload-field'
import { personneBaseSchema } from '#/lib/personnes/schema'
import type { PersonneFormApi } from '#/lib/personnes/form-api'
import { SEXE_LABELS } from '#/lib/personnes/types'
import type { Sexe } from '#/lib/personnes/types'
import { firstValidationMessage } from '#/lib/forms/validation'

type IdentiteSectionProps = {
  form: PersonneFormApi
  photoPreviewUrl: string | null
  photoStatus: PhotoFieldStatus
  photoError: string | null
  onPhotoSelect: (file: File) => void
  onPhotoRemove: () => void
  onPhotoReject: (message: string) => void
}

export function IdentiteSection({
  form,
  photoPreviewUrl,
  photoStatus,
  photoError,
  onPhotoSelect,
  onPhotoRemove,
  onPhotoReject,
}: IdentiteSectionProps) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <form.Field
          name="nom"
          validators={{ onBlur: personneBaseSchema.shape.nom }}
        >
          {(field) => (
            <FormField
              id="nom"
              label="Nom"
              required
              error={firstValidationMessage(field.state.meta.errors)}
            >
              {(control) => (
                <Input
                  {...control}
                  name="nom"
                  autoComplete="family-name"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              )}
            </FormField>
          )}
        </form.Field>

        <form.Field
          name="prenom"
          validators={{ onBlur: personneBaseSchema.shape.prenom }}
        >
          {(field) => (
            <FormField
              id="prenom"
              label="Prénom"
              required
              error={firstValidationMessage(field.state.meta.errors)}
            >
              {(control) => (
                <Input
                  {...control}
                  name="prenom"
                  autoComplete="given-name"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              )}
            </FormField>
          )}
        </form.Field>

        <form.Field
          name="appellation"
          validators={{ onBlur: personneBaseSchema.shape.appellation }}
        >
          {(field) => (
            <FormField
              id="appellation"
              label="Appellation"
              required
              helper="Nom d’usage dans la famille (ex. « Tonton Jean »). Sert d’avatar sans photo."
              error={firstValidationMessage(field.state.meta.errors)}
            >
              {(control) => (
                <Input
                  {...control}
                  name="appellation"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              )}
            </FormField>
          )}
        </form.Field>

        <form.Field name="sexe">
          {(field) => {
            const error = firstValidationMessage(field.state.meta.errors)
            return (
              <fieldset
                data-field="sexe"
                tabIndex={-1}
                className="space-y-2 outline-none"
                aria-describedby={error ? 'sexe-error' : undefined}
              >
                <legend className="text-sm font-medium">
                  Sexe
                  <span className="ml-1 text-destructive" aria-hidden="true">
                    *
                  </span>
                </legend>
                <RadioGroup
                  value={field.state.value}
                  onValueChange={(value) => field.handleChange(value as Sexe)}
                  onBlur={field.handleBlur}
                  className="flex gap-3"
                >
                  {(['M', 'F'] as const).map((value) => {
                    const selected = field.state.value === value
                    return (
                      <Label
                        key={value}
                        htmlFor={`sexe-${value}`}
                        className={cn(
                          'flex h-10 flex-1 cursor-pointer items-center gap-2 rounded-md border px-3 font-normal transition-colors has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-[var(--lagoon)]/40',
                          selected
                            ? 'border-[var(--lagoon-deep)] bg-[var(--foam)] dark:bg-[var(--sand)]'
                            : 'border-input',
                        )}
                      >
                        <RadioGroupItem id={`sexe-${value}`} value={value} />
                        {SEXE_LABELS[value]}
                      </Label>
                    )
                  })}
                </RadioGroup>
                {error ? (
                  <p
                    id="sexe-error"
                    role="alert"
                    className="text-sm text-destructive"
                  >
                    {error}
                  </p>
                ) : null}
              </fieldset>
            )
          }}
        </form.Field>
      </div>

      <PhotoUploadField
        previewUrl={photoPreviewUrl}
        status={photoStatus}
        error={photoError}
        onSelect={onPhotoSelect}
        onRemove={onPhotoRemove}
        onReject={onPhotoReject}
      />
    </div>
  )
}
