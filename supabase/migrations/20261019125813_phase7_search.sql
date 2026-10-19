-- Phase 7 — Recherche et consultation.
--
-- 1. `pg_trgm` + index trigram sur une expression normalisée (sans accents).
-- 2. RPC `search_personnes` : recherche multi-termes, classement, pagination et
--    total. Requête vide = membres récents.

create extension if not exists pg_trgm with schema extensions;

-- `unaccent` est STABLE (dépend du dictionnaire) ; ce wrapper IMMUTABLE permet
-- de l'utiliser dans un index. Le dictionnaire `unaccent` est figé par migration.
create or replace function public.immutable_unaccent(p_value text)
returns text
language sql
immutable
parallel safe
strict
set search_path = public, extensions
as $$
  select extensions.unaccent(p_value);
$$;

-- Expression indexée : doit rester strictement identique à celle utilisée par
-- la RPC (nom, prénom, appellation, profession).
create index if not exists personnes_search_trgm_idx
  on public.personnes
  using gin (
    public.immutable_unaccent(lower(
      coalesce(nom, '') || ' ' ||
      coalesce(prenom, '') || ' ' ||
      coalesce(appellation, '') || ' ' ||
      coalesce(profession, '')
    )) extensions.gin_trgm_ops
  );

create or replace function public.search_personnes(
  p_query text default '',
  p_limit int default 30,
  p_offset int default 0
)
returns table (
  id uuid,
  nom text,
  prenom text,
  appellation text,
  sexe text,
  profession text,
  date_naissance date,
  date_deces date,
  ville text,
  pays text,
  url_img_thumb text,
  est_lignee_generale boolean,
  total_count bigint
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with params as (
    select
      public.immutable_unaccent(lower(btrim(coalesce(p_query, '')))) as q,
      least(greatest(coalesce(p_limit, 30), 1), 50) as lim,
      greatest(coalesce(p_offset, 0), 0) as off
  ),
  base as (
    select
      p.id,
      p.nom,
      p.prenom,
      p.appellation,
      p.sexe,
      p.profession,
      p.date_naissance,
      p.date_deces,
      p.ville,
      p.pays,
      p."urlImgThumb" as url_img_thumb,
      p."estLigneeGenerale" as est_lignee_generale,
      p.created_at,
      params.q,
      public.immutable_unaccent(lower(
        coalesce(p.nom, '') || ' ' ||
        coalesce(p.prenom, '') || ' ' ||
        coalesce(p.appellation, '') || ' ' ||
        coalesce(p.profession, '')
      )) as haystack
    from public.personnes p
    cross join params
  ),
  filtered as (
    select b.*
    from base b
    where b.q = ''
       or not exists (
         select 1
         from unnest(regexp_split_to_array(b.q, '\s+')) as token
         where token <> ''
           and b.haystack not like '%' || token || '%'
       )
  ),
  counted as (
    select f.*, count(*) over () as total_count
    from filtered f
  )
  select
    c.id,
    c.nom,
    c.prenom,
    c.appellation,
    c.sexe,
    c.profession,
    c.date_naissance,
    c.date_deces,
    c.ville,
    c.pays,
    c.url_img_thumb,
    c.est_lignee_generale,
    c.total_count
  from counted c
  cross join params
  order by
    case
      when params.q = '' then 0
      when public.immutable_unaccent(lower(coalesce(c.appellation, ''))) = params.q
        then 0
      when public.immutable_unaccent(lower(
        coalesce(c.prenom, '') || ' ' || coalesce(c.nom, '')
      )) = params.q then 1
      when public.immutable_unaccent(lower(coalesce(c.appellation, '')))
        like params.q || '%' then 2
      when public.immutable_unaccent(lower(coalesce(c.nom, '')))
        like params.q || '%' then 3
      when public.immutable_unaccent(lower(coalesce(c.prenom, '')))
        like params.q || '%' then 3
      else 4
    end,
    case when params.q = '' then c.created_at end desc nulls last,
    c.nom,
    c.prenom,
    c.date_naissance nulls last
  limit (select lim from params)
  offset (select off from params);
$$;

revoke execute on function public.search_personnes(text, int, int)
  from public, anon;

grant execute on function public.search_personnes(text, int, int)
  to authenticated, service_role;
