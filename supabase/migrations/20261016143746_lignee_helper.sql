-- Détermine si une personne appartient à la lignée du modérateur connecté.
-- Définition retenue : la personne assignée (profiles.personne_id) + ses descendants
-- (récursif via parent_enfants) + les conjoints de chacun de ces membres (via mariages).
-- `UNION` (dédup) partout pour terminer même en présence de cycles.

create or replace function public.is_in_lignee(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with recursive descendants as (
    -- ancre : la personne assignée au modérateur
    select p.id
    from public.personnes p
    where p.id = public.current_personne_id()

    union

    -- récursif : les descendants directs
    select pe.enfant_id
    from public.parent_enfants pe
    join descendants d on d.id = pe.parent_id
  ),
  lignee as (
    -- membres de la lignée : assigné + descendants
    select id from descendants

    union

    -- conjoints de chaque membre (dont le conjoint de la personne assignée)
    select m.personne_1_id
    from public.mariages m
    join descendants d on d.id = m.personne_2_id

    union

    select m.personne_2_id
    from public.mariages m
    join descendants d on d.id = m.personne_1_id
  )
  select exists (select 1 from lignee where id = target);
$$;
