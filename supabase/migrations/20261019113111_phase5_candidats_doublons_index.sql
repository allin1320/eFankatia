-- Phase 5 — Création et saisie de personnes.
--
-- 1. Index de soutien pour les recherches de candidats et la récursion `is_in_lignee`.
-- 2. RPC de recherche de candidats (personnes / unions), filtrées par rôle et lignée.
-- 3. RPC de détection de doublon + trigger de défense en profondeur.
--
-- Règle métier : une personne ne doit jamais être dupliquée. Le doublon est
-- bloqué lorsque nom + prénom correspondent (insensible casse/accents) ET que
-- les dates de naissance sont égales ou qu'au moins l'une des deux est absente.
-- Renseigner une date de naissance différente permet donc de distinguer un
-- homonyme légitime.

-- Recherche insensible aux accents (noms malgaches, français, etc.).
create extension if not exists unaccent with schema extensions;

-- ---------------------------------------------------------------------------
-- Index de soutien
-- ---------------------------------------------------------------------------

create index if not exists mariages_personne_1_id_idx
  on public.mariages (personne_1_id);

create index if not exists mariages_personne_2_id_idx
  on public.mariages (personne_2_id);

create index if not exists parent_enfants_enfant_id_idx
  on public.parent_enfants (enfant_id);

-- ---------------------------------------------------------------------------
-- Recherche de personnes candidates (conjoint / parent)
--
-- Admin      : toutes les personnes.
-- Modérateur : uniquement les personnes de sa lignée (is_in_lignee).
-- Autres     : résultat vide (aucun accès au formulaire de création).
-- ---------------------------------------------------------------------------

