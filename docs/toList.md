 
# 📋 To-Do List : Développement de l'application eFankatia

## Phase 1 : Configuration de la Base de Données (Supabase CLI)
- [ ] Créer un nouveau projet sur **Supabase**.
- [ ] Initialiser l'environnement local avec la **Supabase CLI** (`supabase init` puis `supabase start`).
- [ ] Créer les tables via des **migrations** (`supabase migration new` / `supabase db push`) plutôt qu'à la main.
- [ ] Créer la table **`personnes`** pour stocker les informations civiles, géographiques et le drapeau `estLigneeGenerale`[cite: 1].
- [ ] Créer la table **`mariages`** pour gérer les unions entre deux personnes sans dupliquer les individus[cite: 1].
- [ ] Créer la table **`parent_enfants`** pour gérer les relations directes parent/enfant (y compris les parents solos ou partiels)[cite: 1].
- [ ] Créer la table **`mariage_enfants`** pour associer les enfants issus d'un mariage précis[cite: 1].
- [ ] Configurer les clés étrangères et les règles de suppression en cascade (`ON DELETE CASCADE`).

## Phase 2 : Authentification, Rôles et Sécurité (Supabase Auth & RLS)
- [ ] Configurer l'authentification Supabase.
- [ ] Mettre en place la gestion des rôles (`ROLE_ADMIN`, `ROLE_MODERATEUR`, `ROLE_USER`).
- [ ] Appliquer les politiques **Row Level Security (RLS)** sur les tables :
  - [ ] `ROLE_USER` : Accès en lecture seule.
  - [ ] `ROLE_MODERATEUR` : Droits d'écriture restreints à sa propre lignée assignée.
  - [ ] `ROLE_ADMIN` : Accès complet (CRUD) sans restriction.

## Phase 3 : Initialisation du Projet Frontend (TanStack)
- [ ] Initialiser le projet web avec la stack **TanStack** (TanStack Router et TanStack Query).
- [ ] Configurer le client Supabase dans l'application.
- [ ] Générer les types TypeScript depuis le schéma avec `supabase gen types typescript`.
- [ ] Mettre en place le layout global, la protection des routes et la gestion des sessions utilisateur.

## Phase 4 : Intégration du Stockage des Photos (imgbb API)
- [ ] Créer un service utilitaire pour communiquer avec l'API **imgbb** (`https://api.imgbb.com/`).
- [ ] Développer le composant d'upload d'image avec prévisualisation.
- [ ] Récupérer et stocker l'URL publique de l'image dans les profils de personnes.

## Phase 5 : Fonctionnalités Métier - Création et Saisie de Personnes
- [ ] Développer le formulaire de création de personne (informations civiles et locales).
- [ ] Implémenter la logique conditionnelle de rattachement :
  - [ ] **Par Mariage** (`estLigneeGenerale = false`) : Sélection du conjoint dans la table `mariages`[cite: 1].
  - [ ] **Par Naissance** (`estLigneeGenerale = true`) :
    - [ ] Option A : Par mariage (remplissage automatique des parents, enregistrement dans `parent_enfants` et `mariage_enfants`)[cite: 1].
    - [ ] Option B : Sans mariage (sélection d'un parent unique dans `parent_enfants`)[cite: 1].
  - [ ] **Cas Admin** : Permettre de créer des personnes sans rattachement (ancêtres racines au sommet de l'arbre).
- [ ] Valider la soumission via les mutations TanStack Query.

## Phase 6 : Modification, Fiche Personnelle et Actions Rapides
- [ ] Créer l'interface de la fiche détaillée d'une personne.
- [ ] Ajouter les boutons d'actions rapides (créer un enfant, créer un mariage).
- [ ] Implémenter la modification d'une personne selon le rôle.
- [ ] Implémenter la suppression d'une personne avec les contrôles de sécurité.

## Phase 7 : Recherche et Consultation
- [ ] Développer l'interface de recherche globale (par nom, prénom, appellation, profession).
- [ ] Optimiser les requêtes de recherche pour fluidifier l'expérience utilisateur.

## Phase 8 : Arbre Généalogique Interactif (UX / UI)
- [ ] Créer la vue de l'arbre généalogique accessible depuis n'importe quelle fiche personne.
- [ ] Intégrer le rendu visuel des cartes (miniature photo ou première lettre de l'appellation en majuscule).
- [ ] Implémenter le zoom (zoom-in / zoom-out) et le déplacement fluide (pan / drag).

## Phase 9 : Tests, Sécurité et Déploiement
- [ ] Valider les accès par rôle (`ROLE_ADMIN`, `ROLE_MODERATEUR`, `ROLE_USER`) et les politiques RLS.
- [ ] Tester les cas complexes (familles recomposées, parents solos, divorces).
- [ ] Déployer l'application sur la plateforme cible.
