# Structure de base de données généalogique - Supabase

## Principe général

La base doit éviter de dupliquer une même personne. Une personne est enregistrée une seule fois dans la table `personnes`. Les relations familiales sont ensuite gérées par des tables séparées :

- `personnes` : informations sur les personnes (avec le champ `estLigneeGenerale`)
- `mariages` : unions entre deux personnes
- `parent_enfants` : relations parent/enfant
- `mariage_enfants` : enfants issus d'un mariage précis
- `profiles` : profil applicatif lié à `auth.users` (rôle, lignée assignée, audit)
- `audit_logs` : journal optionnel de toutes les modifications

## Table profiles (utilisateurs)

L'authentification est gérée par Supabase Auth : identifiants, email et mot de passe vivent dans `auth.users` (table système, à ne pas modifier). Les données applicatives (rôle, lignée assignée, audit) vivent dans `profiles`, liée en `1:1` à `auth.users(id)`.

    CREATE TYPE user_role AS ENUM ('ROLE_ADMIN', 'ROLE_MODERATEUR', 'ROLE_USER');

    CREATE TABLE profiles (
        id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        email        text,
        role         user_role NOT NULL DEFAULT 'ROLE_USER',
        personne_id  uuid REFERENCES personnes(id) ON DELETE SET NULL,
        created_at   timestamptz NOT NULL DEFAULT now(),
        updated_at   timestamptz NOT NULL DEFAULT now(),
        user_created uuid REFERENCES auth.users(id) ON DELETE SET NULL,
        user_edited  uuid REFERENCES auth.users(id) ON DELETE SET NULL
    );

- `role` : `ROLE_ADMIN`, `ROLE_MODERATEUR` ou `ROLE_USER` (par défaut `ROLE_USER`).
- `personne_id` : renseigné uniquement pour un `ROLE_MODERATEUR`, désigne la personne dont la lignée lui est assignée (nullable).
- `auth.users` possède déjà `created_at` et `updated_at` en natif ; on les duplique sur `profiles` uniquement pour l'audit applicatif (qui a créé/modifié le profil).

## Table personnes

Cette table contient toutes les personnes. Une personne ne doit exister qu'une seule fois.

    CREATE TABLE personnes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        nom text,
        prenom text,
        appellation text,
        numero text,
        nom_facebook text,
        sexe text,
        profession text,
        date_naissance date,
        date_deces date,
        pays text,
        ville text,
        quartier text,
        urlImg text,
        urlImgThumb text,
        "estLigneeGenerale" boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        user_created uuid REFERENCES auth.users(id) ON DELETE SET NULL,
        user_edited uuid REFERENCES auth.users(id) ON DELETE SET NULL
    );

**Photo** : `urlImg` stocke l'URL publique de la photo de profil (plein format) et `urlImgThumb` sa miniature, toutes deux hébergées via l'API **imgbb** (voir Phase 4). Nullables : une personne peut ne pas avoir de photo (l'UI affiche alors la première lettre de l'appellation en majuscule).

**Champs d'audit** : `created_at` / `user_created` sont renseignés à la création de la personne, et `updated_at` / `user_edited` à chaque modification. `user_created` et `user_edited` référencent l'utilisateur authentifié (`auth.users.id`) ayant effectué l'action.

**Anti-doublon** : la règle est appliquée à deux niveaux — RPC `check_personne_doublon` pour le feedback applicatif, et trigger `personnes_guard_doublon` (`BEFORE INSERT OR UPDATE OF nom, prenom, date_naissance`) pour la garantie en base. La comparaison ignore casse et accents grâce à l'extension `unaccent`. Voir `docs/decision technique/phase5-personnes.md`.

Exemple :

- `P1` = Jean (`estLigneeGenerale = true`)
- `P2` = Marie (`estLigneeGenerale = true`)
- `P3` = Claire (`estLigneeGenerale = false`)

## Table mariages

Cette table représente une union entre deux personnes. Une même personne peut avoir plusieurs mariages.

    CREATE TABLE mariages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        personne_1_id uuid NOT NULL REFERENCES personnes(id) ON DELETE RESTRICT,
        personne_2_id uuid NOT NULL REFERENCES personnes(id) ON DELETE RESTRICT,
        date_mariage date,
        date_fin date,
        type_fin text,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT mariages_no_self CHECK (personne_1_id <> personne_2_id)
    );

Exemple :

- `M1` = Jean + Marie
- `M2` = Jean + Claire

Jean existe une seule fois dans `personnes`, mais peut être référencé dans plusieurs mariages.

## Table parent_enfants

Cette table représente la relation entre un parent et son enfant.

    CREATE TABLE parent_enfants (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        parent_id uuid NOT NULL REFERENCES personnes(id) ON DELETE RESTRICT,
        enfant_id uuid NOT NULL REFERENCES personnes(id) ON DELETE RESTRICT,
        type_parent text,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT parent_enfants_parent_enfant_key UNIQUE (parent_id, enfant_id),
        CONSTRAINT parent_enfants_no_self CHECK (parent_id <> enfant_id)
    );

Exemple :

- Jean → Paul
- Marie → Paul

Paul existe une seule fois dans `personnes`. Cette table permet également de gérer un enfant dont un seul parent est connu.

