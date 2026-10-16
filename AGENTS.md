# AGENTS.md

Guide compact pour les agents travaillant sur **eFankatia** (application web d'arbre généalogique familial).

## Positionnement

- Tu es un agent **SENIOR en FULL STACK** : tout code écrit doit suivre les bonnes pratiques (typage strict, gestion d'erreurs, séparation des responsabilités, accessibilité, sécurité, performance).

## À lire en premier (obligatoire)

- Toujours lire `docs/Description Projet.md` en début de session : description globale du projet (objectif, stack, RBAC, fonctionnalités).
- Autres docs dans `docs/` :
  - `docs/Structure Personne.md` — modèle de données Supabase (4 tables + règle métier clé : une personne ne doit jamais être dupliquée).
  - `docs/Decisions Techniques.md` — registre des décisions de conception (règles de suppression FK, conventions, workflow).
  - `docs/toList.md` — plan de développement par phases.

## Git

- **Ne jamais exécuter `git commit` ni `git push`** : l'utilisateur le fait manuellement.
- Les autres commandes git (`git diff`, `git status`, `git log`, etc.) sont autorisées.

## Stack

- **TanStack Start** (React 19, Vite 8) + **TanStack Router** (file-based) + **TanStack Query**.
- **Tailwind CSS v4** : config CSS-first dans `src/styles.css`, **pas de `tailwind.config.js`**.
- **shadcn/ui** : style `new-york`, base `zinc`, variables CSS, icônes `lucide`.
- **Supabase** (PostgreSQL, Auth, RLS) : la base se gère via la **Supabase CLI** — migrations (`supabase migration new` / `supabase db push`) et types générés (`supabase gen types typescript`). Ne pas éditer le schéma à la main.
- **Supabase** et **imgbb** (photos) : le schéma est versionné dans `supabase/migrations/` (voir `README.md`). Le **client Supabase** et les `.env` ne sont **pas encore câblés** dans le code. Ne pas supposer qu'un client Supabase existe.

## Commandes

```bash
npm run dev               # serveur de dev sur http://localhost:3003
npm run generate-routes   # régénère src/routeTree.gen.ts
npm run build             # build de production
npm run lint              # ESLint
npm run check             # prettier --check .
npm run format            # Prettier + ESLint --fix (formatage auto)
```

Il n'y a **pas de script de test ni de typecheck** (`tsc` a `noEmit: true`). Vérifier via `lint` + `build`.

## Routing (pièges)

- Routes = fichiers dans `src/routes/` (file-based).
- `src/routeTree.gen.ts` est **généré automatiquement** : ne pas l'éditer à la main. Après ajout/suppression/renommage de route, lancer `npm run generate-routes`.
- Le layout global vit dans `src/routes/__root.tsx`.

## Imports & conventions

- Alias `#/*` et `@/*` → `src/*` (dans `tsconfig.json` et `vite.config.ts`) ; shadcn utilise `#/`.
- Prettier : `semi: false`, `singleQuote: true`, `trailingComma: all`.
- ESLint : config `@tanstack/eslint-config` avec plusieurs règles désactivées (import/order, sort-imports, etc.).
- Gestionnaire de paquets : **npm** (`package-lock.json`). Les composants shadcn s'ajoutent via `pnpm dlx shadcn@latest add <component>` (cf. `.cursorrules`).

## Domaine (résumé)

- 3 rôles : `ROLE_ADMIN` (accès total, seul à créer des personnes sans rattachement), `ROLE_MODERATEUR` (écriture limitée à sa lignée), `ROLE_USER` (lecture seule).
- 4 tables : `personnes`, `mariages`, `parent_enfants`, `mariage_enfants`.
