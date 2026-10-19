-- Ajout du champ `urlImgThumb` à la table `personnes`.
-- Stocke l'URL publique de la miniature de la photo de profil, renvoyée par
-- l'API imgbb en même temps que l'URL plein format `urlImg` (voir Phase 4).
-- Nullable : une personne peut ne pas avoir de photo.

alter table public.personnes
  add column "urlImgThumb" text;

-- Met à jour le helper d'insertion pour prendre en compte `urlImgThumb`.
-- (Les RPC create_personne_* passent leur payload `p_new` à ce helper,
-- elles n'ont pas besoin d'être modifiées.)
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
    date_naissance, date_deces, pays, ville, quartier, "urlImg", "urlImgThumb", "estLigneeGenerale"
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
    p_new ->> 'urlImg',
    p_new ->> 'urlImgThumb',
    p_est_lignee
  )
  returning * into v_personne;

  return v_personne;
end;
$$;

-- Le helper d'insertion ne doit pas être appelable directement depuis l'API.
revoke execute on function public._insert_personne(jsonb, boolean)
  from public, anon, authenticated;
