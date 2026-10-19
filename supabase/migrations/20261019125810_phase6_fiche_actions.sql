-- Phase 6 — Fiche personnelle, actions rapides, modification et suppression.
--
-- 1. Index de soutien pour la fiche (liaison union → enfant).
-- 2. RPC de lecture agrégée `get_personne_fiche` : personne + parents + unions +
--    enfants + permissions d'écriture, en une seule requête.
-- 3. RPC `delete_personne` : suppression transactionnelle des liens puis de la
--    personne. Les FK de parenté sont en RESTRICT, d'où le déliement explicite.

-- ---------------------------------------------------------------------------
-- Index de soutien
-- ---------------------------------------------------------------------------

create index if not exists mariage_enfants_enfant_id_idx
  on public.mariage_enfants (enfant_id);

-- ---------------------------------------------------------------------------
-- Fiche détaillée
--
-- `can_edit` / `can_delete` sont calculés côté base avec les mêmes helpers que
-- les policies RLS : l'UI ne fait que refléter la décision du serveur.
-- ---------------------------------------------------------------------------

create or replace function public.get_personne_fiche(p_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_personne public.personnes;
  v_can_manage boolean;
  v_is_lignee_reference boolean;
begin
  select * into v_personne
  from public.personnes
  where id = p_id;

  if not found then
    return null;
  end if;

  v_can_manage := public.is_admin()
    or (public.is_moderator() and public.is_in_lignee(p_id));

  select exists (
    select 1 from public.profiles where personne_id = p_id
  ) into v_is_lignee_reference;

  return jsonb_build_object(
    'personne', to_jsonb(v_personne),
    'parents', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', p.id,
            'nom', p.nom,
            'prenom', p.prenom,
            'appellation', p.appellation,
            'sexe', p.sexe,
            'date_naissance', p.date_naissance,
            'date_deces', p.date_deces,
            'url_img_thumb', p."urlImgThumb",
            'type_parent', pe.type_parent
          )
          order by p.nom, p.prenom
        )
        from public.parent_enfants pe
        join public.personnes p on p.id = pe.parent_id
        where pe.enfant_id = p_id
      ),
      '[]'::jsonb
    ),
    'unions', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', m.id,
            'date_mariage', m.date_mariage,
            'date_fin', m.date_fin,
            'type_fin', m.type_fin,
            'conjoint', jsonb_build_object(
              'id', c.id,
              'nom', c.nom,
              'prenom', c.prenom,
              'appellation', c.appellation,
              'sexe', c.sexe,
              'date_naissance', c.date_naissance,
              'date_deces', c.date_deces,
              'url_img_thumb', c."urlImgThumb"
            ),
            'enfants', coalesce(
              (
                select jsonb_agg(
                  jsonb_build_object(
                    'id', e.id,
                    'nom', e.nom,
                    'prenom', e.prenom,
                    'appellation', e.appellation,
                    'sexe', e.sexe,
                    'date_naissance', e.date_naissance,
                    'date_deces', e.date_deces,
                    'url_img_thumb', e."urlImgThumb"
                  )
                  order by e.date_naissance nulls last, e.nom, e.prenom
                )
                from public.mariage_enfants me
                join public.personnes e on e.id = me.enfant_id
                where me.mariage_id = m.id
              ),
              '[]'::jsonb
            )
          )
          order by m.date_mariage nulls last, m.created_at
        )
        from public.mariages m
        join public.personnes c
          on c.id = case
            when m.personne_1_id = p_id then m.personne_2_id
            else m.personne_1_id
          end
        where m.personne_1_id = p_id or m.personne_2_id = p_id
      ),
      '[]'::jsonb
    ),
    'enfants', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', e.id,
            'nom', e.nom,
            'prenom', e.prenom,
            'appellation', e.appellation,
            'sexe', e.sexe,
            'date_naissance', e.date_naissance,
            'date_deces', e.date_deces,
            'url_img_thumb', e."urlImgThumb",
            'type_parent', pe.type_parent,
            'mariage_id', (
              select me.mariage_id
              from public.mariage_enfants me
              join public.mariages m on m.id = me.mariage_id
              where me.enfant_id = e.id
                and (m.personne_1_id = p_id or m.personne_2_id = p_id)
              limit 1
            )
          )
          order by e.date_naissance nulls last, e.nom, e.prenom
        )
        from public.parent_enfants pe
        join public.personnes e on e.id = pe.enfant_id
        where pe.parent_id = p_id
      ),
      '[]'::jsonb
    ),
    'can_edit', v_can_manage,
    'can_delete',
      v_can_manage and (public.is_admin() or not v_is_lignee_reference)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Suppression d'une personne
--
-- Les liens de parenté et d'union sont en ON DELETE RESTRICT : on les retire
-- explicitement dans la même transaction, puis on supprime la personne.
-- Les autres personnes ne sont jamais supprimées.
-- ---------------------------------------------------------------------------

create or replace function public.delete_personne(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unions int := 0;
  v_liens_enfants int := 0;
  v_liens_parents int := 0;
begin
  if not exists (select 1 from public.personnes where id = p_id) then
    raise exception 'Personne introuvable : %', p_id
      using errcode = 'P0002';
  end if;

  if not public.is_admin()
     and not (public.is_moderator() and public.is_in_lignee(p_id)) then
    raise exception 'Accès refusé : cette personne ne fait pas partie de votre lignée'
      using errcode = '42501';
  end if;

  -- La suppression met `profiles.personne_id` à NULL (ON DELETE SET NULL) ; le
  -- trigger `profiles_guard_role` réserve ce changement à un administrateur.
  if not public.is_admin()
     and exists (select 1 from public.profiles where personne_id = p_id) then
    raise exception 'Cette personne sert de référence de lignée à un compte. Seul un administrateur peut la supprimer.'
      using errcode = '42501';
  end if;

  select count(*) into v_unions
  from public.mariages
  where personne_1_id = p_id or personne_2_id = p_id;

  select count(*) into v_liens_enfants
  from public.parent_enfants
  where parent_id = p_id;

  select count(*) into v_liens_parents
  from public.parent_enfants
  where enfant_id = p_id;

  -- Liens union → enfant de la personne (CASCADE, mais explicite pour l'ordre).
  delete from public.mariage_enfants where enfant_id = p_id;

  -- Liens parent/enfant dans les deux sens.
  delete from public.parent_enfants
  where parent_id = p_id or enfant_id = p_id;

  -- Unions de la personne : leurs mariage_enfants partent en CASCADE.
  delete from public.mariages
  where personne_1_id = p_id or personne_2_id = p_id;

  delete from public.personnes where id = p_id;

  return jsonb_build_object(
    'unions_supprimees', v_unions,
    'liens_enfants', v_liens_enfants,
    'liens_parents', v_liens_parents
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Droits explicites (défense en profondeur)
-- ---------------------------------------------------------------------------

revoke execute on function public.get_personne_fiche(uuid) from public, anon;
revoke execute on function public.delete_personne(uuid) from public, anon;

grant execute on function public.get_personne_fiche(uuid)
  to authenticated, service_role;
grant execute on function public.delete_personne(uuid)
  to authenticated, service_role;
