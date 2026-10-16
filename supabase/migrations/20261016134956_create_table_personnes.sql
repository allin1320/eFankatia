-- Table centrale : une personne est enregistrée UNE seule fois (jamais dupliquée).
create table public.personnes (
  id uuid primary key default gen_random_uuid(),
  nom text,
  prenom text,
  appellation text,
  numero text,
  nom_facebook text,
  sexe text,
  profession text,
  date_naissance date,
  date_deces date,
  pays text,
  ville text,
  quartier text,
  "estLigneeGenerale" boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_created uuid references auth.users(id) on delete set null,
  user_edited uuid references auth.users(id) on delete set null
);