create or replace function public.search_personnes_candidats(
  p_query text default '',
  p_limit int default 20
)
returns table (
  id uuid,
  nom text,
  prenom text,
  appellation text,
  sexe text,
  date_naissance date,
  date_deces date,
  url_img_thumb text,
  est_lignee_generale boolean
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with params as (
    select unaccent(lower(btrim(coalesce(p_query, '')))) as q
  )
  select
    p.id,
    p.nom,
    p.prenom,
    p.appellation,
    p.sexe,
    p.date_naissance,
    p.date_deces,
    p."urlImgThumb" as url_img_thumb,
    p."estLigneeGenerale" as est_lignee_generale
  from public.personnes p
  cross join params
  where (
      public.is_admin()
      or (public.is_moderator() and public.is_in_lignee(p.id))
    )
    and (
      params.q = ''
      or position(params.q in unaccent(lower(coalesce(p.nom, '')))) > 0
      or position(params.q in unaccent(lower(coalesce(p.prenom, '')))) > 0
      or position(params.q in unaccent(lower(coalesce(p.appellation, '')))) > 0
    )
  order by
    unaccent(lower(coalesce(p.nom, ''))),
    unaccent(lower(coalesce(p.prenom, ''))),
    p.date_naissance nulls last
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

-- ---------------------------------------------------------------------------
-- Recherche d'unions candidates (naissance par mariage)
--
-- La garde reproduit exactement celle de
-- `create_personne_par_naissance_mariage` : admin partout, modérateur si au
-- moins un des deux conjoints appartient à sa lignée.
-- ---------------------------------------------------------------------------

create or replace function public.search_mariages_candidats(
  p_query text default '',
  p_limit int default 20
)
returns table (
  id uuid,
  date_mariage date,
  date_fin date,
  type_fin text,
  personne_1_id uuid,
  personne_1_nom text,
  personne_1_prenom text,
  personne_1_appellation text,
  personne_1_sexe text,
  personne_1_url_img_thumb text,
  personne_2_id uuid,
  personne_2_nom text,
  personne_2_prenom text,
  personne_2_appellation text,
  personne_2_sexe text,
  personne_2_url_img_thumb text
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with params as (
    select unaccent(lower(btrim(coalesce(p_query, '')))) as q
  )
  select
    m.id,
    m.date_mariage,
    m.date_fin,
    m.type_fin,
    p1.id as personne_1_id,
    p1.nom as personne_1_nom,
    p1.prenom as personne_1_prenom,
    p1.appellation as personne_1_appellation,
    p1.sexe as personne_1_sexe,
    p1."urlImgThumb" as personne_1_url_img_thumb,
    p2.id as personne_2_id,
    p2.nom as personne_2_nom,
    p2.prenom as personne_2_prenom,
    p2.appellation as personne_2_appellation,
    p2.sexe as personne_2_sexe,
    p2."urlImgThumb" as personne_2_url_img_thumb
  from public.mariages m
  join public.personnes p1 on p1.id = m.personne_1_id
  join public.personnes p2 on p2.id = m.personne_2_id
  cross join params
  where (
      public.is_admin()
      or (
        public.is_moderator()
        and (
          public.is_in_lignee(m.personne_1_id)
          or public.is_in_lignee(m.personne_2_id)
        )
      )
    )
    and (
      params.q = ''
      or position(
        params.q in unaccent(lower(
          coalesce(p1.nom, '') || ' ' ||
          coalesce(p1.prenom, '') || ' ' ||
          coalesce(p1.appellation, '')
        ))
      ) > 0
      or position(
        params.q in unaccent(lower(
          coalesce(p2.nom, '') || ' ' ||
          coalesce(p2.prenom, '') || ' ' ||
          coalesce(p2.appellation, '')
        ))
      ) > 0
    )
  order by m.date_mariage desc nulls last, p1.nom, p1.prenom
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

-- ---------------------------------------------------------------------------
-- Détection de doublon (appelée par l'UI avant le submit)
-- ---------------------------------------------------------------------------

create or replace function public.check_personne_doublon(
  p_nom text,
  p_prenom text,
  p_date_naissance date default null
)
returns table (
  id uuid,
  nom text,
  prenom text,
  appellation text,
  date_naissance date,
  url_img_thumb text
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    p.id,
    p.nom,
    p.prenom,
    p.appellation,
    p.date_naissance,
    p."urlImgThumb"
  from public.personnes p
  where btrim(coalesce($1, '')) <> ''
    and btrim(coalesce($2, '')) <> ''
    and unaccent(lower(btrim(coalesce(p.nom, '')))) = unaccent(lower(btrim($1)))
    and unaccent(lower(btrim(coalesce(p.prenom, '')))) = unaccent(lower(btrim($2)))
    and (
      $3 is null
      or p.date_naissance is null
      or p.date_naissance = $3
    )
  order by p.date_naissance nulls last, p.created_at
  limit 5;
$$;

-- ---------------------------------------------------------------------------
-- Garde-fou en base : bloque toute création / modification qui produirait un
-- doublon, y compris via un appel RPC direct (défense en profondeur).
-- ---------------------------------------------------------------------------

create or replace function public.guard_personne_doublon()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  -- Les fiches sans nom ou sans prénom ne peuvent pas être comparées.
  if btrim(coalesce(new.nom, '')) = ''
     or btrim(coalesce(new.prenom, '')) = '' then
    return new;
  end if;

  if exists (
    select 1
    from public.personnes p
    where p.id <> new.id
      and unaccent(lower(btrim(coalesce(p.nom, '')))) =
          unaccent(lower(btrim(new.nom)))
      and unaccent(lower(btrim(coalesce(p.prenom, '')))) =
          unaccent(lower(btrim(new.prenom)))
      and (
        new.date_naissance is null
        or p.date_naissance is null
        or p.date_naissance = new.date_naissance
      )
  ) then
    raise exception
      'Une personne avec ce nom et ce prénom existe déjà (ou la date de naissance ne permet pas de la distinguer).'
      using errcode = '23505',
            hint = 'Renseignez une date de naissance différente s''il s''agit d''une autre personne.';
  end if;

  return new;
end;
$$;

drop trigger if exists personnes_guard_doublon on public.personnes;

create trigger personnes_guard_doublon
  before insert or update of nom, prenom, date_naissance
  on public.personnes
  for each row execute function public.guard_personne_doublon();

-- ---------------------------------------------------------------------------
-- Droits explicites (défense en profondeur)
-- ---------------------------------------------------------------------------

revoke execute on function public.search_personnes_candidats(text, int)
  from public, anon;
revoke execute on function public.search_mariages_candidats(text, int)
  from public, anon;
revoke execute on function public.check_personne_doublon(text, text, date)
  from public, anon;
revoke execute on function public.guard_personne_doublon()
  from public, anon, authenticated;

grant execute on function public.search_personnes_candidats(text, int)
  to authenticated, service_role;
grant execute on function public.search_mariages_candidats(text, int)
  to authenticated, service_role;
grant execute on function public.check_personne_doublon(text, text, date)
  to authenticated, service_role;
