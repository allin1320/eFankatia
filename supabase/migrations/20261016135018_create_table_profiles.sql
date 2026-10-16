-- Profil applicatif lié 1:1 à auth.users(id).
-- `personne_id` est renseigné uniquement pour un ROLE_MODERATEUR (lignée assignée).
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role public.user_role not null default 'ROLE_USER',
  personne_id uuid references public.personnes(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_created uuid references auth.users(id) on delete set null,
  user_edited uuid references auth.users(id) on delete set null
);
