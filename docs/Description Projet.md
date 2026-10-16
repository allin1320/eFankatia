# Documentation Fonctionnelle et Technique : eFankatia

## 1. Introduction et Objectif du Projet
**eFankatia** est une application web dédiée à la famille, conçue pour permettre aux membres de se connaître véritablement, de retracer l'histoire familiale et d'explorer l'arbre généalogique de manière interactive, fluide et moderne.

## 2. Stack Technique
* **Frontend & Routage / État :** **TanStack** (TanStack Router, TanStack Query)
* **Backend & Base de Données :** **Supabase** (PostgreSQL, Authentification, Row Level Security)
* **Gestion de la Base de Données :** **Supabase CLI** (`supabase`) pour le développement local, les migrations et la génération des types TypeScript.
* **Stockage des Médias :** **imgbb API** (`https://api.imgbb.com/`) pour l'hébergement des photos de profil.

## 3. Gestion des Rôles et des Droits (RBAC)
L'accès à l'application requiert une connexion obligatoire pour tous les utilisateurs. Trois rôles principaux sont définis :
* **`ROLE_ADMIN`** : Administrateur principal disposant d'un accès total. Il est le seul à pouvoir créer des personnes sans aucun rattachement (ni mariage ni naissance), ce qui permet d'initialiser les ancêtres situés tout en haut de l'arbre généalogique.
* **`ROLE_MODERATEUR`** : Rôle assigné à une personne spécifique de la base. Le modérateur a le droit de créer et de modifier des fiches personnes, à condition que ces personnes appartiennent à la même lignée que la personne qui lui est assignée.
* **`ROLE_USER`** : Utilisateur standard ayant un accès en lecture seule (consultation des fiches, recherche et affichage de l'arbre généalogique).

## 4. Spécifications Fonctionnelles

### A. Création d'une personne
Le formulaire comprend les informations civiles de base, suivies du choix du mode de rattachement :
1. **Par mariage (Alliance) :**
   * Sélection du conjoint dans la liste des mariages existants.
   * Le champ `estLigneeGenerale` est automatiquement positionné à `false`.
2. **Par naissance (Descendance) :**
   * Le champ `estLigneeGenerale` est automatiquement positionné à `true`.
   * Deux sous-options sont disponibles :
     * *Par mariage :* Sélection d'un mariage existant, ce qui remplit automatiquement les parents et associe l'enfant au mariage.
     * *Sans mariage :* Sélection directe d'un parent unique (père ou mère).
3. **Cas particulier de l'Administrateur :**
   * L'administrateur peut saisir des personnes sans aucun mariage ni naissance (pour positionner les ancêtres fondateurs au sommet de l'arbre).
4. **Upload des photos :**
   * Intégration de l'upload de photos via l'API **imgbb** (`https://api.imgbb.com/`) pour stocker et lier l'URL publique de l'image au profil de la personne.

### B. Modification de personne et Actions Rapides
* Depuis la fiche détaillée d'une personne, des boutons d'actions permettent de créer directement :
  * Un enfant rattaché à cette personne.
  * Un mariage / union pour cette personne.
* Ces actions respectent les restrictions des rôles (`ROLE_ADMIN` ou `ROLE_MODERATEUR` sur la lignée).

### C. Recherche, Fiche Personnelle et Suppression
* **Recherche :** Interface de recherche rapide permettant de retrouver un membre par nom, prénom, appellation ou profession.
* **Fiche Personnelle :** Vue détaillée regroupant l'état civil, les informations de contact, la photo, les conjoints, les parents et les enfants.
* **Suppression :** Fonctionnalité de suppression encadrée par les règles de sécurité des rôles.

### D. Arbre Généalogique Interactif (UX / UI)
* Accessible via un bouton dédié depuis la fiche de n'importe quelle personne.
* **Règles d'affichage UX / UI :**
  * Chaque nœud affiche une miniature de la photo de profil.
  * Si aucune photo n'est disponible, l'application affiche un avatar stylisé contenant la **première lettre de l'appellation en majuscule**.
* **Navigation :**
  * Support interactif du zoom (zoom-in / zoom-out) et du déplacement (pan/drag) pour explorer confortablement l'arbre généalogique.

### E. Traçabilité des modifications
* Chaque personne conserve la trace de sa création et de ses modifications :
  * À la **création** : `created_at` (horodatage) et `user_created` (utilisateur authentifié `auth.users.id` ayant créé la fiche).
  * À chaque **modification** : mise à jour de `updated_at` (horodatage) et de `user_edited` (utilisateur authentifié `auth.users.id` ayant effectué la dernière modification).
