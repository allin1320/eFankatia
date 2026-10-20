import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  Loader2Icon,
  RefreshCwIcon,
  SearchIcon,
  UsersIcon,
  XIcon,
} from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Skeleton } from '#/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { PersonAvatar } from '#/components/personnes/person-avatar'
import { useDebouncedValue } from '#/hooks/use-debounced-value'
import { useAuth } from '#/lib/auth/auth-context'
import { formatPersonneName } from '#/lib/personnes/format'
import type { UserRole } from '#/lib/supabase/types'
import { ROLE_OPTIONS, formatDateTimeFr } from '#/lib/utilisateurs/format'
import { useAdminUtilisateurs } from '#/lib/utilisateurs/queries'
import { UTILISATEURS_PAGE_SIZE } from '#/lib/utilisateurs/types'
import type { AdminUtilisateur } from '#/lib/utilisateurs/types'
import { RoleBadge } from './role-badge'
import { UtilisateurCreateDialog } from './utilisateur-create-dialog'
import { UtilisateurEditDialog } from './utilisateur-edit-dialog'
import { UtilisateurPasswordDialog } from './utilisateur-password-dialog'

function initialFromEmail(email: string | null): string {
  const source = email?.trim()
  if (!source) return '?'
  return source.charAt(0).toLocaleUpperCase('fr')
}

