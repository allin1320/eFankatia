-- Helpers d'autorisation (RBAC) et gestion des rôles.
-- Toutes ces fonctions sont en SECURITY DEFINER + search_path figé : elles lisent
-- `profiles` en contournant la RLS, ce qui évite toute récursion de politique.

-- Rôle applicatif de l'utilisateur connecté (null si non authentifié / sans profil).
create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role(), 'ROLE_USER') = 'ROLE_ADMIN';
$$;

create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role(), 'ROLE_USER') = 'ROLE_MODERATEUR';
$$;

-- Lignée assignée au modérateur connecté (personne_id), null pour les autres rôles.
create or replace function public.current_personne_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select personne_id from public.profiles where id = auth.uid();
$$;

-- Vrai si la requête courante provient du service_role (clé service / backend admin).
create or replace function public.is_service_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.role(), '') = 'service_role';
$$;

-- Attribution d'un rôle (et, pour un modérateur, de sa lignée assignée).
-- Réservée aux administrateurs (ou au service_role pour un backend admin).
create or replace function public.set_user_role(
  p_email text,
  p_role public.user_role,
  p_personne_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  if not public.is_admin() and not public.is_service_role() then
    raise exception 'Accès refusé : rôle administrateur requis'
      using errcode = '42501';
  end if;

  select id into v_user_id
  from auth.users
  where lower(email) = lower(trim(p_email));

  if v_user_id is null then
    raise exception 'Aucun utilisateur avec cet email : %', p_email;
  end if;

  if p_role = 'ROLE_MODERATEUR' and p_personne_id is null then
    raise exception 'Un ROLE_MODERATEUR doit être rattaché à une personne (personne_id)';
  end if;

  update public.profiles
  set role = p_role,
      personne_id = case
        when p_role = 'ROLE_MODERATEUR' then p_personne_id
        else null
      end
  where id = v_user_id;
end;
$$;

-- Garde-fou : empêche un non-admin de modifier son propre rôle ou sa lignée assignée
-- via une requête directe (PostgREST). Les requêtes hors contexte JWT (SQL direct /
-- seed, exécutées par un opérateur de confiance) ne sont pas bloquées.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role is distinct from old.role
      or new.personne_id is distinct from old.personne_id)
     and not public.is_admin()
     and not public.is_service_role()
     and current_setting('request.jwt.claims', true) is not null then
    raise exception 'Seul un administrateur peut modifier un rôle ou une lignée assignée'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();
