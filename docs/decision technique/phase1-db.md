# Décisions Techniques — Phase 1 (Base de données)

Registre des choix de conception pris pendant la Phase 1 (Supabase CLI). Objectif : garder la trace des décisions qui impactent les phases suivantes (RLS en P2, suppression en P6.4, etc.).

## Règles de suppression (clés étrangères)

| Relation | Règle | Justification |
|---|---|---|
| `mariages.personne_1_id` / `personne_2_id` → `personnes` | `ON DELETE RESTRICT` | Protège l'arbre d'une suppression en cascade accidentelle. L'app devra délier explicitement avant de supprimer une personne (voir P6.4). |
| `parent_enfants.parent_id` / `enfant_id` → `personnes` | `ON DELETE RESTRICT` | Idem. |
| `profiles.id` → `auth.users(id)` | `ON DELETE CASCADE` | Suppression du compte auth → suppression du profil. |
| `mariage_enfants.mariage_id` → `mariages` | `ON DELETE CASCADE` | Suppression du mariage → suppression de ses liens enfants. |
| `mariage_enfants.enfant_id` → `personnes` | `ON DELETE CASCADE` | Suppression de l'enfant → suppression du lien. |
| `profiles.personne_id` → `personnes` | `ON DELETE SET NULL` | Désassigne la lignée au lieu de bloquer la suppression. |
| `user_created` / `user_edited` (audit) → `auth.users` | `ON DELETE SET NULL` | Historique conservé, suppression de compte non bloquante. |
| `audit_logs.user_id` → `auth.users` | `ON DELETE SET NULL` | Idem. |

## Schéma & contraintes

- **`estLigneeGenerale`** : colonne en camelCase **guillemetée** (`"estLigneeGenerale"`). Sans guillemets, PostgreSQL la plierait en `estligneegenerale`.
- **Contraintes de garde ajoutées** (absentes du doc initial, sûres) :
  - `mariages_no_self` : `personne_1_id <> personne_2_id`.
  - `parent_enfants_no_self` : `parent_id <> enfant_id`.
- **RLS** : volontairement **déférée à la Phase 2** (aucune politique d'accès en Phase 1).

## Outillage & workflow

- **Supabase CLI** utilisée via `npx supabase` (devDependency `supabase@^2.121.0`, pas d'installation globale).
- **Project-ref cloud** non committé : il vit dans `supabase/.temp/` (gitignoré). Chaque développeur effectue son propre `supabase link --project-ref <project-ref>`.
- **Workflow** : développement **local d'abord** (`supabase start` / `supabase db reset`), `supabase db push` **différé** (choix de l'utilisateur).
- **`supabase/seed.sql`** : placeholder créé (le seed est activé dans `config.toml`).
