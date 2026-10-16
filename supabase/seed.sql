-- Seed de la base locale (rejoué lors de `supabase db reset`).
-- Crée 3 comptes de démo (admin / modérateur / utilisateur) et une petite famille
-- afin de tester les rôles et la RLS.

-- ---------------------------------------------------------------------------
-- 1. Comptes Supabase Auth (auth.users)
--    Le trigger `handle_new_user` crée automatiquement le profil ROLE_USER associé.
--    Mots de passe (démo) : Admin123! / Modo123! / User123!
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated', 'authenticated',
    'admin@efankatia.local',
    extensions.crypt('Admin123!', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(), now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated', 'authenticated',
    'moderateur@efankatia.local',
    extensions.crypt('Modo123!', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(), now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-3333-3333-333333333333',
    'authenticated', 'authenticated',
    'user@efankatia.local',
    extensions.crypt('User123!', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(), now(),
    '', '', '', ''
  );

-- ---------------------------------------------------------------------------
-- 2. Famille de démo
--    Jean + Marie -> Paul -> Jeanne
-- ---------------------------------------------------------------------------

-- Ancêtre racine (personne assignée au modérateur)
insert into public.personnes
  (id, nom, prenom, appellation, sexe, profession, pays, ville, "estLigneeGenerale")
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Rakoto', 'Jean', 'Jean Rakoto', 'M', 'Agriculteur', 'Madagascar', 'Antananarivo', true);

-- Épouse de Jean (rattachée par mariage)
insert into public.personnes
  (id, nom, prenom, appellation, sexe, "estLigneeGenerale")
values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Rakoto', 'Marie', 'Marie Rakoto', 'F', false);

-- Fils de Jean & Marie
insert into public.personnes
  (id, nom, prenom, appellation, sexe, "estLigneeGenerale")
values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Rakoto', 'Paul', 'Paul Rakoto', 'M', true);

-- Petite-fille (enfant de Paul)
insert into public.personnes
  (id, nom, prenom, appellation, sexe, "estLigneeGenerale")
values
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Rakoto', 'Jeanne', 'Jeanne Rakoto', 'F', true);

-- Mariage Jean + Marie
insert into public.mariages
  (id, personne_1_id, personne_2_id, date_mariage)
values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '1990-06-15');

-- Liens parent -> enfant
insert into public.parent_enfants (parent_id, enfant_id)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'dddddddd-dddd-dddd-dddd-dddddddddddd');

-- Enfant issu du mariage Jean + Marie
insert into public.mariage_enfants (mariage_id, enfant_id)
values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'cccccccc-cccc-cccc-cccc-cccccccccccc');

-- ---------------------------------------------------------------------------
-- 3. Rôles applicatifs
-- ---------------------------------------------------------------------------

update public.profiles
set role = 'ROLE_ADMIN'
where id = '11111111-1111-1111-1111-111111111111';

update public.profiles
set role = 'ROLE_MODERATEUR',
    personne_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
where id = '22222222-2222-2222-2222-222222222222';
