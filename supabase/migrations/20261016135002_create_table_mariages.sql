-- Union entre deux personnes. Une même personne peut avoir plusieurs mariages.
create table public.mariages (
  id uuid primary key default gen_random_uuid(),
  personne_1_id uuid not null references public.personnes(id) on delete restrict,
  personne_2_id uuid not null references public.personnes(id) on delete restrict,
  date_mariage date,
  date_fin date,
  type_fin text,
  created_at timestamptz not null default now(),
  constraint mariages_no_self check (personne_1_id <> personne_2_id)
);
