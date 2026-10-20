/**
 * Pont entre la fonction serverless Vercel (Node.js) et le handler `fetch`
 * produit par TanStack Start (`dist/server/server.js`).
 *
 * Vercel fournit `req`/`res` au format Node.js (`http.IncomingMessage` /
 * `http.ServerResponse`), alors que TanStack Start expose un handler Web
 * standard (`Request` → `Response`). Ce fichier fait la conversion dans les
 * deux sens et relaie correctement les cookies de session Supabase
 * (`set-cookie`), indispensables à l'authentification SSR.
 */
import { Readable } from 'node:stream'

import startServer from '../dist/server/server.js'

/**
 * Reconstruit l'origine publique de la requête (protocole + hôte).
 *
 * Vercel termine le TLS puis transmet la requête en HTTP interne : le
 * protocole réel est fourni par `x-forwarded-proto` (`https` en production).
 * C'est important car TanStack Start compare l'en-tête `Origin`/`Referer` à
 * l'origine de `request.url` (protection CSRF des server functions).
 */
function getRequestOrigin(req) {
  const forwardedProto = req.headers['x-forwarded-proto']
  const proto =
    (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto)
      ?.split(',')[0]
      ?.trim() || 'http'

  const forwardedHost = req.headers['x-forwarded-host']
  const host =
    (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost)
      ?.split(',')[0]
      ?.trim() ||
    req.headers.host ||
    'localhost'

  return `${proto}://${host}`
}

/** Convertit une requête Node.js en `Request` Web standard. */
function toWebRequest(req) {
  const url = new URL(req.url ?? '/', getRequestOrigin(req))

  const headers = new Headers()
  for (const [name, value] of Object.entries(req.headers)) {
    if (value === undefined) continue
    if (Array.isArray(value)) {
      for (const item of value) headers.append(name, item)
    } else {
      headers.append(name, value)
    }
  }

  const method = (req.method ?? 'GET').toUpperCase()
  const hasBody = method !== 'GET' && method !== 'HEAD'
  const body = hasBody ? Readable.toWeb(req) : undefined

  return new Request(url, { method, headers, body, duplex: 'half' })
}

/** Écrit une `Response` Web dans la réponse Node.js de Vercel. */
async function sendWebResponse(res, response) {
  // En-têtes standards (hors `set-cookie` et `content-encoding`, gérés à part).
  for (const [name, value] of response.headers.entries()) {
    const lower = name.toLowerCase()
    if (lower === 'set-cookie' || lower === 'content-encoding') continue
    res.setHeader(name, value)
  }

  // La session Supabase (cookies httpOnly) transite par `set-cookie`.
  const setCookies = response.headers.getSetCookie?.() ?? []
  if (setCookies.length > 0) res.setHeader('set-cookie', setCookies)

  res.statusCode = response.status
  res.statusMessage = response.statusText

  if (response.body) {
    Readable.fromWeb(response.body).pipe(res)
  } else {
    res.end()
  }
}

/** Point d'entrée de la fonction serverless Vercel. */
export default async function handler(req, res) {
  try {
    const response = await startServer.fetch(toWebRequest(req))
    await sendWebResponse(res, response)
  } catch (error) {
    console.error('[eFankatia] Erreur serveur :', error)
    res.statusCode = 500
    res.setHeader('content-type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ error: 'Erreur interne du serveur.' }))
  }
}
