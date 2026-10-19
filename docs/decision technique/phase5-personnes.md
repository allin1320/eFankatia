# Décisions Techniques — Phase 5 (Création et saisie de personnes)

Registre des choix de conception pris pendant la Phase 5. Objectif : garder la
trace des décisions qui impactent les phases suivantes (P6 fiche/actions, P7
recherche, P8 arbre, P9 déploiement).

## Parcours et UI

- **Formulaire mono-page en 3 sections numérotées** (01 Identité + photo,
  02 Origines & localisation, 03 Rattachement) avec **aperçu live** (sticky sur
  desktop, compact sur mobile). Pas de wizard : moins de friction pour la saisie
  répétée, la divulgation progressive se limite aux champs conditionnels.
- **Thème « lagon » conservé** (Fraunces + Manrope, surfaces « island »).
  Ajout d'une variante de bouton `brand` (`--sea-ink` / `--foam`, hover `--palm`)
  réutilisable par les phases suivantes.
- **Champs obligatoires** : nom, prénom, appellation, sexe.
- `numero` = **téléphone** (`inputMode="tel"`, `autoComplete="tel"`).
- `sexe` stocké `'M'` / `'F'`.
- `type_parent` stocké `'pere'` / `'mere'` / `'parent'`, déduit du sexe du
  parent sélectionné.
- **Écran de succès sur place** après création (la fiche détaillée arrive en
  Phase 6) avec actions « Créer une autre personne » / « Retour à l'accueil ».
- Modes de rattachement : **alliance** (nouvelle union avec un conjoint
  existant), **naissance par mariage**, **naissance parent unique**, **ancêtre
  racine** (admin uniquement).

## Règles métier

- **Une personne ne doit jamais être dupliquée.** Blocage strict si nom +
  prénom identiques (insensible casse/accents) ET (dates de naissance égales OU
  au moins une absente). Renseigner une **date de naissance différente** débloque
  un homonyme légitime.
  - Détection applicative : RPC `check_personne_doublon` (feedback live + contrôle
    bloquant avant le submit).
  - Défense en profondeur : trigger `personnes_guard_doublon`
    (`BEFORE INSERT OR UPDATE OF nom, prenom, date_naissance`), erreur `23505`.
  - L'extension `unaccent` est activée (schéma `extensions`) pour comparer les
    noms sans tenir compte des accents.
- **Mode alliance** : sélectionne une personne conjointe existante et crée une
  **nouvelle** union (`create_personne_par_mariage`). Le rattachement à une union
  déjà existante (conjoint manquant) relève de la Phase 6.
- **Filtrage de lignée côté base** : les listes de candidats passent par
  `search_personnes_candidats` / `search_mariages_candidats`, qui appliquent le
  rôle et `is_in_lignee`. Évite de proposer des choix que la RPC refuserait.

## Backend

- Migration `phase5_candidats_doublons_index` :
  - `unaccent` (extensions) ;
  - index de soutien (`mariages.personne_1_id`, `mariages.personne_2_id`,
    `parent_enfants.enfant_id`) ;
  - RPC de recherche `search_personnes_candidats`, `search_mariages_candidats` ;
  - `check_personne_doublon` + trigger `personnes_guard_doublon` ;
  - `revoke execute` sur `anon` / `public`, `grant execute` sur `authenticated`
    et `service_role`.

## Frontend

- **TanStack Form + Zod** : schéma de base (`personneBaseSchema`) pour les
  validateurs au blur, `personneSchema` (superRefine) pour les règles
  conditionnelles et de cohérence des dates au submit.
- **TanStack Query** : `queryOptions` + hooks (`usePersonnesCandidats`,
  `useMariagesCandidats`, `usePersonneDoublon`, `usePersonneAssignee`),
  mutation `useCreatePersonne` avec invalidation
  `['personnes'] / ['mariages'] / ['parent_enfants'] / ['mariage_enfants']`.
- **Combobox accessibles** basés sur shadcn `Command` + `Popover` (recherche
  serveur débouncée 250 ms, `shouldFilter={false}`).
- **Photo** :
  - compression client avant envoi (`prepareImage` : max 1600 px, WebP 0.85,
    repli JPEG, EXIF via `createImageBitmap`) ;
  - **upload au submit** (pas à la sélection) pour éviter les images orphelines ;
  - wrapper serveur `uploadPersonnePhoto` (`createServerFn`) qui vérifie la
    session + le rôle avant d'appeler imgbb — la clé `IMGBB_APIKEY` reste
    serveur ;
  - `urlImg` ← `displayUrl` imgbb, `urlImgThumb` ← `thumbUrl` ;
  - en cas d'échec RPC après upload, les URLs sont conservées pour ne pas
    réuploader au retry.
- **Accessibilité** : résumé d'erreurs focusable en tête de formulaire, erreurs
  inline `aria-describedby` + `role="alert"`, validation au blur, `fieldset`
  `legend` pour les groupes radio, statut photo `aria-live`, focus visible,
  `prefers-reduced-motion`, `scroll-padding` pour ne pas masquer le focus
  derrière la barre d'action collante.

## Non retenu / différé

- Wizard multi-étapes.
- Calendrier shadcn (`react-day-picker` / `date-fns`) : inputs `type="date"`
  natifs, accessibles et suffisants.
- Garde-fou « quitter sans enregistrer » (`useBlocker`) : non implémenté.
- Conversion HEIC côté client.
- Dates partielles/approximatives (le type `date` impose une date complète).
