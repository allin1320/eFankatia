/**
 * Keep-alive Supabase.
 *
 * Les projets Supabase **Free** sont mis en pause après ~7 jours de « faible
 * activité » (quelques requêtes base par jour suffisent à les maintenir
 * éveillés). Cet endpoint exécute volontairement une **vraie requête SQL**
 * (lecture seule) pour générer cette activité.
 *
 * Il est appelé par deux déclencheurs complémentaires :
 *   - le cron Vercel déclaré dans `vercel.json` (1×/jour, limite Hobby) ;
 *   - un cron externe (ex. cron-job.org, 1×/6 h) qui sert aussi de moniteur :
 *     il alerte par mail quand la réponse n'est pas 200.
 *
 * Sécurité : `Authorization: Bearer $CRON_SECRET` est obligatoire. Vercel envoie
 * cet en-tête automatiquement quand la variable `CRON_SECRET` existe.
 *
 * Note : ce fichier n'a aucune dépendance sur le build Vite/TanStack Start ; il
 * est bundlé indépendamment de `api/server.js`.
 */
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')

  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    res.statusCode = 401
    res.end(JSON.stringify({ error: 'Unauthorized' }))
    return
  }

  const url = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    console.error(
      '[cron:keepalive] Variables manquantes : VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY',
    )
    res.statusCode = 500
    res.end(
      JSON.stringify({
        ok: false,
        error: 'Variables d’environnement manquantes.',
      }),
    )
    return
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const startedAt = Date.now()

  // `head: true` + `count` : Postgres exécute bien la requête (activité
  // enregistrée côté Supabase) sans rapatrier de lignes ni consommer d'egress.
  const { count, error } = await supabase
    .from('personnes')
    .select('id', { head: true, count: 'exact' })
    .limit(1)

  const durationMs = Date.now() - startedAt

  if (error) {
    console.error('[cron:keepalive] Supabase indisponible :', error.message)
    res.statusCode = 503
    res.end(JSON.stringify({ ok: false, error: error.message }))
    return
  }

  console.log(
    `[cron:keepalive] ok — ${count ?? 0} personne(s) en ${durationMs} ms`,
  )
  res.statusCode = 200
  res.end(
    JSON.stringify({
      ok: true,
      rows: count ?? 0,
      durationMs,
      at: new Date().toISOString(),
    }),
  )
}
