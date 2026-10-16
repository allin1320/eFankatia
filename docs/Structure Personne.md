# Structure de base de données généalogique - Supabase[cite: 1]

## Principe général
La base doit éviter de dupliquer une même personne. Une personne est enregistrée une seule fois dans la table `personnes`[cite: 1]. Les relations familiales sont ensuite gérées par des tables séparées :
* `personnes` : informations sur les personnes (avec le champ `estLigneeGenerale`)[cite: 1]
* `mariages` : unions entre deux personnes[cite: 1]
* `parent_enfants` : relations parent/enfant[cite: 1]
* `mariage_enfants` : enfants issus d'un mariage précis[cite: 1]

## Table personnes
Cette table contient toutes les personnes[cite: 1]. Une personne ne doit exister qu'une seule fois[cite: 1].

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
        estLigneeGenerale boolean DEFAULT true,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        user_created uuid REFERENCES auth.users(id),
        user_edited uuid REFERENCES auth.users(id)
    );

**Champs d'audit** : `created_at` / `user_created` sont renseignés à la création de la personne, et `updated_at` / `user_edited` à chaque modification. `user_created` et `user_edited` référencent l'utilisateur authentifié (`auth.users.id`) ayant effectué l'action.

Exemple :
* `P1` = Jean (`estLigneeGenerale = true`)
* `P2` = Marie (`estLigneeGenerale = true`)
* `P3` = Claire (`estLigneeGenerale = false`)

## Table mariages
Cette table représente une union entre deux personnes[cite: 1]. Une même personne peut avoir plusieurs mariages[cite: 1].

    CREATE TABLE mariages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        personne_1_id uuid NOT NULL REFERENCES personnes(id),
        personne_2_id uuid NOT NULL REFERENCES personnes(id),
        date_mariage date,
        date_fin date,
        type_fin text,
        created_at timestamptz DEFAULT now()
    );

Exemple :
* `M1` = Jean + Marie
* `M2` = Jean + Claire

Jean existe une seule fois dans `personnes`, mais peut être référencé dans plusieurs mariages[cite: 1].

## Table parent_enfants
Cette table représente la relation entre un parent et son enfant[cite: 1].

    CREATE TABLE parent_enfants (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        parent_id uuid NOT NULL REFERENCES personnes(id),
        enfant_id uuid NOT NULL REFERENCES personnes(id),
        type_parent text,
        created_at timestamptz DEFAULT now(),
        UNIQUE(parent_id, enfant_id)
    );

Exemple :
* Jean → Paul
* Marie → Paul

Paul existe une seule fois dans `personnes`[cite: 1]. Cette table permet également de gérer un enfant dont un seul parent est connu[cite: 1].

## Table mariage_enfants
Cette table permet de savoir de quel mariage est issu un enfant[cite: 1].

    CREATE TABLE mariage_enfants (
        mariage_id uuid NOT NULL REFERENCES mariages(id) ON DELETE CASCADE,
        enfant_id uuid NOT NULL REFERENCES personnes(id) ON DELETE CASCADE,
        created_at timestamptz DEFAULT now(),
        PRIMARY KEY (mariage_id, enfant_id)
    );

Exemple :
* `M1` = Jean + Marie
  * `M1` → Paul
  * `M1` → Jeanne
* `M2` = Jean + Claire
  * `M2` → Marc

## Exemple complet
Famille :
Jean ───── Marie
├── Paul
└── Jeanne

Jean ───── Claire
└── Marc

Dans `personnes` :
* `P1` = Jean
* `P2` = Marie
* `P3` = Claire
* `P4` = Paul
* `P5` = Jeanne
* `P6` = Marc

Dans `mariages` :
* `M1` = P1 + P2
* `M2` = P1 + P3

Dans `parent_enfants` :
* P1 → P4
* P2 → P4
* P1 → P5
* P2 → P5
* P1 → P6
* P3 → P6

Dans `mariage_enfants` :
* M1 → P4
* M1 → P5
* M2 → P6

## Rôle des relations
`parent_enfants` répond à la question : "Qui sont les parents de cet enfant ?"[cite: 1]
`mariage_enfants` répond à la question : "De quelle union est issu cet enfant ?"[cite: 1]

Les deux relations sont différentes[cite: 1]. Cela permet de gérer plusieurs mariages, divorces, veuvages, familles recomposées, enfants hors mariage, enfants avec un seul parent connu et adoption[cite: 1].

## Résumé
PERSONNES
├── `1:N` ── MARIAGES
│   └── `N:N` ── MARIAGE_ENFANTS
└── `N:N` ── PARENT_ENFANTS

Règle principale : une personne ne doit jamais être dupliquée simplement parce qu'elle a plusieurs mariages ou plusieurs relations familiales[cite: 1].