/** Liste d'administration : recherche, filtre par rôle et pagination serveur. */
export function UtilisateursAdmin() {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query.trim(), 300)
  const [role, setRole] = useState<UserRole | null>(null)
  const [page, setPage] = useState(1)
  const [notice, setNotice] = useState<string | null>(null)

  const { data, isPending, isError, error, refetch, isFetching } =
    useAdminUtilisateurs(debouncedQuery, role, page)

  const utilisateurs = data ?? []
  const total = utilisateurs[0]?.total_count ?? 0
  const pageCount = Math.max(1, Math.ceil(total / UTILISATEURS_PAGE_SIZE))
  const hasFilters = Boolean(debouncedQuery || role)

  // Après un changement de rôle, le filtre courant peut devenir vide alors que
  // la page affichée n'existe plus (ex. dernier modérateur de la page 2).
  useEffect(() => {
    if (data && data.length === 0 && total === 0 && page > 1) {
      setPage(1)
    }
  }, [data, total, page])

  function resetFilters() {
    setQuery('')
    setRole(null)
    setPage(1)
    setNotice(null)
  }

  return (
    <div className="space-y-5">
      {notice ? (
        <Alert>
          <CheckCircle2Icon />
          <AlertTitle>Compte enregistré</AlertTitle>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      ) : null}

      <div className="island-shell rounded-2xl border border-[var(--line)] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <form
            role="search"
            className="relative flex-1"
            onSubmit={(event) => event.preventDefault()}
          >
            <label htmlFor="recherche-utilisateurs" className="sr-only">
              Rechercher un compte par email ou par personne assignée
            </label>
            <SearchIcon
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="recherche-utilisateurs"
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setPage(1)
                setNotice(null)
              }}
              placeholder="Email ou personne assignée…"
              autoComplete="off"
              className="h-10 pr-10 pl-9"
            />
            {query ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute top-1/2 right-1.5 -translate-y-1/2"
                onClick={() => {
                  setQuery('')
                  setPage(1)
                }}
              >
                <XIcon />
                <span className="sr-only">Effacer la recherche</span>
              </Button>
            ) : null}
          </form>

          <div className="sm:w-56">
            <label htmlFor="filtre-role" className="sr-only">
              Filtrer par rôle
            </label>
            <Select
              value={role ?? 'all'}
              onValueChange={(value) => {
                setRole(value === 'all' ? null : (value as UserRole))
                setPage(1)
                setNotice(null)
              }}
            >
              <SelectTrigger id="filtre-role" className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les rôles</SelectItem>
                {ROLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-10 shrink-0"
            aria-label="Rafraîchir la liste"
            onClick={() => void refetch()}
          >
            <RefreshCwIcon
              className={isFetching ? 'animate-spin' : undefined}
            />
          </Button>

          <UtilisateurCreateDialog onSuccess={setNotice} />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p
            role="status"
            aria-live="polite"
            aria-busy={isFetching}
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            {isFetching ? (
              <Loader2Icon
                className="size-3.5 animate-spin"
                aria-hidden="true"
              />
            ) : null}
            {isPending
              ? 'Chargement des comptes…'
              : `${total} compte${total > 1 ? 's' : ''}${
                  hasFilters ? ' correspondant aux filtres' : ''
                }`}
          </p>

          {hasFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetFilters}
            >
              <XIcon />
              Réinitialiser les filtres
            </Button>
          ) : null}
        </div>
      </div>

      {isError ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Impossible de charger les comptes</AlertTitle>
          <AlertDescription>
            <p>
              {error instanceof Error
                ? error.message
                : 'Une erreur inattendue est survenue.'}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => void refetch()}
            >
              <RefreshCwIcon />
              Réessayer
            </Button>
          </AlertDescription>
        </Alert>
      ) : isPending ? (
        <ListeSkeleton />
      ) : utilisateurs.length === 0 ? (
        <div className="island-shell rounded-2xl border border-[var(--line)] p-8 text-center">
          <UsersIcon className="mx-auto size-8 text-muted-foreground" />
          <h2 className="display-title mt-3 text-lg font-semibold text-[var(--sea-ink)]">
            {hasFilters
              ? 'Aucun compte ne correspond.'
              : 'Aucun compte utilisateur.'}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {hasFilters
              ? 'Essayez un autre email, un autre nom ou un autre rôle.'
              : 'Les comptes créés via Supabase Auth apparaîtront ici.'}
          </p>
          {hasFilters ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={resetFilters}
            >
              Réinitialiser les filtres
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="island-shell overflow-hidden rounded-2xl border border-[var(--line)]">
            <Table className="min-w-[820px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Compte</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Lignée assignée</TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Créé le
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Modifié le
                  </TableHead>
                  <TableHead className="pr-4 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {utilisateurs.map((utilisateur) => (
                  <UtilisateurRow
                    key={utilisateur.id}
                    utilisateur={utilisateur}
                    isSelf={utilisateur.id === user?.id}
                    onSuccess={setNotice}
                  />
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Page {page} sur {pageCount}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1 || isFetching}
                onClick={() => {
                  setPage((current) => Math.max(1, current - 1))
                  setNotice(null)
                }}
              >
                <ChevronLeftIcon />
                Précédent
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= pageCount || isFetching}
                onClick={() => {
                  setPage((current) => Math.min(pageCount, current + 1))
                  setNotice(null)
                }}
              >
                Suivant
                <ChevronRightIcon />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function UtilisateurRow({
  utilisateur,
  isSelf,
  onSuccess,
}: {
  utilisateur: AdminUtilisateur
  isSelf: boolean
  onSuccess: (message: string) => void
}) {
  const email = utilisateur.email ?? 'Email inconnu'
  const personneId = utilisateur.personne_id

  return (
    <TableRow>
      <TableCell className="pl-4">
        <div className="flex items-center gap-3">
          <Avatar className="size-9 shrink-0">
            <AvatarFallback>
              {initialFromEmail(utilisateur.email)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="max-w-[260px] truncate font-medium">
                {email}
              </span>
              {isSelf ? (
                <Badge variant="outline" className="font-normal">
                  Vous
                </Badge>
              ) : null}
            </div>
            <span className="text-xs text-muted-foreground">
              {isSelf ? 'Votre compte' : 'Compte utilisateur'}
            </span>
          </div>
        </div>
      </TableCell>

      <TableCell>
        <RoleBadge role={utilisateur.role} />
      </TableCell>

      <TableCell>
        {personneId ? (
          <Link
            to="/app/personnes/$personneId"
            params={{ personneId }}
            className="inline-flex items-center gap-2 rounded-md outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <PersonAvatar
              size="sm"
              nom={utilisateur.personne_nom}
              prenom={utilisateur.personne_prenom}
              appellation={utilisateur.personne_appellation}
              src={utilisateur.personne_url_img_thumb}
            />
            <span className="max-w-[220px] truncate">
              {formatPersonneName({
                nom: utilisateur.personne_nom,
                prenom: utilisateur.personne_prenom,
                appellation: utilisateur.personne_appellation,
              })}
            </span>
          </Link>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>

      <TableCell className="hidden lg:table-cell">
        <span className="text-muted-foreground">
          {formatDateTimeFr(utilisateur.created_at)}
        </span>
      </TableCell>

      <TableCell className="hidden lg:table-cell">
        <span className="text-muted-foreground">
          {formatDateTimeFr(utilisateur.updated_at)}
        </span>
      </TableCell>

      <TableCell className="pr-4 text-right">
        <div className="flex justify-end gap-2">
          <UtilisateurPasswordDialog
            utilisateur={utilisateur}
            onSuccess={onSuccess}
          />
          <UtilisateurEditDialog
            utilisateur={utilisateur}
            isSelf={isSelf}
            onSuccess={onSuccess}
          />
        </div>
      </TableCell>
    </TableRow>
  )
}

function ListeSkeleton() {
  return (
    <div
      className="island-shell space-y-2 rounded-2xl border border-[var(--line)] p-4"
      aria-hidden="true"
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton key={index} className="h-14 w-full rounded-xl" />
      ))}
    </div>
  )
}
