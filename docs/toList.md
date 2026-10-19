# 📋 To-Do List : Développement de l'application eFankatia

## Phase 1 : Configuration de la Base de Données (Supabase CLI)
- [x] **P1.1** Créer un nouveau projet sur **Supabase**.
- [x] **P1.2** Initialiser l'environnement local avec la **Supabase CLI** (`supabase init` puis `supabase start`).
- [x] **P1.3** Créer les tables via des **migrations** (`supabase migration new` / `supabase db push`) plutôt qu'à la main.
- [x] **P1.4** Créer l'enum **`user_role`** (`ROLE_ADMIN`, `ROLE_MODERATEUR`, `ROLE_USER`).
- [x] **P1.5** Créer la table **`personnes`** pour stocker les informations civiles, géographiques et le drapeau `estLigneeGenerale`[cite: 1].
- [x] **P1.6** Créer la table **`mariages`** pour gérer les unions entre deux personnes sans dupliquer les individus[cite: 1].
- [x] **P1.7** Créer la table **`parent_enfants`** pour gérer les relations directes parent/enfant (y compris les parents solos ou partiels)[cite: 1].
- [x] **P1.8** Créer la table **`mariage_enfants`** pour associer les enfants issus d'un mariage précis[cite: 1].
- [x] **P1.9** Créer la table **`profiles`** liée à `auth.users(id)` (rôle, `personne_id`, champs d'audit).
- [x] **P1.10** Créer la table **`audit_logs`** pour l'historique des modifications.
- [x] **P1.11** Configurer les clés étrangères et les règles de suppression en cascade (`ON DELETE CASCADE`).
- [x] **P1.12** Créer les **triggers d'audit** (`updated_at` via `moddatetime`, `user_created`/`user_edited` via `auth.uid()`).

## Phase 2 : Authentification, Rôles et Sécurité (Supabase Auth & RLS)
- [x] **P2.1** Configurer l'authentification Supabase.
- [x] **P2.2** Mettre en place la gestion des rôles dans `profiles.role` (`ROLE_ADMIN`, `ROLE_MODERATEUR`, `ROLE_USER`) et la lignée assignée `profiles.personne_id`.
- [x] **P2.3** Appliquer les politiques **Row Level Security (RLS)** sur les tables :
  - [x] **P2.3.1** `ROLE_USER` : Accès en lecture seule.
  - [x] **P2.3.2** `ROLE_MODERATEUR` : Droits d'écriture restreints à sa propre lignée assignée.
  - [x] **P2.3.3** `ROLE_ADMIN` : Accès complet (CRUD) sans restriction.

## Phase 3 : Initialisation du Projet Frontend (TanStack)
- [x] **P3.1** Initialiser le projet web avec la stack **TanStack** (TanStack Router et TanStack Query).
- [x] **P3.2** Configurer le client Supabase dans l'application.
- [x] **P3.3** Générer les types TypeScript depuis le schéma avec `supabase gen types typescript`.
- [x] **P3.4** Mettre en place le layout global, la protection des routes et la gestion des sessions utilisateur.

## Phase 4 : Intégration du Stockage des Photos (imgbb API) — ✅ terminée (backend)
- [x] **P4.1** Créer un service utilitaire pour communiquer avec l'API **imgbb** (`https://api.imgbb.com/`).
- [x] **P4.3** Récupérer et stocker l'URL publique (backend) : colonnes `personnes.urlImg` (plein format) + `personnes.urlImgThumb` (miniature), helper `_insert_personne`/RPC `create_personne_*`.

## Phase 5 : Fonctionnalités Métier - Création et Saisie de Personnes
- [ ] **P5.1** Développer le formulaire de création de personne (informations civiles et locales).
- [ ] **P5.2** Implémenter la logique conditionnelle de rattachement :
  - [ ] **P5.2.1** **Par Mariage** (`estLigneeGenerale = false`) : Sélection du conjoint dans la table `mariages`[cite: 1].
  - [ ] **P5.2.2** **Par Naissance** (`estLigneeGenerale = true`) :
    - [ ] **P5.2.2.1** Option A : Par mariage (remplissage automatique des parents, enregistrement dans `parent_enfants` et `mariage_enfants`)[cite: 1].
    - [ ] **P5.2.2.2** Option B : Sans mariage (sélection d'un parent unique dans `parent_enfants`)[cite: 1].
  - [ ] **P5.2.3** **Cas Admin** : Permettre de créer des personnes sans rattachement (ancêtres racines au sommet de l'arbre).
- [ ] **P5.3** Valider la soumission via les mutations TanStack Query.
- [ ] **P5.4** *(Front, ex-Phase 4)* Upload photo : composant d'upload avec prévisualisation + câblage persistance `urlImg`/`urlImgThumb` (RPC `create_personne_*`).

## Phase 6 : Modification, Fiche Personnelle et Actions Rapides
- [ ] **P6.1** Créer l'interface de la fiche détaillée d'une personne.
- [ ] **P6.2** Ajouter les boutons d'actions rapides (créer un enfant, créer un mariage).
- [ ] **P6.3** Implémenter la modification d'une personne selon le rôle.
- [ ] **P6.4** Implémenter la suppression d'une personne avec les contrôles de sécurité.

## Phase 7 : Recherche et Consultation
- [ ] **P7.1** Développer l'interface de recherche globale (par nom, prénom, appellation, profession).
- [ ] **P7.2** Optimiser les requêtes de recherche pour fluidifier l'expérience utilisateur.

## Phase 8 : Arbre Généalogique Interactif (UX / UI)
- [ ] **P8.1** Créer la vue de l'arbre généalogique accessible depuis n'importe quelle fiche personne.
- [ ] **P8.2** Intégrer le rendu visuel des cartes (miniature photo ou première lettre de l'appellation en majuscule).
- [ ] **P8.3** Implémenter le zoom (zoom-in / zoom-out) et le déplacement fluide (pan / drag).

## Phase 9 : Tests, Sécurité et Déploiement
- [ ] **P9.1** Valider les accès par rôle (`ROLE_ADMIN`, `ROLE_MODERATEUR`, `ROLE_USER`) et les politiques RLS.
- [ ] **P9.2** Tester les cas complexes (familles recomposées, parents solos, divorces).
- [ ] **P9.3** Déployer l'application sur la plateforme cible.
