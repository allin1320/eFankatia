import { useStore } from '@tanstack/react-form'

import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Switch } from '#/components/ui/switch'
import { FormField } from './form-field'
import type { PersonneFormApi } from '#/lib/personnes/form-api'
import { firstValidationMessage } from '#/lib/forms/validation'

export function OriginesSection({ form }: { form: PersonneFormApi }) {
  const decede = useStore(form.store, (state) => state.values.decede)

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <form.Field name="date_naissance">
          {(field) => (
            <FormField
              id="date_naissance"
              label="Date de naissance"
              helper="Laissez vide si la date est inconnue."
              error={firstValidationMessage(field.state.meta.errors)}
            >
              {(control) => (
                <Input
                  {...control}
                  name="date_naissance"
                  type="date"
                  min="1500-01-01"
                  max={new Date().toISOString().slice(0, 10)}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              )}
            </FormField>
          )}
        </form.Field>

        <form.Field name="date_deces">
          {(field) => (
            <FormField
              id="date_deces"
              label="Date de décès"
              helper={
                decede
                  ? undefined
                  : 'Activez « Personne décédée » pour renseigner cette date.'
              }
              error={firstValidationMessage(field.state.meta.errors)}
            >
              {(control) => (
                <Input
                  {...control}
                  name="date_deces"
                  type="date"
                  min="1500-01-01"
                  max={new Date().toISOString().slice(0, 10)}
                  disabled={!decede}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              )}
            </FormField>
          )}
        </form.Field>
      </div>

      <form.Field name="decede">
        {(field) => (
          <div className="flex items-center gap-3">
            <Switch
              id="decede"
              checked={field.state.value}
              onCheckedChange={(checked) => {
                field.handleChange(checked)
                if (!checked) form.setFieldValue('date_deces', '')
              }}
            />
            <Label htmlFor="decede" className="font-normal">
              Personne décédée
            </Label>
          </div>
        )}
      </form.Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <form.Field name="profession">
          {(field) => (
            <FormField
              id="profession"
              label="Profession"
              error={firstValidationMessage(field.state.meta.errors)}
            >
              {(control) => (
                <Input
                  {...control}
                  name="profession"
                  autoComplete="organization-title"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              )}
            </FormField>
          )}
        </form.Field>

        <form.Field name="numero">
          {(field) => (
            <FormField
              id="numero"
              label="Téléphone"
              error={firstValidationMessage(field.state.meta.errors)}
            >
              {(control) => (
                <Input
                  {...control}
                  name="numero"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+261 34 12 345 67"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              )}
            </FormField>
          )}
        </form.Field>

        <form.Field name="nom_facebook">
          {(field) => (
            <FormField
              id="nom_facebook"
              label="Nom Facebook"
              error={firstValidationMessage(field.state.meta.errors)}
            >
              {(control) => (
                <Input
                  {...control}
                  name="nom_facebook"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              )}
            </FormField>
          )}
        </form.Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <form.Field name="pays">
          {(field) => (
            <FormField
              id="pays"
              label="Pays"
              error={firstValidationMessage(field.state.meta.errors)}
            >
              {(control) => (
                <Input
                  {...control}
                  name="pays"
                  autoComplete="country-name"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              )}
            </FormField>
          )}
        </form.Field>

        <form.Field name="ville">
          {(field) => (
            <FormField
              id="ville"
              label="Ville"
              error={firstValidationMessage(field.state.meta.errors)}
            >
              {(control) => (
                <Input
                  {...control}
                  name="ville"
                  autoComplete="address-level2"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              )}
            </FormField>
          )}
        </form.Field>

        <form.Field name="quartier">
          {(field) => (
            <FormField
              id="quartier"
              label="Quartier"
              error={firstValidationMessage(field.state.meta.errors)}
            >
              {(control) => (
                <Input
                  {...control}
                  name="quartier"
                  autoComplete="address-level3"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              )}
            </FormField>
          )}
        </form.Field>
      </div>
    </div>
  )
}