## Table mariage_enfants

Cette table permet de savoir de quel mariage est issu un enfant.

    CREATE TABLE mariage_enfants (
        mariage_id uuid NOT NULL REFERENCES mariages(id) ON DELETE CASCADE,
        enfant_id uuid NOT NULL REFERENCES personnes(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (mariage_id, enfant_id)
    );

Exemple :

- `M1` = Jean + Marie
  - `M1` → Paul
  - `M1` → Jeanne
- `M2` = Jean + Claire
  - `M2` → Marc

## Exemple complet

Famille :
Jean ───── Marie
├── Paul
└── Jeanne

Jean ───── Claire
└── Marc

Dans `personnes` :

- `P1` = Jean
- `P2` = Marie
- `P3` = Claire
- `P4` = Paul
- `P5` = Jeanne
- `P6` = Marc

Dans `mariages` :

- `M1` = P1 + P2
- `M2` = P1 + P3

Dans `parent_enfants` :

- P1 → P4
- P2 → P4
- P1 → P5
- P2 → P5
- P1 → P6
- P3 → P6

Dans `mariage_enfants` :

- M1 → P4
- M1 → P5
- M2 → P6

## Rôle des relations

`parent_enfants` répond à la question : "Qui sont les parents de cet enfant ?"
`mariage_enfants` répond à la question : "De quelle union est issu cet enfant ?"

Les deux relations sont différentes. Cela permet de gérer plusieurs mariages, divorces, veuvages, familles recomposées, enfants hors mariage, enfants avec un seul parent connu et adoption.

## Sécurité (RLS) et création

- **RLS activée** sur toutes les tables applicatives. La lecture est ouverte à tout utilisateur authentifié ; l'écriture dépend du rôle (`is_admin`, `is_moderator`, `is_in_lignee`).
- **Aucune policy `INSERT` sur `personnes`** : la création passe exclusivement par les RPC `SECURITY DEFINER` `create_personne_root`, `create_personne_par_mariage`, `create_personne_par_naissance_mariage` et `create_personne_par_naissance_parent`. Elles vérifient le rôle et la lignée de façon atomique, avec le rattachement dans les tables de liaison.
- **Suppression** : `personnes` et `mariages` sont en `RESTRICT` côté clés étrangères ; le code devra délier explicitement (ou supprimer les liens) avant de supprimer une personne (voir P6.4).
- Détail des policies et helpers : `supabase/migrations/*_auth_helpers.sql`, `*_lignee_helper.sql`, `*_enable_rls_and_policies.sql`, et `docs/Decisions Techniques.md`.

## Audit et traçabilité

Les champs `created_at`, `updated_at`, `user_created` et `user_edited` (sur `personnes` et `profiles`) sont renseignés automatiquement par des triggers PostgreSQL, sans intervention du code applicatif.

**Horodatage automatique (`updated_at`)** — extension `moddatetime` :

    CREATE EXTENSION IF NOT EXISTS moddatetime;

    CREATE TRIGGER personnes_set_updated_at
        BEFORE UPDATE ON personnes
        FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

    CREATE TRIGGER profiles_set_updated_at
        BEFORE UPDATE ON profiles
        FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

**Auteur (`user_created` / `user_edited`)** — via `auth.uid()` :

    CREATE OR REPLACE FUNCTION set_audit_user()
    RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
    BEGIN
        IF TG_OP = 'INSERT' THEN
            NEW.user_created := auth.uid();
        ELSIF TG_OP = 'UPDATE' THEN
            NEW.user_edited := auth.uid();
        END IF;
        RETURN NEW;
    END;
    $$;

    CREATE TRIGGER personnes_audit_user
        BEFORE INSERT OR UPDATE ON personnes
        FOR EACH ROW EXECUTE FUNCTION set_audit_user();

    CREATE TRIGGER profiles_audit_user
        BEFORE INSERT OR UPDATE ON profiles
        FOR EACH ROW EXECUTE FUNCTION set_audit_user();

`auth.uid()` renvoie l'utilisateur authentifié porté par le JWT de la requête : le trigger enregistre automatiquement qui a créé ou modifié la ligne.

**Historique complet (optionnel)** — table `audit_logs` :

    CREATE TABLE audit_logs (
        id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        table_name text NOT NULL,
        record_id  uuid,
        action     text NOT NULL,
        old_data   jsonb,
        new_data   jsonb,
        user_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
        changed_at timestamptz NOT NULL DEFAULT now()
    );

## Résumé

AUTH.USERS ── `1:1` ── PROFILES ── `0..1:1` ── PERSONNES (personne_id)
PERSONNES
├── `1:N` ── MARIAGES
│ └── `N:N` ── MARIAGE_ENFANTS
└── `N:N` ── PARENT_ENFANTS

Règle principale : une personne ne doit jamais être dupliquée simplement parce qu'elle a plusieurs mariages ou plusieurs relations familiales.

Règles de suppression : `RESTRICT` sur les liens de parenté et d'union (`mariages`, `parent_enfants`), `CASCADE` sur `mariage_enfants` et `profiles.id`, `SET NULL` sur les références d'audit et `profiles.personne_id`.
