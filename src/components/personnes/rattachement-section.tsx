import { useStore } from '@tanstack/react-form'
import { InfoIcon } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Label } from '#/components/ui/label'
import { RadioGroup, RadioGroupItem } from '#/components/ui/radio-group'
import { cn } from 'cn'
import { MariageCombobox } from './mariage-combobox'
import { ModeRattachementCards } from './mode-rattachement-cards'
import { PersonCombobox } from './person-combobox'
import { FormField } from './form-field'
import { Input } from '#/components/ui/input'
import type { PersonneFormApi } from '#/lib/personnes/form-api'
import type {
  MariageCandidat,
  PersonneCandidat,
  RattachementMode,
} from '#/lib/personnes/types'
import { firstValidationMessage } from '#/lib/forms/validation'

type RattachementSectionProps = {
  form: PersonneFormApi
  isAdmin: boolean
  ligneeHint?: string
  selectedConjoint: PersonneCandidat | null
  onConjointSelect: (personne: PersonneCandidat | null) => void
  selectedMariage: MariageCandidat | null
  onMariageSelect: (mariage: MariageCandidat | null) => void
  selectedParent: PersonneCandidat | null
  onParentSelect: (personne: PersonneCandidat | null) => void
}

export function RattachementSection({
  form,
  isAdmin,
  ligneeHint,
  selectedConjoint,
  onConjointSelect,
  selectedMariage,
  onMariageSelect,
  selectedParent,
  onParentSelect,
}: RattachementSectionProps) {
  const mode = useStore(form.store, (state) => state.values.mode)

  const setSubMode = (value: RattachementMode) => {
    form.setFieldValue('mode', value)
    form.setFieldValue('mariage_id', '')
    form.setFieldValue('parent_id', '')
    onMariageSelect(null)
    onParentSelect(null)
  }

  return (
    <div className="space-y-5">
      <form.Field name="mode">
        {(field) => (
          <ModeRattachementCards
            value={field.state.value}
            onChange={(value) => {
              if (value !== field.state.value) {
                onConjointSelect(null)
                onMariageSelect(null)
                onParentSelect(null)
                form.setFieldValue('conjoint_id', '')
                form.setFieldValue('mariage_id', '')
                form.setFieldValue('parent_id', '')
                form.setFieldValue('date_mariage', '')
              }
              field.handleChange(value)
            }}
            isAdmin={isAdmin}
            hint={ligneeHint}
            error={firstValidationMessage(field.state.meta.errors)}
          />
        )}
      </form.Field>

      {mode === 'alliance' ? (
        <div className="space-y-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <form.Field name="conjoint_id">
            {(field) => (
              <PersonCombobox
                id="conjoint_id"
                label="Conjoint(e)"
                placeholder="Rechercher le conjoint ou la conjointe…"
                required
                error={firstValidationMessage(field.state.meta.errors)}
                hint="Une nouvelle union sera créée avec cette personne."
                selected={selectedConjoint}
                onSelect={(personne) => {
                  onConjointSelect(personne)
                  field.handleChange(personne?.id ?? '')
                }}
              />
            )}
          </form.Field>

          <form.Field name="date_mariage">
            {(field) => (
              <FormField
                id="date_mariage"
                label="Date de l’union"
                helper="Laissez vide si la date est inconnue."
                error={firstValidationMessage(field.state.meta.errors)}
              >
                {(control) => (
                  <Input
                    {...control}
                    name="date_mariage"
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
        </div>
      ) : null}

      {mode === 'naissance_mariage' || mode === 'naissance_parent' ? (
        <div className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">
              Comment rattacher la naissance ?
            </legend>
            <RadioGroup
              value={mode}
              onValueChange={(value) => setSubMode(value as RattachementMode)}
              className="grid gap-3 sm:grid-cols-2"
            >
              {[
                {
                  value: 'naissance_mariage' as const,
                  title: 'Par mariage',
                  description: 'Les deux parents sont déduits de l’union.',
                },
                {
                  value: 'naissance_parent' as const,
                  title: 'Sans mariage',
                  description: 'Un seul parent est connu ou renseigné.',
                },
              ].map((option) => {
                const selected = mode === option.value
                return (
                  <Label
                    key={option.value}
                    htmlFor={`sub-mode-${option.value}`}
                    className={cn(
                      'flex cursor-pointer flex-col items-start gap-1 rounded-xl border p-4 font-normal transition-colors has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-[var(--lagoon)]/40',
                      selected
                        ? 'border-[var(--lagoon-deep)] bg-[var(--foam)] dark:bg-[var(--sand)]'
                        : 'border-[var(--line)] bg-[var(--surface)]',
                    )}
                  >
                    <span className="flex items-center gap-2 font-medium text-[var(--sea-ink)]">
                      <RadioGroupItem
                        id={`sub-mode-${option.value}`}
                        value={option.value}
                      />
                      {option.title}
                    </span>
                    <span className="pl-6 text-sm text-muted-foreground">
                      {option.description}
                    </span>
                  </Label>
                )
              })}
            </RadioGroup>
          </fieldset>

          {mode === 'naissance_mariage' ? (
            <form.Field name="mariage_id">
              {(field) => (
                <MariageCombobox
                  id="mariage_id"
                  label="Union d’origine"
                  placeholder="Rechercher une union…"
                  required
                  error={firstValidationMessage(field.state.meta.errors)}
                  hint="Les deux parents seront remplis automatiquement."
                  selected={selectedMariage}
                  onSelect={(mariage) => {
                    onMariageSelect(mariage)
                    field.handleChange(mariage?.id ?? '')
                  }}
                />
              )}
            </form.Field>
          ) : null}

          {mode === 'naissance_parent' ? (
            <form.Field name="parent_id">
              {(field) => (
                <PersonCombobox
                  id="parent_id"
                  label="Parent"
                  placeholder="Rechercher le parent…"
                  required
                  error={firstValidationMessage(field.state.meta.errors)}
                  hint="Le rôle (père / mère) est déduit du sexe du parent."
                  selected={selectedParent}
                  onSelect={(personne) => {
                    onParentSelect(personne)
                    field.handleChange(personne?.id ?? '')
                  }}
                />
              )}
            </form.Field>
          ) : null}
        </div>
      ) : null}

      {mode === 'racine' ? (
        <Alert>
          <InfoIcon />
          <AlertTitle>Ancêtre racine</AlertTitle>
          <AlertDescription>
            La personne sera créée sans aucun rattachement : elle pourra servir
            de point de départ à l’arbre généalogique.
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}
