# Décisions Techniques — Phase 3 (Frontend TanStack)

Registre des choix de conception pris pendant la Phase 3 (initialisation du frontend TanStack Start). Objectif : garder la trace des décisions qui impactent les phases suivantes (P4 imgbb, P5/P6 CRUD, P7 recherche, P8 arbre, P9 déploiement Vercel).

## Authentification (SSR)

- **Architecture retenue** : SSR avec `@supabase/ssr` — session portée par des **cookies httpOnly**, lus/écrits via les helpers de TanStack Start (`getCookies` / `setCookie` / `setResponseHeader`). Compatible Vercel (fonctions serverless).
- **`getSession()`** : server function (`createServerFn`) qui renvoie `{ user, profile }` (utilisateur Supabase Auth + profil applicatif `profiles` avec `role` et `personne_id`).
- **Session dans le contexte routeur** : le `beforeLoad` de la route racine (`__root.tsx`) charge `getSession()` et injecte `user` + `profile` dans le contexte. Rechargé à chaque navigation (frais, aucune désynchronisation).
- **`AuthProvider`** (contexte React, `src/lib/auth/auth-context.tsx`) : expose `useAuth()` → `{ user, profile, role, isAuthenticated, isAdmin, isModerator }`. Choisi plutôt que `useRouteContext()` directement (typage propre, pas de cast).
- **Périmètre P3** : login email/mot de passe uniquement. Signup / reset / OTP / OAuth volontairement différés.

## Protection des routes

| Route | Règle |
|---|---|
| `/` (`index.tsx`) | Redirige vers `/app` si connecté, sinon `/login`. |
| `/login` | Redirige vers `/app` si déjà connecté. |
| `/app` (`app.tsx`) | Layout protégé : `beforeLoad` → `redirect('/login?redirect=<path>')` si non authentifié. |

- **Choix `app.tsx` (segment de chemin) plutôt que `_app.tsx` (layout *pathless*)** : un layout `_app` n'ajoute pas de segment et son `index` entrerait en conflit avec la route `/` racine. `app.tsx` + `app/index.tsx` donnent `/app` proprement et accueilleront `app/personnes`, `app/recherche`, etc.

## Variables d'environnement

- **Mêmes noms pour client et serveur** : `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — lues via `import.meta.env` (client) et `process.env` (serveur). Pattern officiel Supabase, 2 variables seulement à renseigner (local + Vercel).
- `.env` (gitignoré) = valeurs locales ; `.env.example` (committé) documente local + cloud.
- Typage via `src/env.d.ts` (`ImportMetaEnv`).

## Formulaires

- **TanStack Form + Zod** (déjà dans les deps) : `validators: { onSubmit: schema }` (Zod 4 = standard schema, intégré nativement).
- Feedback accessible : erreurs de champ inline (`role="alert"`), erreur d'auth en tête (`Alert` destructive), états `pending`/`disabled`.

## Design / UI

- **Thème « lagon » conservé** (tokens CSS existants `--sea-ink`, `--lagoon`, `--palm`, … ; Fraunces + Manrope). Le skill ui-ux-pro-max n'ayant pas de palette teal/botanique, on garde l'identité existante et on n'en retient que les règles UX.
- **shadcn/ui** (`new-york`, base `zinc`, package `radix-ui` unifié + `cn`) : composants ajoutés `card`, `badge`, `avatar`, `dropdown-menu`, `separator`, `skeleton`, `alert`, `tooltip`.
- **ThemeProvider custom** (`src/components/layout/theme-provider.tsx`) : `localStorage` + toggle de la classe `.dark`, avec **script inline anti-flash** dans `<head>` (`suppressHydrationWarning` sur `<html>`). Pas de dépendance `next-themes`.
- Règles UX appliquées : erreurs inline + `aria-live`, focus visible, contrastes ≥ 4.5:1, zones ≥ 44px, labels visibles, `prefers-reduced-motion`.

## Correction du seed (`supabase/seed.sql`)

- **Bug latent Phase 1 corrigé en P3** : le seed insérait dans `auth.users` sans renseigner `confirmation_token`, `recovery_token`, `email_change_token_new`, `email_change` → l'auth GoTrue plantait au login (`Scan error … converting NULL to string`). Ces 4 colonnes sont désormais posées à `''`.

## Outillage & workflow

- **ESLint** (`@tanstack/eslint-config`, type-aware) : ajout aux `ignores` des fichiers générés (`src/routeTree.gen.ts`, `src/lib/supabase/database.types.ts`) et de `.opencode` / `.tanstack`.
- **Types générés** : `npx supabase gen types typescript --local > src/lib/supabase/database.types.ts` (base locale, schéma versionné identique au cloud). Les RPC (`create_personne_*`, `current_role`, …) sont présents dans `Database['public']['Functions']`.
- **Prettier** : `src/` normalisé au style du projet (`semi: false`, `singleQuote: true`).
