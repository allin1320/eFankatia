-- Enfants issus d'un mariage précis.
create table public.mariage_enfants (
  mariage_id uuid not null references public.mariages(id) on delete cascade,
  enfant_id uuid not null references public.personnes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (mariage_id, enfant_id)
);
