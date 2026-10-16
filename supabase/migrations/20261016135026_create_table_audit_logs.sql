-- Historique des modifications (table, action, anciennes/nouvelles valeurs, auteur).
create table public.audit_logs (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id uuid,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  user_id uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);
