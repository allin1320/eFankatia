# Documentation Fonctionnelle et Technique : eFankatia

## 1. Introduction et Objectif du Projet

**eFankatia** est une application web dédiée à la famille, conçue pour permettre aux membres de se connaître véritablement, de retracer l'histoire familiale et d'explorer l'arbre généalogique de manière interactive, fluide et moderne.

## 2. Stack Technique

- **Frontend & Routage / État :** **TanStack Start** (React 19, Vite 8), **TanStack Router** (file-based) et **TanStack Query**.
- **Formulaires & validation :** **TanStack Form** + **Zod**.
- **UI :** **Tailwind CSS v4** (config CSS-first) + **shadcn/ui** (`new-york`, base `zinc`), thème « lagon ».
- **Backend & Base de Données :** **Supabase** (PostgreSQL, Authentification, Row Level Security). Client `@supabase/supabase-js` + `@supabase/ssr` (session SSR en cookies httpOnly).
- **Gestion de la Base de Données :** **Supabase CLI** (`supabase`) pour le développement local, les migrations et la génération des types TypeScript.
- **Stockage des Médias :** **imgbb API** (`https://api.imgbb.com/`) pour l'hébergement des photos de profil (clé API côté serveur uniquement).

## 3. Gestion des Rôles et des Droits (RBAC)

L'accès à l'application requiert une connexion obligatoire pour tous les utilisateurs. Trois rôles principaux sont définis :

- **`ROLE_ADMIN`** : Administrateur principal disposant d'un accès total. Il est le seul à pouvoir créer des personnes sans aucun rattachement (ni mariage ni naissance), ce qui permet d'initialiser les ancêtres situés tout en haut de l'arbre généalogique.
- **`ROLE_MODERATEUR`** : Rôle assigné à une personne spécifique de la base. Le modérateur a le droit de créer et de modifier des fiches personnes, à condition que ces personnes appartiennent à la même lignée que la personne qui lui est assignée.
- **`ROLE_USER`** : Utilisateur standard ayant un accès en lecture seule (consultation des fiches, recherche et affichage de l'arbre généalogique).

Les rôles sont stockés dans `profiles.role` (enum `user_role`) et la lignée assignée au modérateur dans `profiles.personne_id` (voir `docs/Structure Personne.md`). L'utilisateur authentifié vit dans `auth.users` (Supabase Auth), le profil applicatif dans `profiles`.

## 4. Spécifications Fonctionnelles

### A. Création d'une personne

Le formulaire comprend les informations civiles de base, suivies du choix du mode de rattachement :

1. **Par mariage (Alliance) :**
   - Sélection du conjoint dans la liste des mariages existants.
   - Le champ `estLigneeGenerale` est automatiquement positionné à `false`.
2. **Par naissance (Descendance) :**
   - Le champ `estLigneeGenerale` est automatiquement positionné à `true`.
   - Deux sous-options sont disponibles :
     - _Par mariage :_ Sélection d'un mariage existant, ce qui remplit automatiquement les parents et associe l'enfant au mariage.
     - _Sans mariage :_ Sélection directe d'un parent unique (père ou mère).
3. **Cas particulier de l'Administrateur :**
   - L'administrateur peut saisir des personnes sans aucun mariage ni naissance (pour positionner les ancêtres fondateurs au sommet de l'arbre).
4. **Upload des photos :**
   - Intégration de l'upload de photos via l'API **imgbb** (`https://api.imgbb.com/`) pour stocker et lier au profil de la personne l'URL publique de l'image (`urlImg`) ainsi que celle de sa miniature (`urlImgThumb`).

### B. Modification de personne et Actions Rapides

- Depuis la fiche détaillée d'une personne, des boutons d'actions permettent de créer directement :
  - Un enfant rattaché à cette personne.
  - Un mariage / union pour cette personne.
- Ces actions respectent les restrictions des rôles (`ROLE_ADMIN` ou `ROLE_MODERATEUR` sur la lignée).

### C. Recherche, Fiche Personnelle et Suppression

- **Recherche :** Interface de recherche rapide permettant de retrouver un membre par nom, prénom, appellation ou profession.
- **Fiche Personnelle :** Vue détaillée regroupant l'état civil, les informations de contact, la photo, les conjoints, les parents et les enfants.
- **Suppression :** Fonctionnalité de suppression encadrée par les règles de sécurité des rôles.

### D. Arbre Généalogique Interactif (UX / UI)

- Accessible via un bouton dédié depuis la fiche de n'importe quelle personne (arbre complet), ou depuis le bouton « Explorer » (racine familiale, 3 générations par défaut).
- **Règles d'affichage UX / UI :**
  - Chaque nœud affiche une miniature de la photo de profil (champ `urlImgThumb`).
  - Si aucune photo n'est disponible, l'application affiche un avatar stylisé contenant la **première lettre de l'appellation en majuscule**.
  - Un bouton « + » placé sur une branche affiche la génération suivante (ascendants ou descendants) de la personne sélectionnée.
- **Navigation :**
  - Support interactif du zoom (zoom-in / zoom-out) et du déplacement (pan/drag) pour explorer confortablement l'arbre généalogique.

### E. Traçabilité des modifications

- Les tables `personnes` et `profiles` conservent la trace de leur création et de leurs modifications, renseignées automatiquement par des triggers PostgreSQL (voir `docs/Structure Personne.md`) :
  - À la **création** : `created_at` (horodatage) et `user_created` (utilisateur authentifié `auth.uid()` ayant créé la fiche).
  - À chaque **modification** : mise à jour de `updated_at` (horodatage) et de `user_edited` (utilisateur authentifié `auth.uid()` ayant effectué la dernière modification).
- Un **historique complet** des changements peut être conservé dans la table `audit_logs` (table concernée, action, anciennes/nouvelles valeurs, auteur, horodatage).

## 5. Documentation technique

- `docs/Structure Personne.md` — modèle de données Supabase et règles de suppression.
- `docs/Decisions Techniques.md` — registre central des décisions (index par phase, RLS, anti-doublon, conventions).
- `docs/decision technique/` — détail des décisions par phase (P1, P3, P4, P5, P6, P7, P8).
- `docs/toList.md` — plan de développement par phases.
- `docs/diagramme-classes.mmd` — diagramme de classes Mermaid.
