-- Phase 9 — Gestion des utilisateurs (ROLE_ADMIN uniquement).
--
-- 1. RPC de lecture `admin_list_profiles` (SECURITY DEFINER + garde is_admin).
-- 2. RPC de mutation `admin_update_profile_role` (rôle + lignée) avec gardes :
--    - impossible de se rétrograder soi-même ;
--    - impossible de retirer le dernier administrateur ;
--    - une lignée n'est conservée que pour un ROLE_MODERATEUR.
-- 3. Journalisation de chaque changement de rôle / lignée dans `audit_logs`.
-- 4. Verrouillage de `profiles` : plus aucune écriture directe, tout passe par
--    les RPC `admin_*`.

-- ---------------------------------------------------------------------------
-- Lecture : liste des comptes (profil + email auth + personne assignée)
-- ---------------------------------------------------------------------------

create or replace function public.admin_list_profiles(
  p_query text default '',
  p_role public.user_role default null,
  p_limit int default 20,
  p_offset int default 0
)
returns table (
  id uuid,
  email text,
  role public.user_role,
  personne_id uuid,
  personne_nom text,
  personne_prenom text,
  personne_appellation text,
  personne_url_img_thumb text,
  created_at timestamptz,
  updated_at timestamptz,
  total_count bigint,
  admin_count bigint
)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : rôle administrateur requis'
      using errcode = '42501';
  end if;

  return query
  with params as (
    select
      public.immutable_unaccent(lower(btrim(coalesce(p_query, '')))) as q,
      least(greatest(coalesce(p_limit, 20), 1), 100) as lim,
      greatest(coalesce(p_offset, 0), 0) as off
  ),
  base as (
    select
      pr.id,
      coalesce(u.email, pr.email)::text as email,
      pr.role,
      pr.personne_id,
      p.nom as personne_nom,
      p.prenom as personne_prenom,
      p.appellation as personne_appellation,
      p."urlImgThumb" as personne_url_img_thumb,
      pr.created_at,
      pr.updated_at,
      public.immutable_unaccent(lower(
        coalesce(u.email, '') || ' ' ||
        coalesce(pr.email, '') || ' ' ||
        coalesce(p.nom, '') || ' ' ||
        coalesce(p.prenom, '') || ' ' ||
        coalesce(p.appellation, '')
      )) as haystack,
      params.q
    from public.profiles pr
    left join auth.users u on u.id = pr.id
    left join public.personnes p on p.id = pr.personne_id
    cross join params
  ),
  filtered as (
    select b.*
    from base b
    where (p_role is null or b.role = p_role)
      and (
        b.q = ''
        or not exists (
          select 1
          from unnest(regexp_split_to_array(b.q, '\s+')) as token
          where token <> ''
            and b.haystack not like '%' || token || '%'
        )
      )
  ),
  counted as (
    select f.*, count(*) over () as total_count
    from filtered f
  )
  select
    c.id,
    c.email,
    c.role,
    c.personne_id,
    c.personne_nom,
    c.personne_prenom,
    c.personne_appellation,
    c.personne_url_img_thumb,
    c.created_at,
    c.updated_at,
    c.total_count,
    (select count(*) from public.profiles adm where adm.role = 'ROLE_ADMIN')
      as admin_count
  from counted c
  order by
    case c.role
      when 'ROLE_ADMIN' then 0
      when 'ROLE_MODERATEUR' then 1
      else 2
    end,
    public.immutable_unaccent(lower(coalesce(c.email, ''))),
    c.created_at
  limit (select lim from params)
  offset (select off from params);
end;
$$;

-- ---------------------------------------------------------------------------
-- Mutation : rôle + lignée assignée
-- ---------------------------------------------------------------------------

