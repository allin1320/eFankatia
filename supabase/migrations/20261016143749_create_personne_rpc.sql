-- RPC de création de personne (interface de sécurité de la Phase 5).
-- Toutes les fonctions sont SECURITY DEFINER : elles contournent la RLS mais
-- vérifient explicitement le rôle et la lignée avant d'insérer, de façon atomique
-- (la personne et son rattachement sont créés dans la même transaction).

-- Helper interne : insère une personne depuis un payload jsonb (champs civils).
-- N'est PAS destinée à être appelée directement (EXECUTE révoqué plus bas).
create or replace function public._insert_personne(
  p_new jsonb,
  p_est_lignee boolean
)
returns public.personnes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_personne public.personnes;
begin
  insert into public.personnes (
    id, nom, prenom, appellation, numero, nom_facebook, sexe, profession,
    date_naissance, date_deces, pays, ville, quartier, "estLigneeGenerale"
  )
  values (
    coalesce((p_new ->> 'id')::uuid, gen_random_uuid()),
    p_new ->> 'nom',
    p_new ->> 'prenom',
    p_new ->> 'appellation',
    p_new ->> 'numero',
    p_new ->> 'nom_facebook',
    p_new ->> 'sexe',
    p_new ->> 'profession',
    nullif(p_new ->> 'date_naissance', '')::date,
    nullif(p_new ->> 'date_deces', '')::date,
    p_new ->> 'pays',
    p_new ->> 'ville',
    p_new ->> 'quartier',
    p_est_lignee
  )
  returning * into v_personne;

  return v_personne;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. Admin : personne sans rattachement (ancêtres racines au sommet de l'arbre).
-- ---------------------------------------------------------------------------
create or replace function public.create_personne_root(p_new jsonb)
returns public.personnes
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Seul un administrateur peut créer une personne sans rattachement'
      using errcode = '42501';
  end if;

  return public._insert_personne(
    p_new,
    coalesce((p_new ->> 'estLigneeGenerale')::boolean, true)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Par mariage (alliance) : estLigneeGenerale = false, conjoint existant.
--    Modérateur : le conjoint doit appartenir à sa lignée.
-- ---------------------------------------------------------------------------
create or replace function public.create_personne_par_mariage(
  p_new jsonb,
  p_conjoint_id uuid
)
returns public.personnes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_personne public.personnes;
begin
  if not public.is_admin()
     and not (public.is_moderator() and public.is_in_lignee(p_conjoint_id)) then
    raise exception 'Accès refusé : le conjoint doit appartenir à votre lignée'
      using errcode = '42501';
  end if;

  if not exists (select 1 from public.personnes where id = p_conjoint_id) then
    raise exception 'Conjoint introuvable : %', p_conjoint_id;
  end if;

  v_personne := public._insert_personne(p_new, false);

  insert into public.mariages (personne_1_id, personne_2_id, date_mariage)
  values (v_personne.id, p_conjoint_id, nullif(p_new ->> 'date_mariage', '')::date);

  return v_personne;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Par naissance (descendance), via un mariage existant : remplit automatiquement
--    les deux parents (parent_enfants) et associe l'enfant au mariage
--    (mariage_enfants). estLigneeGenerale = true.
--    Modérateur : le mariage doit concerner sa lignée.
-- ---------------------------------------------------------------------------
create or replace function public.create_personne_par_naissance_mariage(
  p_new jsonb,
  p_mariage_id uuid
)
returns public.personnes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_personne public.personnes;
  v_mariage public.mariages;
begin
  select * into v_mariage from public.mariages where id = p_mariage_id;
  if not found then
    raise exception 'Mariage introuvable : %', p_mariage_id;
  end if;

  if not public.is_admin()
     and not (
       public.is_moderator()
       and (
         public.is_in_lignee(v_mariage.personne_1_id)
         or public.is_in_lignee(v_mariage.personne_2_id)
       )
     ) then
    raise exception 'Accès refusé : le mariage doit appartenir à votre lignée'
      using errcode = '42501';
  end if;

  v_personne := public._insert_personne(p_new, true);

  -- Rattache l'enfant aux deux parents du mariage.
  insert into public.parent_enfants (parent_id, enfant_id)
  values
    (v_mariage.personne_1_id, v_personne.id),
    (v_mariage.personne_2_id, v_personne.id);

  -- Associe l'enfant au mariage précis.
  insert into public.mariage_enfants (mariage_id, enfant_id)
  values (p_mariage_id, v_personne.id);

  return v_personne;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Par naissance, sans mariage : un parent unique (père OU mère).
--    estLigneeGenerale = true.
--    Modérateur : le parent doit appartenir à sa lignée.
-- ---------------------------------------------------------------------------
create or replace function public.create_personne_par_naissance_parent(
  p_new jsonb,
  p_parent_id uuid
)
returns public.personnes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_personne public.personnes;
begin
  if not public.is_admin()
     and not (public.is_moderator() and public.is_in_lignee(p_parent_id)) then
    raise exception 'Accès refusé : le parent doit appartenir à votre lignée'
      using errcode = '42501';
  end if;

  if not exists (select 1 from public.personnes where id = p_parent_id) then
    raise exception 'Parent introuvable : %', p_parent_id;
  end if;

  v_personne := public._insert_personne(p_new, true);

  insert into public.parent_enfants (parent_id, enfant_id, type_parent)
  values (p_parent_id, v_personne.id, nullif(p_new ->> 'type_parent', ''));

  return v_personne;
end;
$$;

-- Le helper d'insertion ne doit pas être appelable directement depuis l'API.
revoke execute on function public._insert_personne(jsonb, boolean)
  from public, anon, authenticated;
