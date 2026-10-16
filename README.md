# eFankatia

Application web d'**arbre généalogique familial** : retracer l'histoire de la famille et explorer l'arbre de manière interactive, fluide et moderne.

## Stack

- **Frontend / routage / état** : [TanStack Start](https://tanstack.com/start) (React 19, Vite 8) + [TanStack Router](https://tanstack.com/router) (file-based) + [TanStack Query](https://tanstack.com/query)
- **Base de données & auth** : [Supabase](https://supabase.com/) (PostgreSQL, Auth, RLS) — clients `@supabase/supabase-js` + `@supabase/ssr` (session en cookies httpOnly), gérée via la **Supabase CLI**
- **Formulaires** : [TanStack Form](https://tanstack.com/form) + [Zod](https://zod.dev/)
- **Styles** : [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) (style `new-york`, base `zinc`)
- **Médias** : API [imgbb](https://api.imgbb.com/) pour les photos de profil

## Prérequis

- **Node.js** (>= 20) et **npm**
- **Docker** (Docker Desktop ou Docker Engine) — requis pour `supabase start`
- **Supabase CLI** — installée en `devDependency` (`supabase`), utilisée via `npx supabase`

## Première installation (nouveau poste)

```bash
# 1. Dépendances Node
npm install

# 2. Démarrer Docker (Docker Desktop, ou `systemctl start docker` sur Linux)

# 3. S'authentifier à la Supabase CLI (votre compte)
npx supabase login

# 4. Démarrer la base locale (Postgres + Studio) — télécharge les images au 1er lancement
npx supabase start

# 5. Lier le dossier à un projet cloud Supabase
#    (demande le mot de passe DB du projet)
npx supabase link --project-ref <project-ref>

# 6. Appliquer les migrations + seed en local (crée les comptes de démo)
npx supabase db reset

# 7. Configurer l'environnement (voir section « Authentification & environnement »)
cp .env.example .env
#    puis renseigner VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY via `npx supabase status`
```

> **`<project-ref>`** est propre à chaque projet/équipe : il se lit dans l'URL du dashboard
> `https://supabase.com/dashboard/project/<project-ref>`. Chaque développeur peut utiliser **son propre**
> projet Supabase (compte personnel, ou invité dans l'organisation de l'équipe) : le schéma étant versionné
> dans `supabase/migrations/`, `db reset` / `db push` reproduisent la même base pour tous.
>
> En CI (sans navigateur), remplacer `login` par la variable d'environnement `SUPABASE_ACCESS_TOKEN`.

## Développement

```bash
npm run dev               # serveur de dev → http://localhost:3003
npm run generate-routes   # régénère src/routeTree.gen.ts
npm run build             # build de production
npm run lint              # ESLint
npm run check             # Prettier --check .
npm run format            # Prettier + ESLint --fix (formatage auto)
```

## Base de données (Supabase)

Le schéma est versionné dans `supabase/migrations/`. **Ne jamais modifier le schéma à la main** : passer par des migrations (`supabase migration new` puis `supabase db push`).

### Services locaux (après `supabase start`)

| Service | URL |
|---|---|
| Supabase Studio | http://localhost:54323 |
| API (PostgREST) | http://localhost:54321 |
| Base PostgreSQL | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| SMTP (test emails) | http://localhost:54324 |

### Commandes utiles

```bash
npx supabase start                 # démarrer la stack locale
npx supabase stop                  # arrêter la stack locale
npx supabase status                # état et URLs locales
npx supabase migration new <nom>   # créer une migration vide (fichier horodaté)
npx supabase db reset              # rejoue toutes les migrations en local
npx supabase db push               # pousse les migrations vers le cloud
npx supabase migration list        # cohérence local vs cloud
```

### Générer les types TypeScript

```bash
# depuis la base locale (recommandé — pas besoin de `supabase link`)
npx supabase gen types typescript --local > src/lib/supabase/database.types.ts

# ou depuis le projet cloud lié
npx supabase gen types typescript --linked > src/lib/supabase/database.types.ts
```

## Authentification & environnement

L'auth repose sur **Supabase Auth** + **`@supabase/ssr`** : la session est stockée dans des cookies httpOnly et lue côté serveur (`src/lib/auth/session.ts`), puis injectée dans le contexte du routeur et exposée via `useAuth()` (`src/lib/auth/auth-context.tsx`).

### Variables d'environnement

| Variable | Description | Où la trouver |
|---|---|---|
| `VITE_SUPABASE_URL` | URL de l'API Supabase | `npx supabase status` → **`Project URL`** (local), ou dashboard → *Project Settings → API → Project URL* (cloud) |
| `VITE_SUPABASE_ANON_KEY` | Clé publique | `npx supabase status` → **`Publishable`** (anciennement `anon`) (local), ou dashboard → *Project Settings → API → publishable/anon* (cloud) |

```bash
cp .env.example .env   # puis renseigner les 2 variables
```

> Les **mêmes** variables sont utilisées côté client (`import.meta.env`) et serveur (`process.env`). C'est une clé **publique** : ne jamais exposer la clé **`Secret`** (anciennement `SERVICE_ROLE_KEY`).

### Comptes de démo (seed local)

| Email | Mot de passe | Rôle |
|---|---|---|
| `admin@efankatia.local` | `Admin123!` | `ROLE_ADMIN` |
| `moderateur@efankatia.local` | `Modo123!` | `ROLE_MODERATEUR` |
| `user@efankatia.local` | `User123!` | `ROLE_USER` |

## Routage

TanStack Router en mode file-based : les routes sont des fichiers dans `src/routes/`. Après tout ajout/suppression/renommage, lancer `npm run generate-routes` (`src/routeTree.gen.ts` est généré automatiquement, ne pas l'éditer). Le layout global vit dans `src/routes/__root.tsx`.

Structure actuelle :

| Route | Fichier | Rôle |
|---|---|---|
| `/` | `src/routes/index.tsx` | Redirige vers `/app` (connecté) ou `/login`. |
| `/login` | `src/routes/login.tsx` | Connexion (publique). |
| `/app` | `src/routes/app.tsx` | Layout **protégé** : exige une session, sinon redirige vers `/login`. |
| `/app/` | `src/routes/app/index.tsx` | Accueil connecté. |

## Styling

Tailwind CSS v4 avec une config CSS-first dans `src/styles.css` (pas de `tailwind.config.js`). Les composants shadcn/ui s'ajoutent via :

```bash
pnpm dlx shadcn@latest add <component>
```
