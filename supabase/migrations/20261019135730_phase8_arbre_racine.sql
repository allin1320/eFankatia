-- Phase 8 — Point d'entrée par défaut de l'arbre.
--
-- `get_personne_racine()` désigne la personne à afficher quand l'utilisateur
-- ouvre l'arbre sans avoir choisi de fiche (bouton « Explorer » du tableau de
-- bord). On privilégie un ancêtre sans parent (racine de l'arbre), rattaché à
-- la lignée générale et le plus ancien, puis on retombe sur la première
-- personne créée si la base ne contient aucune racine (données cycliques).

create or replace function public.get_personne_racine()
returns uuid
language sql
stable
security invoker
set search_path = public
as $$
  select t.id
  from (
    select
      p.id,
      0 as priority,
      p."estLigneeGenerale" as lignee,
      p.date_naissance,
      p.created_at
    from public.personnes p
    where not exists (
      select 1
      from public.parent_enfants pe
      where pe.enfant_id = p.id
    )
    union all
    select
      p.id,
      1 as priority,
      p."estLigneeGenerale" as lignee,
      p.date_naissance,
      p.created_at
    from public.personnes p
  ) t
  order by
    t.priority,
    t.lignee desc,
    t.date_naissance nulls last,
    t.created_at
  limit 1;
$$;

revoke execute on function public.get_personne_racine() from public, anon;

grant execute on function public.get_personne_racine()
  to authenticated, service_role;
