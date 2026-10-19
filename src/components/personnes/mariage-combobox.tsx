import { useEffect, useId, useState } from 'react'
import { CheckIcon, ChevronDownIcon, XIcon } from 'lucide-react'

import { Button } from '#/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '#/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover'
import { Skeleton } from '#/components/ui/skeleton'
import { FormField } from './form-field'
import { PersonAvatar } from './person-avatar'
import { useDebouncedValue } from '#/hooks/use-debounced-value'
import {
  formatDateFr,
  mariageFirstParentName,
  mariageSecondParentName,
} from '#/lib/personnes/format'
import { useMariagesCandidats } from '#/lib/personnes/queries'
import type { MariageCandidat } from '#/lib/personnes/types'

type MariageComboboxProps = {
  id: string
  label: string
  placeholder: string
  required?: boolean
  disabled?: boolean
  error?: string | null
  hint?: string
  selected: MariageCandidat | null
  onSelect: (mariage: MariageCandidat | null) => void
}

/** Sélecteur d'union (couple) avec recherche sur les deux conjoints. */
export function MariageCombobox({
  id,
  label,
  placeholder,
  required = false,
  disabled = false,
  error,
  hint,
  selected,
  onSelect,
}: MariageComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 250)
  const listId = useId()

  const { data, isFetching, isError } = useMariagesCandidats(
    debouncedQuery,
    open,
  )

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  const labelOf = (mariage: MariageCandidat) =>
    `${mariageFirstParentName(mariage)} & ${mariageSecondParentName(mariage)}`

  return (
    <FormField
      id={id}
      label={label}
      required={required}
      error={error}
      helper={hint}
    >
      {({ id: controlId, ...aria }) => (
        <div className="flex gap-2">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                id={controlId}
                type="button"
                variant="outline"
                role="combobox"
                disabled={disabled}
                aria-controls={listId}
                className="h-10 w-full justify-between font-normal"
                {...aria}
              >
                <span className="flex min-w-0 items-center gap-2">
                  {selected ? (
                    <>
                      <span className="flex -space-x-2">
                        <PersonAvatar
                          size="sm"
                          nom={selected.personne_1_nom}
                          prenom={selected.personne_1_prenom}
                          appellation={selected.personne_1_appellation}
                          src={selected.personne_1_url_img_thumb}
                        />
                        <PersonAvatar
                          size="sm"
                          nom={selected.personne_2_nom}
                          prenom={selected.personne_2_prenom}
                          appellation={selected.personne_2_appellation}
                          src={selected.personne_2_url_img_thumb}
                        />
                      </span>
                      <span className="truncate">{labelOf(selected)}</span>
                    </>
                  ) : (
                    <span className="truncate text-muted-foreground">
                      {placeholder}
                    </span>
                  )}
                </span>
                <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>

            <PopoverContent
              align="start"
              className="w-[var(--radix-popover-trigger-width)] p-0"
            >
              <Command id={listId} shouldFilter={false}>
                <CommandInput
                  value={query}
                  onValueChange={setQuery}
                  placeholder="Rechercher une union…"
                />
                <CommandList>
                  {isFetching && !data ? (
                    <div className="space-y-2 p-2">
                      <Skeleton className="h-9 w-full" />
                      <Skeleton className="h-9 w-full" />
                      <Skeleton className="h-9 w-full" />
                    </div>
                  ) : null}

                  {isError ? (
                    <CommandEmpty>
                      La recherche a échoué. Réessayez.
                    </CommandEmpty>
                  ) : null}

                  {!isFetching && !isError && (data?.length ?? 0) === 0 ? (
                    <CommandEmpty>Aucune union trouvée.</CommandEmpty>
                  ) : null}

                  <CommandGroup>
                    {data?.map((mariage) => (
                      <CommandItem
                        key={mariage.id}
                        value={mariage.id}
                        onSelect={() => {
                          onSelect(mariage)
                          setOpen(false)
                        }}
                      >
                        <span className="flex -space-x-2">
                          <PersonAvatar
                            size="sm"
                            nom={mariage.personne_1_nom}
                            prenom={mariage.personne_1_prenom}
                            appellation={mariage.personne_1_appellation}
                            src={mariage.personne_1_url_img_thumb}
                          />
                          <PersonAvatar
                            size="sm"
                            nom={mariage.personne_2_nom}
                            prenom={mariage.personne_2_prenom}
                            appellation={mariage.personne_2_appellation}
                            src={mariage.personne_2_url_img_thumb}
                          />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate font-medium">
                            {labelOf(mariage)}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {mariage.date_mariage
                              ? `Union du ${formatDateFr(mariage.date_mariage)}`
                              : "Date d'union inconnue"}
                          </span>
                        </span>
                        {mariage.id === selected?.id ? (
                          <CheckIcon className="ml-auto size-4" />
                        ) : null}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {selected ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-10 shrink-0"
              aria-label="Retirer la sélection"
              onClick={() => onSelect(null)}
            >
              <XIcon className="size-4" />
            </Button>
          ) : null}
        </div>
      )}
    </FormField>
  )
}
