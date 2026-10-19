# Décisions Techniques — Phase 6 (Fiche, actions rapides, modification, suppression)

Registre des choix pris pendant la Phase 6. Impacte la Phase 8 (arbre) et la
Phase 9 (tests/sécurité).

## Lecture de la fiche

- **RPC `get_personne_fiche(p_id uuid) returns jsonb`** : une seule requête
  renvoie la personne, ses parents, ses unions (avec leurs enfants) et ses
  enfants directs, plus `can_edit` / `can_delete`.
- `security invoker` : la lecture reste ouverte à tout utilisateur authentifié
  (RLS `personnes_select`). Les permissions sont calculées avec les helpers
  `is_admin` / `is_moderator` / `is_in_lignee`, comme les policies.
- `can_delete` est **faux pour un modérateur** lorsque la personne sert de
  référence de lignée (`profiles.personne_id`). La suppression mettrait
  `personne_id` à `NULL`, ce que le trigger `profiles_guard_role` réserve à un
  administrateur.
- Route `/app/personnes/$personneId` (client-side React Query), avec états
  skeleton / erreur / « introuvable ». Pas de loader SSR : cohérent avec la P5.

## Actions rapides

- Réutilisation du formulaire de création via des **search params**
  (`?mode=&parent=|conjoint=|mariage=`), pas d'écran dupliqué.
- `PersonneForm` accepte un `preset` ; les libellés de la personne/union
  préselectionnée sont résolus par `usePersonneResume` / `useMariageResume`.
- Depuis une union de la fiche : « Enfant de cette union »
  (`mode=naissance_mariage&mariage=<id>`).
- L'écran de succès renvoie désormais vers la fiche créée.

## Modification

- Même sections `IdentiteSection` + `OriginesSection` qu'en création, sans la
  section rattachement (les liens se gèrent depuis la fiche).
- `personneBaseSchema` (Zod) pour la validation ; l'upload photo est **différé
  au submit**, comme en création.
- **Verrou optimiste** : l'update filtre sur `updated_at`. Si la fiche a changé
  entre-temps, PostgREST renvoie `PGRST116` et l'UI invite à recharger.
- Sur `personnes`, la mise à jour est **directe via PostgREST** (les policies
  `personnes_update_*` existent depuis la P2) ; le trigger
  `personnes_guard_doublon` protège l'anti-doublon.
- Liste blanche de colonnes : `estLigneeGenerale` et les champs d'audit ne sont
  jamais envoyés.
- Photo : `usePersonnePhoto` factorise l'état création/modification et gère les
  trois cas (conserver / remplacer / retirer).
- Les unions sont éditables (dates + `type_fin`) et supprimables directement via
  PostgREST (policies `mariages_*`), avec confirmation inline.

## Suppression

- **RPC `delete_personne(p_id uuid) returns jsonb`**, `SECURITY DEFINER`,
  transactionnelle : supprime les liens (`mariage_enfants`, `parent_enfants`,
  `mariages`) puis la personne. Les autres personnes ne sont **jamais**
  supprimées.
- Raison : les FK de parenté et d'union sont en `ON DELETE RESTRICT` ; le
  déliement doit être explicite.
- Garde supplémentaire : un modérateur ne peut pas supprimer une personne
  référencée par `profiles.personne_id` (message dédié).
- Le dialogue affiche le nombre d'unions et de liens retirés avant confirmation.
- Après succès : invalidation large (`personnes`, `mariages`, `parent_enfants`,
  `mariage_enfants`, `search`) puis retour à la recherche avec message.

## Frontend / cache

- Nouvelles clés : `personneKeys.resume`, `personneKeys.fiche`,
  `mariageKeys` réutilisée, `searchKeys`.
- Après écriture, un helper unique `invalidatePersonneGraph` invalide tout le
  voisinage de la personne.
- Composants shadcn ajoutés : `dialog`, `alert-dialog`.
- Accessibilité : `role="status"` / `aria-live` pour la recherche, dialogues
  Radix (focus piégé), labels, zones ≥ 44 px.

## Non retenu / différé

- `audit_logs` n'est toujours pas alimenté (traçabilité P1 via `user_edited` /
  `updated_at`).
- Pas d'édition des liens parent/enfant (uniquement unions).
- Pas de suppression d'image côté imgbb (les anciennes URLs deviennent
  orphelines).
- Pas de test automatisé (règle projet : demande explicite requise).
