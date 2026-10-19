# Décisions Techniques — eFankatia

Registre central des choix de conception du projet. Le détail par phase est
conservé dans `docs/decision technique/` ; ce document sert d'index et résume
les règles transverses à respecter dans le code et les migrations.

## Index par phase

| Phase                      | Document de détail                                                                                 | Statut      | Sujets principaux                                                                         |
| -------------------------- | -------------------------------------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------- |
| P1 — Base de données       | [`decision technique/phase1-db.md`](decision%20technique/phase1-db.md)                             | ✅ terminée | Règles `ON DELETE`, contraintes, outillage Supabase CLI                                   |
| P2 — Auth, rôles et RLS    | _(décisions dans les migrations `*_auth_helpers`, `*_lignee_helper`, `*_enable_rls_and_policies`)_ | ✅ terminée | Politiques RLS, helpers `is_admin` / `is_moderator` / `is_in_lignee`, création via RPC    |
| P3 — Frontend TanStack     | [`decision technique/phase3-frontend.md`](decision%20technique/phase3-frontend.md)                 | ✅ terminée | Auth SSR par cookies, protection des routes, env, formulaires, UI                         |
| P4 — Photos imgbb          | [`decision technique/phase4-imgbb.md`](decision%20technique/phase4-imgbb.md)                       | ✅ terminée | Upload serveur, `urlImg` / `urlImgThumb`, script de test                                  |
| P5 — Création de personnes | [`decision technique/phase5-personnes.md`](decision%20technique/phase5-personnes.md)               | ✅ terminée | Formulaire, rattachements, anti-doublon, RPC de candidats                                 |
| P6 — Fiche et actions      | [`decision technique/phase6-personnes.md`](decision%20technique/phase6-personnes.md)               | ✅ terminée | `get_personne_fiche`, modification, suppression transactionnelle, unions, actions rapides |
| P7 — Recherche             | [`decision technique/phase7-recherche.md`](decision%20technique/phase7-recherche.md)               | ✅ terminée | `search_personnes`, `pg_trgm`, `immutable_unaccent`, pagination, état d'URL               |
| P8 → P9                    | [`toList.md`](toList.md)                                                                           | ⏳ à venir  | Arbre interactif, tests et déploiement                                                    |

## Règles de suppression (clés étrangères)

| Relation                                                 | Règle                | Justification                                                                                                                       |
| -------------------------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `mariages.personne_1_id` / `personne_2_id` → `personnes` | `ON DELETE RESTRICT` | Protège l'arbre d'une suppression en cascade accidentelle : l'app doit délier explicitement avant de supprimer une personne (P6.4). |
| `parent_enfants.parent_id` / `enfant_id` → `personnes`   | `ON DELETE RESTRICT` | Idem.                                                                                                                               |
| `profiles.id` → `auth.users(id)`                         | `ON DELETE CASCADE`  | Suppression du compte auth → suppression du profil.                                                                                 |
| `mariage_enfants.mariage_id` → `mariages`                | `ON DELETE CASCADE`  | Suppression du mariage → suppression de ses liens enfants.                                                                          |
| `mariage_enfants.enfant_id` → `personnes`                | `ON DELETE CASCADE`  | Suppression de l'enfant → suppression du lien.                                                                                      |
| `profiles.personne_id` → `personnes`                     | `ON DELETE SET NULL` | Désassigne la lignée au lieu de bloquer la suppression.                                                                             |
| `user_created` / `user_edited` (audit) → `auth.users`    | `ON DELETE SET NULL` | Historique conservé, suppression de compte non bloquante.                                                                           |
| `audit_logs.user_id` → `auth.users`                      | `ON DELETE SET NULL` | Idem.                                                                                                                               |

> ⚠️ La règle générale n'est **pas** « tout en cascade » : les liens de parenté
> et d'union sont volontairement en `RESTRICT`.
>
> Depuis la P6, le déliement explicite est centralisé dans la RPC
> transactionnelle `delete_personne` (voir `decision technique/phase6-personnes.md`).

## Règles métier structurantes

- **Une personne ne doit jamais être dupliquée.** Une personne est enregistrée
  une seule fois dans `personnes` ; les unions et la parenté passent par les
  tables de liaison.
- **Anti-doublon** : contrôle applicatif (`check_personne_doublon`) **et**
  défense en profondeur en base (trigger `personnes_guard_doublon`, erreur
  `23505`). La comparaison ignore casse et accents (`unaccent`).
- **Création de personne** : aucune policy `INSERT` sur `personnes`. La création
  passe exclusivement par les RPC `SECURITY DEFINER` (`create_personne_*`), qui
  vérifient rôle et lignée de façon atomique.
- **Lignée** : `is_in_lignee(personne_id)` reste la source de vérité pour
  restreindre un `ROLE_MODERATEUR` ; les listes de candidats sont filtrées côté
  base (`search_personnes_candidats`, `search_mariages_candidats`).
- **`estLigneeGenerale`** : colonne en camelCase, toujours **guillemetée**
  (`"estLigneeGenerale"`) dans le SQL — sinon PostgreSQL la plie en
  `estligneegenerale`.

## Authentification et sécurité

- **Auth SSR** avec `@supabase/ssr` : session en cookies httpOnly, lue via
  `getSession()` (`createServerFn`) et injectée dans le contexte du routeur.
- **`useAuth()`** (`src/lib/auth/auth-context.tsx`) expose
  `{ user, profile, role, isAuthenticated, isAdmin, isModerator }`.
- **Routes protégées** : `/app` redirige vers `/login?redirect=<path>` si non
  authentifié ; `/login` redirige vers `/app` si déjà connecté.
- **Clé `IMGBB_APIKEY`** : serveur uniquement (pas de préfixe `VITE_`). Les
  photos transitent par une server function qui vérifie session + rôle.
- **RLS activée** sur toutes les tables applicatives ; les policies sont
  additives et dépendent des helpers `is_admin` / `is_moderator` /
  `is_in_lignee`.

## Conventions & workflow

- **Supabase CLI** via `npx supabase` (devDependency, pas d'installation
  globale). Schéma versionné dans `supabase/migrations/` : ne jamais modifier la
  base à la main.
- **Workflow** : développement local d'abord (`supabase start` /
  `supabase db reset`), `supabase db push` différé.
- **Project-ref cloud** non committé : `supabase/.temp/` (gitignoré), chaque
  développeur fait son propre `supabase link`.
- **Types générés** :
  `npx supabase gen types typescript --local > src/lib/supabase/database.types.ts`.
- **Environnement** : noms identiques client/serveur
  (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) ; `.env` gitignoré,
  `.env.example` committé.
- **Frontend** : TanStack Start + Router (file-based) + Query ; TanStack Form +
  Zod ; Tailwind v4 CSS-first ; shadcn/ui (`new-york`, base `zinc`) ; thème
  « lagon ».
- **Style** : Prettier `semi: false`, `singleQuote: true`, `trailingComma: all`.
- **Validation** : pas de script de test/typecheck — vérifier via `npm run lint`
  et `npm run build`. Ne pas créer de test sans accord explicite.
