-- Relation directe parent/enfant (y compris parents solos ou partiels).
create table public.parent_enfants (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.personnes(id) on delete restrict,
  enfant_id uuid not null references public.personnes(id) on delete restrict,
  type_parent text,
  created_at timestamptz not null default now(),
  constraint parent_enfants_parent_enfant_key unique (parent_id, enfant_id),
  constraint parent_enfants_no_self check (parent_id <> enfant_id)
);
