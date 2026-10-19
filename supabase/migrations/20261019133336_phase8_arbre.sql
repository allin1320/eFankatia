-- Phase 8 — Arbre généalogique interactif.
--
-- RPC de lecture agrégée `get_arbre_personne` : renvoie la personne focalisée,
-- ses ascendants (jusqu'à N générations), ses descendants (jusqu'à N
-- générations) ainsi que leurs conjoints, avec les liens de parenté et d'union
-- nécessaires au rendu côté client.
--
-- Une personne n'est renvoyée qu'une seule fois : la génération est calculée
-- côté base (ascendants en négatif, descendants en positif, conjoints alignés),
-- ce qui évite toute duplication de nœud. Les unions ne sont conservées que si
-- les deux conjoints font partie du sous-arbre.

create or replace function public.get_arbre_personne(
  p_id uuid,
  p_ancetres int default 3,
  p_descendants int default 3
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_ancetres int := least(greatest(coalesce(p_ancetres, 3), 0), 6);
  v_descendants int := least(greatest(coalesce(p_descendants, 3), 0), 6);
  v_result jsonb;
begin
  if not exists (select 1 from public.personnes where id = p_id) then
    return null;
  end if;

  with recursive
  -- Ascendants : remontée parent par parent.
  ancetres as (
    select p_id as id, 0 as depth
    union
    select pe.parent_id, a.depth + 1
    from ancetres a
    join public.parent_enfants pe on pe.enfant_id = a.id
    where a.depth < v_ancetres
  ),
  -- Descendants : descente enfant par enfant.
  descendants as (
    select p_id as id, 0 as depth
    union
    select pe.enfant_id, d.depth + 1
    from descendants d
    join public.parent_enfants pe on pe.parent_id = d.id
    where d.depth < v_descendants
  ),
  -- Générations : ascendants en négatif, descendants en positif. En cas de
  -- doublon (personne atteinte par les deux chemins), la valeur la plus proche
  -- de la génération 0 est retenue.
  generations as (
    select id, min(generation) as generation
    from (
      select id, -min(depth) as generation from ancetres group by id
      union all
      select id, min(depth) as generation from descendants group by id
    ) raw
    group by id
  ),
  -- Conjoints de la personne focalisée et de ses descendants (donc de
  -- génération >= 0). Les conjoints des ascendants déjà parents sont inclus
  -- par les liens de parenté ; les beaux-parents sont volontairement exclus.
  conjoints as (
    select distinct
      case
        when m.personne_1_id = g.id then m.personne_2_id
        else m.personne_1_id
      end as id,
      g.generation
    from generations g
    join public.mariages m
      on g.id in (m.personne_1_id, m.personne_2_id)
    where g.generation >= 0
  ),
  -- Nœuds finaux : générations connues + conjoints rattachés à la génération
  -- de leur partenaire. Un nœud déjà présent n'est jamais dupliqué.
  noeuds as (
    select g.id, g.generation
    from generations g
    union
    select j.id, min(j.generation)
    from conjoints j
    where not exists (
      select 1 from generations g2 where g2.id = j.id
    )
    group by j.id
  ),
  personnes_json as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'nom', p.nom,
          'prenom', p.prenom,
          'appellation', p.appellation,
          'sexe', p.sexe,
          'date_naissance', p.date_naissance,
          'date_deces', p.date_deces,
          'url_img_thumb', p."urlImgThumb",
          'est_lignee_generale', p."estLigneeGenerale",
          'generation', n.generation
        )
        order by n.generation, p.nom, p.prenom
      ),
      '[]'::jsonb
    ) as data
    from noeuds n
    join public.personnes p on p.id = n.id
  ),
  mariages_json as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', m.id,
          'personne_1_id', m.personne_1_id,
          'personne_2_id', m.personne_2_id,
          'date_mariage', m.date_mariage,
          'date_fin', m.date_fin,
          'type_fin', m.type_fin
        )
        order by m.date_mariage nulls last, m.created_at
      ),
      '[]'::jsonb
    ) as data
    from public.mariages m
    where exists (select 1 from noeuds n where n.id = m.personne_1_id)
      and exists (select 1 from noeuds n where n.id = m.personne_2_id)
  ),
  parent_enfants_json as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'parent_id', pe.parent_id,
          'enfant_id', pe.enfant_id,
          'type_parent', pe.type_parent
        )
      ),
      '[]'::jsonb
    ) as data
    from public.parent_enfants pe
    where exists (select 1 from noeuds n where n.id = pe.parent_id)
      and exists (select 1 from noeuds n where n.id = pe.enfant_id)
  ),
  mariage_enfants_json as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'mariage_id', me.mariage_id,
          'enfant_id', me.enfant_id
        )
      ),
      '[]'::jsonb
    ) as data
    from public.mariage_enfants me
    where exists (select 1 from noeuds n where n.id = me.enfant_id)
      and exists (
        select 1
        from public.mariages m
        where m.id = me.mariage_id
          and exists (select 1 from noeuds n where n.id = m.personne_1_id)
          and exists (select 1 from noeuds n where n.id = m.personne_2_id)
      )
  )
  select jsonb_build_object(
    'focus_id', p_id,
    'personnes', (select data from personnes_json),
    'mariages', (select data from mariages_json),
    'parent_enfants', (select data from parent_enfants_json),
    'mariage_enfants', (select data from mariage_enfants_json)
  )
  into v_result;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Droits explicites (défense en profondeur)
-- ---------------------------------------------------------------------------

revoke execute on function public.get_arbre_personne(uuid, int, int)
  from public, anon;

grant execute on function public.get_arbre_personne(uuid, int, int)
  to authenticated, service_role;
