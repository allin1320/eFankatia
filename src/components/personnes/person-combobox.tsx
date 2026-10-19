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
import { usePersonnesCandidats } from '#/lib/personnes/queries'
import { formatDateRange, formatPersonneName } from '#/lib/personnes/format'
import type { PersonneCandidat } from '#/lib/personnes/types'

type PersonComboboxProps = {
  id: string
  label: string
  placeholder: string
  required?: boolean
  disabled?: boolean
  error?: string | null
  hint?: string
  selected: PersonneCandidat | null
  onSelect: (personne: PersonneCandidat | null) => void
}

/** Sélecteur de personne avec recherche serveur (filtrage par lignée côté base). */
export function PersonCombobox({
  id,
  label,
  placeholder,
  required = false,
  disabled = false,
  error,
  hint,
  selected,
  onSelect,
}: PersonComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 250)
  const listId = useId()

  const { data, isFetching, isError } = usePersonnesCandidats(
    debouncedQuery,
    open,
  )

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

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
                      <PersonAvatar
                        size="sm"
                        nom={selected.nom}
                        prenom={selected.prenom}
                        appellation={selected.appellation}
                        src={selected.url_img_thumb}
                      />
                      <span className="truncate">
                        {formatPersonneName(selected)}
                      </span>
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
                  placeholder="Rechercher une personne…"
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
                    <CommandEmpty>Aucune personne trouvée.</CommandEmpty>
                  ) : null}

                  <CommandGroup>
                    {data?.map((personne) => (
                      <CommandItem
                        key={personne.id}
                        value={personne.id}
                        onSelect={() => {
                          onSelect(personne)
                          setOpen(false)
                        }}
                      >
                        <PersonAvatar
                          size="sm"
                          nom={personne.nom}
                          prenom={personne.prenom}
                          appellation={personne.appellation}
                          src={personne.url_img_thumb}
                        />
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate font-medium">
                            {formatPersonneName(personne)}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {formatDateRange(
                              personne.date_naissance,
                              personne.date_deces,
                            ) || 'Dates inconnues'}
                          </span>
                        </span>
                        {personne.id === selected?.id ? (
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
