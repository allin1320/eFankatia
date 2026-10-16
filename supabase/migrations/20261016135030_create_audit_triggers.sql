-- Fonction qui renseigne automatiquement l'auteur (auth.uid()) à la création / modification.
create or replace function public.set_audit_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.user_created := auth.uid();
  elsif tg_op = 'UPDATE' then
    new.user_edited := auth.uid();
  end if;
  return new;
end;
$$;

-- Mise à jour automatique de `updated_at`.
create trigger personnes_set_updated_at
  before update on public.personnes
  for each row execute function extensions.moddatetime(updated_at);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function extensions.moddatetime(updated_at);

-- Enregistrement automatique de `user_created` / `user_edited`.
create trigger personnes_audit_user
  before insert or update on public.personnes
  for each row execute function public.set_audit_user();

create trigger profiles_audit_user
  before insert or update on public.profiles
  for each row execute function public.set_audit_user();
