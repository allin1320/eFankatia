import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Cible d'exécution des seeds (`npm run seed:*`), pilotée par la variable
 * d'environnement `SUPABASE_DB_TARGET` :
 *
 * - `local` (défaut) — base locale de la stack `supabase start` ;
 * - `linked` — projet Supabase **cloud** lié au dossier (`npx supabase link`).
 *
 * La cible est traduite en drapeau `--local` / `--linked` de la commande
 * `supabase db query` : les deux valeurs sont des drapeaux valides de la CLI.
 */
const LOCAL_TARGET = 'local'
const LINKED_TARGET = 'linked'

export type SeedDbTarget = typeof LOCAL_TARGET | typeof LINKED_TARGET

/** Lit et valide `SUPABASE_DB_TARGET` (absente = `local`, comme avant). */
export function resolveSeedDbTarget(): SeedDbTarget {
  const raw = process.env.SUPABASE_DB_TARGET?.trim()

  if (!raw || raw === LOCAL_TARGET) return LOCAL_TARGET
  if (raw === LINKED_TARGET) return LINKED_TARGET

  throw new Error(
    `SUPABASE_DB_TARGET invalide : « ${raw} ». Valeurs attendues : ${LOCAL_TARGET} | ${LINKED_TARGET}.`,
  )
}

/**
 * Exécute le SQL d'un seed via la Supabase CLI (`db query`).
 *
 * La requête passe par **stdin** : les identifiants ne touchent jamais le
 * disque. En cible `linked`, la CLI s'appuie sur la session d'authentification
 * (`npx supabase login` ou la variable `SUPABASE_ACCESS_TOKEN`) pour
 * interroger le projet cloud lié.
 *
 * Le SQL est conçu pour être idempotent : relancer un seed ne crée pas de
 * doublons, qu'il cible la base locale ou le cloud.
 */
export function runSeedQuery(sql: string): void {
  const target = resolveSeedDbTarget()
  const projectRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    '..',
  )
  const cliPath = path.join(
    projectRoot,
    'node_modules',
    'supabase',
    'dist',
    'supabase.js',
  )

  execFileSync(process.execPath, [cliPath, 'db', 'query', `--${target}`], {
    cwd: projectRoot,
    input: sql,
    stdio: ['pipe', 'inherit', 'inherit'],
  })
}
