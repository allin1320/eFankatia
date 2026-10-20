# Déploiement de eFankatia sur Vercel

Guide **bout-en-bout** : préparer Supabase (cloud), adapter le dépôt, configurer puis déployer l'application sur **Vercel**.

> Cette procédure utilise l'approche **bridge manuel** (sans nouvelle dépendance) :
> une fonction serverless `api/server.js` fait le pont entre le runtime Node.js de
> Vercel et le handler `fetch` produit par TanStack Start.

---

## Sommaire

1. [Vue d'ensemble](#1-vue-densemble)
2. [Prérequis](#2-prérequis)
3. [Étape 1 — Préparer Supabase (cloud)](#3-étape-1--préparer-supabase-cloud)
4. [Étape 2 — Préparer le dépôt](#4-étape-2--préparer-le-dépôt)
5. [Étape 3 — Configurer Vercel](#5-étape-3--configurer-vercel)
6. [Étape 4 — Déployer et vérifier](#6-étape-4--déployer-et-vérifier)
7. [Dépannage](#7-dépannage)
8. [Références](#8-références)

---

## 1. Vue d'ensemble

```
Navigateur
   │
   ▼
Vercel
   ├─ Fichiers statiques  ← dist/client/  (JS, CSS, images)
   └─ Fonction serverless ← api/server.js
                              │  convertit req/res Node.js → Request/Response Web
                              ▼
                         dist/server/server.js  (SSR TanStack Start)
                              │
                              ├─→ Supabase cloud (PostgreSQL, Auth, RLS, RPC)
                              └─→ API imgbb (upload des photos)
```

- **`dist/client/`** : assets compilés par `vite build`, servis directement par Vercel.
- **`dist/server/server.js`** : serveur SSR TanStack Start, qui exporte un handler
  `fetch(request) → Response` (Web standard).
- **`api/server.js`** : pont Node.js ↔ Web, seule pièce propre à Vercel.
- **Supabase** et **imgbb** restent des services externes ; Vercel ne fait que les appeler.

---

## 2. Prérequis

- **Node.js ≥ 22.12** (exigence de TanStack Start) et **npm**.
- Un **compte Vercel** et (de préférence) le dépôt hébergé sur GitHub/GitLab/Bitbucket.
- Un **projet Supabase cloud** (ou la possibilité d'en créer un).
- Une **clé API imgbb** (`https://api.imgbb.com/`).
- La **Supabase CLI** (déjà en `devDependency`, utilisée via `npx supabase`).

> La version de Node est imposée à **un seul endroit** côté build :
> `"engines": { "node": "22.x" }` dans `package.json`, doublé de
> **Settings → General → Node.js Version = 22.x** dans le dashboard Vercel
> (le runtime de la fonction suit la même version).
>
> ⚠️ Ne jamais écrire `functions.*.runtime` dans `vercel.json` : ce champ exige un
> **paquet npm versionné** (`@vercel/node@5.x`, `vercel-php@0.5.2`, …).
> `"nodejs22.x"` y est refusé au build avec
> `Error: [invalid_function_runtime] …`. `@vercel/node` étant le runtime officiel,
> on l'omet tout simplement : Vercel le détecte seul.

> **Aucune installation locale n'est nécessaire pour le déploiement lui-même** :
> Vercel exécute `npm install` puis `npm run build` **dans le cloud**. La Supabase
> CLI n'intervient que pour le push des migrations (§3.2) et les seeds (§3.4 / §3.5),
> réalisables depuis une CI (variable `SUPABASE_ACCESS_TOKEN`) — ou, pour le schéma,
> en collant les migrations dans le **SQL Editor** du dashboard.

---

## 3. Étape 1 — Préparer Supabase (cloud)

### 3.1 Créer / identifier le projet

1. Créez un projet sur [supabase.com](https://supabase.com/dashboard).
2. Notez son **`<project-ref>`** (visible dans l'URL du dashboard :
   `https://supabase.com/dashboard/project/<project-ref>`).

### 3.2 Lier le dépôt et pousser les migrations

```bash
# Authentification (interactive). En CI : export SUPABASE_ACCESS_TOKEN=...
npx supabase login

# Lier le dossier au projet cloud (demande le mot de passe DB)
npx supabase link --project-ref <project-ref>

# Appliquer toutes les migrations (schéma, RLS, RPC, triggers)
npx supabase db push
```

`db push` crée les tables `personnes`, `mariages`, `parent_enfants`,
`mariage_enfants`, `profiles`, `audit_logs`, les politiques **RLS**, les RPC
(`current_role`, `admin_*`, etc.) et les triggers (`handle_new_user`, audit).

> ⚠️ **`npm run db:reset` n'est pas fait pour le cloud** : il cible la base
> **locale** (exige `supabase start` + Docker), recrée le schéma **à vide**, puis
> rejoue les migrations. Ne jamais le forcer contre le cloud
> (`supabase db reset --linked`) sur un projet qui contient des données :
> **tout serait détruit**. Sur le cloud, la seule commande à utiliser est
> `db push` — idempotent, il n'efface rien.

### 3.3 Configurer les URLs d'authentification

Dans le dashboard Supabase : **Authentication → URL Configuration**.

- **Site URL** : `https://<votre-app>.vercel.app` (ou votre domaine personnalisé).
- **Redirect URLs** : ajoutez la même URL, et si besoin les URLs de prévisualisation
  Vercel (ex. `https://<projet>-*.vercel.app`).

> Pour le développement local, gardez aussi `http://127.0.0.1:3003` et
> `http://localhost:3003` dans **Redirect URLs** (valeurs de `supabase/config.toml`).

### 3.4 Créer le compte administrateur

Deux méthodes : la **A** se fait entièrement dans le navigateur (aucun outil
local), la **B** exécute `scripts/seed-admin.ts` via la CLI depuis ta machine ou
ta CI :

**Méthode A — Dashboard + SQL (recommandée)**

1. **Authentication → Users → Add user** : saisissez l'e-mail et le mot de passe,
   cochez **Auto Confirm User**.
   Le trigger `handle_new_user` crée automatiquement le profil avec `ROLE_USER`.
2. Dans le **SQL Editor**, promouvez ce compte :

   ```sql
   update public.profiles
      set role = 'ROLE_ADMIN'
    where email = '<admin-email>';
   ```

**Méthode B — Seed via la CLI (cloud)**

Le script cible la base locale par défaut ; la variable `SUPABASE_DB_TARGET=linked`
le bascule sur le projet **cloud** lié (`npx supabase link`). Avec
`ADMIN_EMAIL` / `ADMIN_PASSWORD` renseignés dans `.env` :

```bash
npm run seed:user:admin-create:cloud
# équivalent : SUPABASE_DB_TARGET=linked npm run seed:user:admin-create
```

La CLI doit être authentifiée : `npx supabase login` (session locale) ou la
variable `SUPABASE_ACCESS_TOKEN` (CI). Le script est idempotent (création ou
mise à jour du mot de passe).

### 3.5 Données de démonstration (optionnel)

Pour vérifier l'arbre, la recherche et les fiches sans saisir de données à la
main :

```bash
npm run seed:personne:test:cloud
```

- Injecte 2 lignées sur 6 générations (**71 personnes**, 27 unions, 82 liens
  parent-enfant) dans le projet **cloud** lié.
- Mêmes exigences que la Méthode B : CLI authentifiée, projet lié.
- **Idempotent** : relançable sans doublons (UUID déterministes).
- ⚠️ À réserver à un projet de **démonstration / staging** — ne jamais l'exécuter
  sur un projet qui porte de vraies données familiales.

> La cible de tous les seeds est pilotée par `SUPABASE_DB_TARGET` (`local` par
> défaut, `linked` pour le cloud) : `SUPABASE_DB_TARGET=linked npm run …` ou les
> scripts `*:cloud`. Voir `README.md` § « Cible des seeds : local ou cloud ».

---

## 4. Étape 2 — Préparer le dépôt

Trois éléments sont nécessaires (déjà présents dans ce dépôt) :

### 4.1 `package.json` — version de Node

```json
"engines": {
  "node": "22.x"
}
```

### 4.2 `api/server.js` — le pont Node.js ↔ Web

```js
import { Readable } from 'node:stream'
import startServer from '../dist/server/server.js'

// Vercel termine le TLS puis transmet en HTTP interne : le protocole réel
// vient de `x-forwarded-proto` (https en production).
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

function toWebRequest(req) {
  const url = new URL(req.url ?? '/', getRequestOrigin(req))
  const headers = new Headers()
  for (const [name, value] of Object.entries(req.headers)) {
    if (value === undefined) continue
    if (Array.isArray(value))
      for (const item of value) headers.append(name, item)
    else headers.append(name, value)
  }
  const method = (req.method ?? 'GET').toUpperCase()
  const hasBody = method !== 'GET' && method !== 'HEAD'
  const body = hasBody ? Readable.toWeb(req) : undefined
  return new Request(url, { method, headers, body, duplex: 'half' })
}

async function sendWebResponse(res, response) {
  for (const [name, value] of response.headers.entries()) {
    const lower = name.toLowerCase()
    if (lower === 'set-cookie' || lower === 'content-encoding') continue
    res.setHeader(name, value)
  }
  const setCookies = response.headers.getSetCookie?.() ?? []
  if (setCookies.length > 0) res.setHeader('set-cookie', setCookies)
  res.statusCode = response.status
  res.statusMessage = response.statusText
  if (response.body) Readable.fromWeb(response.body).pipe(res)
  else res.end()
}

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
```

Points clés :

- **`set-cookie`** est relayé séparément : c'est ce qui transporte la session
  Supabase (cookies httpOnly). Sans cela, la connexion ne « tient » pas.
- **`content-encoding`** est retiré : Vercel gère lui-même la compression, et le
  SSR produit du HTML/JSON non pré-compressé.
- **`duplex: 'half'`** est obligatoire pour transmettre un corps en streaming
  (requêtes POST : connexion, création de personne, upload d'image…).
- **Protocole reconstruit via `x-forwarded-proto`** : Vercel termine le TLS puis
  transmet en HTTP interne. Utiliser `https` en prod est indispensable car
  TanStack Start compare l'en-tête `Origin`/`Referer` à l'origine de
  `request.url` (protection CSRF des server functions).

### 4.3 `vercel.json` — build, runtime et routage

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": null,
  "buildCommand": "npm run build",
  "outputDirectory": "dist/client",
  "functions": {
    "api/server.js": {
      "maxDuration": 30
    }
  },
  "rewrites": [{ "source": "/(.*)", "destination": "/api/server" }]
}
```

- **`framework: null`** : désactive la détection automatique (on n'utilise pas le
  preset Nitro).
- **`buildCommand` + `outputDirectory`** : `vite build` produit `dist/client` et
  `dist/server` ; seul `dist/client` est servi en statique.
- **`rewrites`** : tout ce qui n'est pas un fichier statique existant part vers la
  fonction SSR `/api/server`. Les assets `/assets/*` restent servis directement.
- **Pas de `runtime`** : `@vercel/node` est le runtime officiel, il est détecté
  automatiquement. Ne jamais mettre `"runtime": "nodejs22.x"` ici (voir §2) :
  le champ attend un paquet npm `nom@version` et ferait échouer le build.
- **`maxDuration: 30`** : limite les requêtes SSR lentes (lecture Supabase).
- **Ordre Vercel** : fichiers statiques → fonctions → rewrites. L'application ne
  boucle donc pas et les assets ne passent pas par la fonction.

> Vercel exécute `npm run build` **avant** de bundler `api/server.js` : le fichier
> `dist/server/server.js` existe donc au moment de la compilation de la fonction.

### 4.4 `.vercelignore` (optionnel)

Allège l'upload en excluant ce qui n'est pas utile au build :

```gitignore
/supabase
/docs
/scripts
/agent
/.opencode
/.idea
/.vscode
/dist
/.tanstack
/.env
/.env.*
```

> ⚠️ **Toutes les entrées sont ancrées sur la racine (`/nom`)**. Le fichier suit la
> sémantique gitignore : une entrée sans `/` se matche **à tous les niveaux**.
> `supabase` aurait aussi supprimé `src/lib/supabase/` (`client.ts`,
> `query-keys.ts`, `server.ts`…) et le build aurait échoué avec une série
> d'`UNRESOLVED_IMPORT` / `Module not found` — invisibles en local, où les
> fichiers existent.

---

## 5. Étape 3 — Configurer Vercel

### 5.1 Importer le projet

**Via Git (recommandé)**

1. Poussez le dépôt sur GitHub/GitLab/Bitbucket.
2. Sur Vercel : **Add New → Project**, sélectionnez le dépôt.
3. Vercel lit `vercel.json` ; gardez les réglages détectés puis **Deploy**.

**Via la CLI**

```bash
npm i -g vercel
vercel        # crée le projet (environnement Preview)
vercel --prod # déploie en production
```

### 5.2 Variables d'environnement

Dans **Project Settings → Environment Variables**, ajoutez (cochez
**Production** _et_ **Preview**) :

| Variable                    | Visible côté client | Valeur                                                 |
| --------------------------- | ------------------- | ------------------------------------------------------ |
| `VITE_SUPABASE_URL`         | ✅ (public)         | `https://<project-ref>.supabase.co`                    |
| `VITE_SUPABASE_ANON_KEY`    | ✅ (public)         | Clé **publishable** / **anon** du projet cloud         |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ (secret)         | Clé **service_role** (Admin API : création de comptes) |
| `IMGBB_APIKEY`              | ❌ (secret)         | Clé API imgbb                                          |

**Règles importantes**

- Une variable préfixée `VITE_` est **exposée au navigateur**. N'y mettez que des
  valeurs publiques (URL + clé anon).
- `SUPABASE_SERVICE_ROLE_KEY` et `IMGBB_APIKEY` sont **strictement serveur** :
  jamais de préfixe `VITE_`, jamais de valeur dans le dépôt.
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` ne sont **pas** nécessaires sur Vercel : ils ne
  servent qu'au seed admin, exécuté depuis ta machine ou ta CI (script
  `seed:user:admin-create:cloud`), jamais depuis l'app. Un changement de variable
  d'environnement exige un **redéploiement**.

En CLI :

```bash
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add IMGBB_APIKEY production
```

> Récupérez les clés dans **Supabase → Project Settings → API**. Les valeurs locales
> (`npx supabase status`) ne fonctionnent **pas** en production.

---

## 6. Étape 4 — Déployer et vérifier

### 6.1 Déployer

```bash
# Déploiement de production
vercel --prod
```

Ou poussez sur la branche connectée à Vercel (déploiement automatique).

### 6.2 Vérifier

- [ ] La page d'accueil affiche du **contenu rendu côté serveur** (pas d'écran blanc).
- [ ] La navigation entre routes fonctionne (pas de 404).
- [ ] **Connexion** : redirection vers `/app`, session persistante après rechargement
      (vérifie que les cookies Supabase passent bien par le bridge).
- [ ] **Déconnexion** puis reconnexion.
- [ ] **Upload d'une photo** de personne (imgbb) : l'URL publique est renvoyée.
- [ ] `/app/utilisateurs` (admin) : création d'un compte, changement de rôle/mot de passe.
- [ ] (Optionnel) Données de démo (§3.5) : `/app/arbre` et `/app/recherche`
      affichent bien les 2 lignées du seed.
- [ ] Les variables d'environnement sont bien prises en compte (aucune erreur
      « Variables d'environnement manquantes »).

---

## 7. Dépannage

| Symptôme                                              | Cause probable                                                 | Solution                                                                                            |
| ----------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 404 sur les routes après chargement                   | `rewrites` absent / mal formé                                  | Vérifier `vercel.json` : `/(.*)` → `/api/server`.                                                   |
| La page d'accueil charge mais les routes échouent     | La fonction ne reçoit pas les URLs profondes                   | Même point : vérifier le rewrite et que `api/server.js` est bien détecté comme fonction.            |
| Erreur 500 au déploiement / à l'exécution             | Bundling de `dist/server/server.js` ou mauvaise version Node   | Lire les **Function Logs** ; vérifier `engines.node = 22.x` et Node.js Version = 22.x (dashboard).  |
| Build : `[invalid_function_runtime]`                  | `"runtime": "nodejs22.x"` dans `vercel.json`                   | **Supprimer** la clé `runtime` (garder `maxDuration`) : `@vercel/node` est détecté automatiquement. |
| Build : `UNRESOLVED_IMPORT` / `Module not found`      | `.vercelignore` trop large (entrée non ancrée)                 | Ancrer les entrées sur la racine : `/supabase` et non `supabase` (cf. §4.4).                        |
| Connexion impossible / session perdue au rechargement | Cookies `set-cookie` non relayés                               | Vérifier la gestion `getSetCookie()` dans `api/server.js`.                                          |
| « Variables d'environnement manquantes »              | Variables absentes ou mauvais environnement                    | Ajouter les variables en **Production** _et_ **Preview**, puis redéployer.                          |
| Erreur Supabase « Invalid API key » / RLS             | Clés locales utilisées en prod                                 | Utiliser l'URL et les clés du projet **cloud**.                                                     |
| Auth : redirection refusée                            | URL Vercel absente des Redirect URLs                           | Supabase → Authentication → URL Configuration.                                                      |
| Upload image échoue                                   | `IMGBB_APIKEY` absente ou invalide                             | Vérifier la variable (sans préfixe `VITE_`).                                                        |
| Build échoue sur `node`                               | Version Node trop ancienne                                     | `package.json` → `"engines": { "node": "22.x" }` (ou Project Settings → Node.js Version).           |
| Seed refusé : `SUPABASE_DB_TARGET invalide`           | Variable mal renseignée (valeurs attendues : `local`/`linked`) | Relancer avec `SUPABASE_DB_TARGET=linked` ou `npm run <seed>:cloud`.                                |
| Seed en échec 401 / « Unauthorized » (cloud)          | CLI non authentifiée ou projet non lié                         | `npx supabase login`, ou export `SUPABASE_ACCESS_TOKEN` ; `npx supabase link --project-ref …`.      |
| Données du projet cloud perdues                       | `supabase db reset --linked` lancé par erreur                  | Dashboard → **Database → Backups** (restauration) ; sur le cloud, toujours `db push`.               |

---

## 8. Références

- TanStack Start — _Hosting_ : <https://tanstack.com/start/latest/docs/framework/react/guide/hosting>
- TanStack Start — _Server Entry Point_ : <https://tanstack.com/start/latest/docs/framework/react/guide/server-entry-point>
- Vercel — variables d'environnement : <https://vercel.com/docs/environment-variables>
- Vercel — `vercel.json` : <https://vercel.com/docs/project-configuration>
- Supabase — migrations & CLI : <https://supabase.com/docs/guides/cli>
- Supabase — URL Configuration : <https://supabase.com/docs/guides/auth/redirect-urls>