create or replace function public.admin_update_profile_role(
  p_user_id uuid,
  p_role public.user_role,
  p_personne_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current public.profiles%rowtype;
  v_admin_count int;
begin
  if not public.is_admin() then
    raise exception 'Accès refusé : rôle administrateur requis'
      using errcode = '42501';
  end if;

  if p_role is null then
    raise exception 'Le rôle est obligatoire'
      using errcode = '22023';
  end if;

  -- Sérialise les changements de rôle : deux rétrogradations concurrentes ne
  -- peuvent pas retirer simultanément les deux derniers administrateurs.
  perform pg_advisory_xact_lock(hashtext('efankatia.admin_update_profile_role'));

  -- Verrou pessimiste sur le profil ciblé.
  select *
    into v_current
    from public.profiles
   where id = p_user_id
     for update;

  if not found then
    raise exception 'Profil introuvable : %', p_user_id
      using errcode = 'P0002';
  end if;

  if p_user_id = auth.uid() and p_role <> 'ROLE_ADMIN' then
    raise exception 'Vous ne pouvez pas retirer votre propre rôle administrateur'
      using errcode = '42501';
  end if;

  if v_current.role = 'ROLE_ADMIN' and p_role <> 'ROLE_ADMIN' then
    select count(*)
      into v_admin_count
      from public.profiles
     where public.profiles.role = 'ROLE_ADMIN';

    if v_admin_count <= 1 then
      raise exception 'Impossible de retirer le dernier administrateur'
        using errcode = '42501';
    end if;
  end if;

  if p_role = 'ROLE_MODERATEUR' then
    if p_personne_id is null then
      raise exception 'Un ROLE_MODERATEUR doit être rattaché à une personne'
        using errcode = '22023';
    end if;

    if not exists (select 1 from public.personnes where id = p_personne_id) then
      raise exception 'La personne assignée à la lignée est introuvable'
        using errcode = 'P0002';
    end if;
  end if;

  update public.profiles
     set role = p_role,
         personne_id = case
           when p_role = 'ROLE_MODERATEUR' then p_personne_id
           else null
         end
   where id = p_user_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Journalisation des changements de rôle / lignée
-- ---------------------------------------------------------------------------

create or replace function public.log_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     or new.personne_id is distinct from old.personne_id then
    insert into public.audit_logs (
      table_name,
      record_id,
      action,
      old_data,
      new_data,
      user_id
    )
    values (
      'profiles',
      new.id,
      'role_update',
      jsonb_build_object(
        'role', old.role,
        'personne_id', old.personne_id,
        'email', old.email
      ),
      jsonb_build_object(
        'role', new.role,
        'personne_id', new.personne_id,
        'email', new.email
      ),
      auth.uid()
    );
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_audit_role_change on public.profiles;
create trigger profiles_audit_role_change
  after update on public.profiles
  for each row execute function public.log_profile_role_change();

-- ---------------------------------------------------------------------------
-- Verrouillage de profiles : aucune écriture directe
-- ---------------------------------------------------------------------------

-- Les rôles et lignées ne sont modifiables que via `admin_update_profile_role`
-- (SECURITY DEFINER). Les triggers d'audit et de garde restent en place.
drop policy if exists "profiles_update" on public.profiles;

-- Verrouillage complet : seul SELECT reste accordé aux utilisateurs
-- authentifiés (les privilèges par défaut de Supabase incluent TRUNCATE,
-- REFERENCES, TRIGGER…).
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;

-- `set_user_role` contournait les gardes de la P9 (dernier admin, audit).
drop function if exists public.set_user_role(text, public.user_role, uuid);

-- ---------------------------------------------------------------------------
-- Droits explicites
-- ---------------------------------------------------------------------------

revoke execute on function public.admin_list_profiles(text, public.user_role, int, int)
  from public, anon;
revoke execute on function public.admin_update_profile_role(uuid, public.user_role, uuid)
  from public, anon;
revoke execute on function public.log_profile_role_change()
  from public, anon, authenticated;

grant execute on function public.admin_list_profiles(text, public.user_role, int, int)
  to authenticated, service_role;
grant execute on function public.admin_update_profile_role(uuid, public.user_role, uuid)
  to authenticated, service_role;
