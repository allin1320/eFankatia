-- Création automatique du profil applicatif à chaque nouvelle inscription.
-- Le trigger tourne en SECURITY DEFINER (propriétaire = postgres) afin de pouvoir
-- insérer dans `profiles` malgré la RLS qui y sera activée.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'ROLE_USER');
  return new;
end;
$$;

-- Déclenché à chaque insertion dans auth.users (inscription Supabase Auth).
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
