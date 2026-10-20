# Décisions Techniques — Phase 9 (Gestion des utilisateurs)

Registre des choix pris pendant la Phase 9. L'accès est réservé au
`ROLE_ADMIN` : rôles et lignées passent par des RPC `SECURITY DEFINER`, tandis
que les comptes (création, mot de passe) passent par des server functions
admin-only utilisant l'Admin API Supabase.

## Backend

- **RPC `admin_list_profiles(p_query, p_role, p_limit, p_offset)`** :
  - `SECURITY DEFINER` + garde `is_admin()` (erreur `42501` sinon) ;
  - jointure `profiles` → `auth.users` (email de référence) et
    `personnes` (lignée assignée) ;
  - email : `auth.users.email` en priorité, repli sur `profiles.email` ;
  - recherche multi-termes sans casse ni accents (`immutable_unaccent` +
    `regexp_split_to_array`) sur email, nom, prénom et appellation ;
  - filtre optionnel `p_role` (`ROLE_ADMIN`, `ROLE_MODERATEUR`, `ROLE_USER`) ;
  - pagination `p_limit` (1..100, défaut 20) / `p_offset` ;
  - `total_count` (résultat filtré) et `admin_count` (total d'admins, tous
    filtres confondus) renvoyés avec chaque ligne ;
  - tri : administrateurs, modérateurs, membres, puis email ;
  - `execute` réservé à `authenticated` / `service_role`.
- **RPC `admin_update_profile_role(p_user_id, p_role, p_personne_id)`** :
  - garde `is_admin()` + verrou consultatif de transaction
    (`pg_advisory_xact_lock`) et `FOR UPDATE` sur le profil ciblé : deux
    rétrogradations concurrentes ne peuvent pas vider la table des admins ;
  - **auto-rétrogradation interdite** : un admin ne peut pas retirer son propre
    rôle (`42501`) ;
  - **dernier administrateur protégé** : une rétrogradation d'admin est refusée
    s'il ne reste qu'un seul `ROLE_ADMIN` (protège aussi les appels
    `service_role`, où `auth.uid()` est nul) ;
  - `ROLE_MODERATEUR` exige une `personne_id` existante ; tout autre rôle force
    `personne_id = null` (désassignation automatique, P9.4.2).
- **Audit** : trigger `profiles_audit_role_change` (`AFTER UPDATE`) qui insère
  dans `audit_logs` dès que `role` ou `personne_id` change :
  - `table_name = 'profiles'`, `action = 'role_update'`,
  - `old_data` / `new_data` : rôle, lignée et email,
  - `user_id = auth.uid()`.
    Un update sans changement de rôle/lignée ne crée pas de bruit.
- **Modification du mot de passe** : server function admin-only
  `updateUtilisateurPassword` (`auth.admin.updateUserById`) via la clé service
  role. Validation 8..72 caractères, aucune journalisation du mot de passe.
- **Verrouillage des écritures directes (P9.5.1)** :
  - policy `profiles_update` supprimée et privilèges révoqués (`REVOKE ALL`
    puis `GRANT SELECT` à `authenticated`) ; seule la RPC admin peut modifier
    un rôle/lignée ;
  - l'ancienne RPC `set_user_role` (contournait les gardes) est supprimée ;
  - le trigger `profiles_guard_role` reste en défense en profondeur pour les
    accès hors PostgREST (`service_role`, SQL direct) ;
  - `profiles_select` reste inchangée : chacun lit son profil, l'admin lit tout.

## Frontend

- **Route `/app/utilisateurs`** gardée par `beforeLoad` +
  `requireRole(context.profile, ['ROLE_ADMIN'])` : les autres rôles sont
  redirigés vers `/app`.
- **Navigation** : icône « Utilisateurs » dans l'en-tête, rendue uniquement si
  `isAdmin` (P9.1.2).
- **Création d'un compte** :
  - server function `createUtilisateur` (`src/lib/utilisateurs/server.ts`) :
    vérifie la session + `current_role() = ROLE_ADMIN`, valide l'entrée avec
    Zod, puis crée le compte via l'Admin API Supabase
    (`auth.admin.createUser`, email confirmé) avec la clé
    `SUPABASE_SERVICE_ROLE_KEY` (**serveur uniquement**) ;
  - le rôle et la lignée sont appliqués avec la RPC
    `admin_update_profile_role` **au nom de l'admin connecté** : les gardes,
    la désassignation et l'audit restent identiques à une modification ;
  - compensation : si l'attribution du rôle échoue, le compte Auth est
    supprimé pour ne pas laisser de profil incomplet ;
  - formulaire : email, mot de passe provisoire (8..72 caractères, affiché /
    masqué), rôle et lignée si modérateur ; erreurs de validation locales et
    erreurs serveur traduites (email déjà utilisé, etc.).
- **Modification du mot de passe** : bouton clé sur chaque ligne, dialogue avec
  double saisie et affichage/masquage. Le changement est immédiat et
  n'envoie aucun e-mail.
- **Tableau** (`components/utilisateurs/`) :
  - colonnes compte (email + badge « Vous »), rôle (badge + icône), lignée
    assignée (avatar + lien vers la fiche), dates de création/modification,
    action ;
  - recherche debouncée 300 ms et filtre par rôle côté serveur ;
  - pagination serveur de 20 comptes (Précédent / Suivant + compteur) ;
  - états skeleton, vide, erreur avec retry, annonce `aria-live` et bouton de
    rafraîchissement.
- **Dialogue de modification** :
  - sélection du rôle et, pour un modérateur, de la lignée via
    `PersonCombobox` (`search_personnes_candidats`, admin = toutes les
    personnes) ;
  - second dialogue de confirmation avec résumé « ancien rôle → nouveau
    rôle » + lignée ;
  - compte courant : le dialogue s'ouvre mais les options non-admin sont
    désactivées (impossible de se rétrograder), avec un message explicite ;
    les options non-admin sont également désactivées pour le dernier
    administrateur ;
  - erreurs serveur affichées telles quelles (gardes incluses) ;
  - invalidation de `utilisateurKeys.all` après succès.
- **Cache** : `utilisateurKeys.liste(query, role, page)` ; `staleTime` 20 s,
  `keepPreviousData` pour éviter le clignotement pendant la pagination.

## Validation

- Migration appliquée en local, types régénérés (`database.types.ts`).
- Vérifications SQL en base locale :
  - liste admin, recherche « rakoto » et filtres par rôle ;
  - auto-rétrogradation refusée ;
  - accès liste refusé pour un non-admin ;
  - promotion en modérateur avec lignée, changement de lignée puis retour en
    membre (lignée remise à `null`) ;
  - création d'un compte via Admin API puis application du rôle/lignée par la
    RPC admin (profil et ligne d'audit vérifiés, compte de test supprimé) ;
  - modification du mot de passe via Admin API : ancien mot de passe accepté
    avant, nouveau accepté après, ancien refusé ensuite (compte de test
    supprimé) ;
  - 1 ligne d'audit par changement réel de rôle/lignée.
- `npm run lint` et `npm run build` OK.
- Tests manuels UI (parcours admin / non-admin, dialogues, pagination) à
  effectuer par l'utilisateur.

## Non retenu / différé

- Création / suppression de comptes depuis l'application : les comptes restent
  gérés par Supabase Auth (inscription + suppression du compte auth).
- Écran de consultation des `audit_logs` : le journal est écrit, l'UI pourra
  être ajoutée en Phase 10 si nécessaire.
- Rôle « propriétaire » ou hiérarchie d'admins : les trois rôles existants
  suffisent.
