import { randomUUID } from 'node:crypto'

import { resolveSeedDbTarget, runSeedQuery } from './lib/db-target'

const MIN_PASSWORD_LENGTH = 8
const ADMIN_ROLE = 'ROLE_ADMIN'

function readRequiredEnv(name: string): string {
  const value = process.env[name]

  if (!value || value.trim().length === 0) {
    throw new Error(
      `${name} est manquant. Renseignez-le dans .env (voir .env.example).`,
    )
  }

  return value
}

function toSqlLiteral(value: string): string {
  if (value.includes('\0')) {
    throw new Error(
      'Les valeurs du seed ne peuvent pas contenir de caractère nul.',
    )
  }

  return `'${value.replaceAll("'", "''")}'`
}

function validateEmail(email: string): void {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(
      `ADMIN_EMAIL n'est pas une adresse e-mail valide : ${email}`,
    )
  }
}

function validatePassword(password: string): void {
  if (password.trim().length === 0) {
    throw new Error('ADMIN_PASSWORD ne peut pas être vide.')
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `ADMIN_PASSWORD doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`,
    )
  }
}

/**
 * Construit un bloc SQL idempotent :
 * - crée le compte Supabase Auth s'il n'existe pas ;
 * - met à jour son mot de passe s'il existe déjà ;
 * - garantit le rôle ROLE_ADMIN dans public.profiles.
 *
 * Les identifiants viennent exclusivement de l'environnement (.env) et ne
 * doivent jamais être committés.
 */
function buildSeedSql(email: string, password: string): string {
  const dollarTag = `$efankatia_seed_${randomUUID().replaceAll('-', '')}$`

  if (email.includes(dollarTag) || password.includes(dollarTag)) {
    throw new Error('Valeur incompatible avec le délimiteur SQL généré.')
  }

  const emailLiteral = toSqlLiteral(email)
  const passwordLiteral = toSqlLiteral(password)

  return `
do ${dollarTag}
declare
  v_email text := ${emailLiteral};
  v_password text := ${passwordLiteral};
  v_user_id uuid;
begin
  select id
    into v_user_id
    from auth.users
   where lower(email) = lower(v_email);

  if v_user_id is null then
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      v_email,
      extensions.crypt(v_password, extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    )
    returning id into v_user_id;
  else
    update auth.users
       set email = v_email,
           encrypted_password = extensions.crypt(
             v_password,
             extensions.gen_salt('bf')
           ),
           email_confirmed_at = coalesce(email_confirmed_at, now()),
           updated_at = now()
     where id = v_user_id;
  end if;

  -- Identité « email » attendue par Supabase Auth (no-op si elle existe déjà).
  insert into auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    v_user_id::text,
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    'email',
    now(),
    now(),
    now()
  )
  on conflict (provider_id, provider) do nothing;

  -- Le trigger handle_new_user crée normalement le profil ; on le garantit
  -- et on force le rôle administrateur (idempotent).
  insert into public.profiles (id, email, role, personne_id)
  values (v_user_id, v_email, '${ADMIN_ROLE}', null)
  on conflict (id) do update
    set email = excluded.email,
        role = '${ADMIN_ROLE}',
        personne_id = null;
end
${dollarTag};
`.trimStart()
}

async function main(): Promise<void> {
  const email = readRequiredEnv('ADMIN_EMAIL').trim()
  const password = readRequiredEnv('ADMIN_PASSWORD')
  const target = resolveSeedDbTarget()

  validateEmail(email)
  validatePassword(password)

  console.log(
    `🌱 Création / mise à jour de l'administrateur ${email} (cible : ${target})…`,
  )
  runSeedQuery(buildSeedSql(email, password))
  console.log(`✅ Administrateur prêt (${ADMIN_ROLE}).`)
}

main().catch((error: unknown) => {
  console.error(
    '❌ Échec du seed administrateur :',
    error instanceof Error ? error.message : error,
  )
  process.exitCode = 1
})
