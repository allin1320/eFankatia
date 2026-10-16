# Plan — Phase 3 : Initialisation du Projet Frontend (TanStack)

## 1. État des lieux

| Élément | État |
|---|---|
| Phase 1 (DB) & Phase 2 (Auth/RLS) | ✅ Terminées — 15 migrations, RLS par rôle, RPC `create_personne_*`, seed avec 3 comptes (admin/modérateur/user) + famille Jean/Marie/Paul/Jeanne |
| Socle TanStack Start | ✅ Starter présent (React 19, Vite 8, Router file-based, Query, Tailwind v4, shadcn `new-york`/`zinc`) — **P3.1 quasi acquis**, reste à le « faire sien » |
| Client Supabase | ❌ Absent — rien dans `src/lib/supabase/`, pas de `.env` |
| Types générés | ❌ Absent (`database.types.ts` n'existe pas) |
| Layout / protection / session | ❌ `__root.tsx` = document HTML brut (`lang="en"`, titre « TanStack Start Starter »), `index.tsx` = placeholder |
| Identité visuelle | 🎨 Déjà forte dans `styles.css` : palette « lagon/mer/palmier » (teal/vert/ivoire), **Fraunces + Manrope**, glassmorphism, mode sombre |

**Conclusion** : P3.1 est un « nettoyage/appropriation » ; l'essentiel du travail réel porte sur **P3.2 → P3.4**.

---

## 2. Décisions actées

| Décision | Choix |
|---|---|
| Architecture auth | **SSR** (`@supabase/ssr`, cookies httpOnly) — compatible Vercel |
| Périmètre auth | **Login email/mot de passe uniquement** (signup / reset / OTP / OAuth → plus tard) |
| Cible Supabase | **via `.env`** (local par défaut) |
| Formulaires | **TanStack Form + Zod** |
| Design | **Thème « lagon » conservé**, UI générée via le skill ui-ux-pro-max |
| Déploiement | **Vercel** (pris en compte dans l'architecture, déploiement effectif en Phase 9) |

> ⚠️ Note de scoping : sans `signup`, la création de comptes passe par le dashboard Supabase / seed (3 comptes déjà prêts). Cohérent avec une app familiale à accès maîtrisé.

---

## 3. Dépendances à installer

```bash
npm i @supabase/supabase-js @supabase/ssr
```

---

## 4. Arborescence cible

```
src/
  lib/
    utils.ts                      (existant)
    supabase/
      client.ts                   # getSupabaseBrowserClient()
      server.ts                   # getSupabaseServerClient() via createServerFn
      database.types.ts           # généré (P3.3)
      index.ts                    # alias typés (Database, Personne, UserRole, Profile…)
    auth/
      auth-context.tsx            # AuthProvider : session + profil + rôle
      use-auth.ts                 # hook useAuth()
      guards.ts                   # requireAuth (beforeLoad)
  components/
    ui/                           # shadcn (existants + nouveaux)
    layout/                       # AppHeader, AppNav, UserMenu, ThemeToggle
    auth/                         # LoginForm, AuthCard
  routes/
    __root.tsx                    # document HTML fr + providers + devtools
    login.tsx                     # page login (publique)
    index.tsx                     # redirige → /app ou /login selon session
    _app.tsx                      # layout protégé (beforeLoad → requireAuth)
    _app/index.tsx                # accueil connecté (placeholder)
  .env.example                    # (committé)
```

---

## 5. Tâches détaillées

### P3.1 — Socle TanStack
- `__root.tsx` : `lang="fr"`, méta « eFankatia — Arbre généalogique familial », providers (`QueryClientProvider`, `AuthProvider`, `ThemeProvider`) autour de `children`, `suppressHydrationWarning` sur `<html>` (thème).
- `ThemeProvider` léger (localStorage + toggle `.dark` — variables déjà présentes) + `ThemeToggle`.
- Dossiers `lib/supabase`, `lib/auth`, `components/layout`, `components/auth`.

### P3.2 — Client Supabase
- `client.ts` : `createBrowserClient` singleton (vars `VITE_*`).
- `server.ts` : `createServerClient` + `parseCookieHeader`/`serializeCookieHeader`, enveloppé dans `createServerFn` (lecture `getUser()` + réécriture cookies rafraîchis).
- `.env` + `.env.example` (URL/anon key, local + cloud documenté).

### P3.3 — Types
- `npx supabase gen types typescript --local > src/lib/supabase/database.types.ts`.
- Vérifier la présence des **RPC** (`create_personne_*`, `current_role`, `is_admin`, …) dans `Database['public']['Functions']` ; alias typés dans `index.ts`.

### P3.4 — Layout, protection, session (cœur UI)
- **Session SSR** : `beforeLoad` du layout `_app` charge la session (server fn) et le **profil** (rôle + `personne_id`) → seeds du cache Query (`['auth']`, `['profile']`). Non connecté → `throw redirect({ to: '/login', search: { redirect } })`.
- **Login** : `LoginForm` (TanStack Form + Zod) → `signInWithPassword`, états loading/succès/erreur, `sonner` pour le feedback, redirection vers `redirect`.
- **App shell** : `AppHeader` (logo, nav placeholder Recherche/Arbre, `UserMenu` avec avatar + badge rôle + déconnexion, `ThemeToggle`).
- **Rôle** : `useAuth()` expose `role` pour conditionner la UI (nav admin/modérateur) — gardes `requireRole` prêtes mais peu utilisées en P3.

---

## 6. Direction design (skill ui-ux-pro-max → concret)

- **Palette** : conservée (`--sea-ink`, `--lagoon`, `--palm`, `--sand`, `--foam`) — le skill n'a pas de match teal/botanique dans sa base couleurs, on garde la palette existante (plus juste pour un arbre familial).
- **Typo** : Fraunces (display serif) + Manrope (sans) — validé par le skill pour « organique/héritage ».
- **Style** : minimalisme aéré (espace généreux, hiérarchie h1→h3) **+** accents glassmorphism existants.
- **Motion** : stagger léger (300–450ms), `prefers-reduced-motion` respecté, transitions 150–300ms.
- **Règles UX appliquées** : erreurs inline + `aria-live`, focus visible, contrastes ≥ 4.5:1, zones ≥ 44px, labels visibles, skeleton pendant le chargement (pas de flash de contenu protégé), icônes **Lucide** (jamais d'emoji).
- **Shadcn à ajouter** : `card`, `badge`, `avatar`, `dropdown-menu`, `separator`, `skeleton`, `sonner`, `alert` (+ optionnel `tooltip`, `sheet`).
- Pendant l'implémentation, relancer le skill **page par page** (`--design-system` + `--domain ux/icons`) pour générer chaque écran.

---

## 7. Vercel (préparation, pas déploiement)

- Preset Nitro `vercel` à configurer (noté pour la Phase 9).
- Env vars Vercel = mêmes noms que `.env` (`VITE_SUPABASE_*` + `SUPABASE_*`).
- Rappel : `supabase link` + `db push` + URLs Vercel dans `site_url`/`additional_redirect_urls` avant tout déploiement.

---

## 8. Vérifications

- `npm run generate-routes`, `npm run lint`, `npm run build`.
- Test manuel `npm run dev` (comptes seed : `admin@efankatia.local`/`Admin123!`, `moderateur@efankatia.local`/`Modo123!`, `user@efankatia.local`/`User123!`) :
  - non-connecté → `/login`
  - session persistante au refresh
  - badge rôle correct
  - déconnexion
  - dark mode
  - responsive 375/768/1024/1440px

---

## 9. Hors périmètre P3

- CRUD personnes (P5/P6), recherche (P7), arbre interactif (P8), imgbb (P4), signup/reset/OAuth.
- Nav = placeholders vers les routes futures.
