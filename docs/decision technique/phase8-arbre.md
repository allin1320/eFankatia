# Décisions Techniques — Phase 8 (Arbre généalogique interactif)

Registre des choix pris pendant la Phase 8.

## Backend

- **RPC `get_arbre_personne(p_id, p_ancetres, p_descendants)`** :
  - une seule requête agrégée qui renvoie `personnes`, `mariages`,
    `parent_enfants` et `mariage_enfants` (JSON), évitant une cascade d'appels
    REST côté client ;
  - ascendants via un CTE récursif `parent_enfants` (profondeur négative),
    descendants via le même graphe (profondeur positive) ;
  - profondeur bornée à **0..6** générations de chaque côté. Le client charge
    l'arbre complet (6 + 6) puis n'en affiche qu'une partie : la progression se
    fait côté UI ;
  - **aucune duplication de personne** : la génération est calculée en base
    (`min` de la profondeur atteinte) ; un conjoint déjà présent comme
    ascendant/descendant n'est pas réajouté ;
  - conjoints ajoutés uniquement pour la personne focalisée et ses descendants
    (génération ≥ 0). Les beaux-parents des ascendants sont volontairement
    exclus : les parents utiles sont déjà couverts par `parent_enfants` ;
  - unions et liens filtrés aux deux extrémités présentes dans le sous-arbre ;
  - `security invoker` : les policies RLS de lecture existantes s'appliquent ;
  - `execute` réservé à `authenticated` / `service_role`.
- **RPC `get_personne_racine()`** : renvoie la personne à afficher quand l'UI
  ouvre l'arbre sans fiche choisie (bouton « Explorer »). Priorité à un
  ancêtre sans parent, rattaché à la lignée générale, le plus ancien ; repli
  sur la première personne créée.

## Frontend

- **Route `/app/arbre`** :
  - `?personne=<uuid>&complet=1` → arbre centré sur cette fiche, **entièrement
    déplié** (bouton « Voir l’arbre » d'une fiche) ;
  - sans paramètre → **racine familiale** (`get_personne_racine`) affichée
    directement, **3 générations**, sans étape de sélection.
- **Points d'entrée** : bouton « Voir l’arbre » sur chaque fiche, icône dédiée
  dans l'en-tête, carte « Arbre généalogique » du dashboard.
- **Cartes** : `PersonAvatar` réutilisé — miniature `urlImgThumb`, sinon
  initiale de l'appellation (puis prénom, puis nom) en majuscule. Nom, dates et
  appellation affichés ; la personne focalisée porte un anneau et une étoile.
- **Progression par boutons « + » / « − »** (`src/lib/personnes/tree-visibility.ts`) :
  - la RPC renvoie l'arbre complet (borné), l'UI n'affiche par défaut que les
    générations `-3..+3` autour de la personne focalisée ;
  - les contrôles sont présents sur **toutes les intersections**, pas seulement
    aux extrémités :
    - au-dessus de chaque ancêtre (y compris la personne focalisée) pour
      déplier / replier ses parents ;
    - au milieu de chaque union (entre les deux conjoints) pour déplier /
      replier les enfants du couple ;
    - sous chaque parent seul pour déplier / replier ses enfants hors union ;
  - « + » indique une branche repliée à afficher, « − » une branche affichée à
    réduire ;
  - un clic agit **sur cette branche uniquement**, sans recharger la donnée ;
    le couple et le second parent sont ajoutés automatiquement ;
  - les branches dépliées/repliées sont locales à la session ; le bouton
    « Réduire l’arbre » (icône rotation) revient à l'état par défaut.
- **Mise en page** (`src/lib/personnes/tree-layout.ts`) :
  - une ligne par génération (`generation * ROW_GAP`) ;
  - placement horizontal par passes de **barycentre** (conjoints, parents,
    enfants) avec espacement minimal garanti, puis translation pour centrer la
    personne focalisée ;
  - liaison d'union (ligne pointillée + pastille avec la date en infobulle) ;
  - enfants rattachés à une union : **une seule courbe** depuis le milieu du
    couple ; les liens parent/enfant hors union restent des courbes directes ;
  - coordonnées **stables** (espace monde brut) : le dépliage d'une branche ne
    fait pas sauter la vue ;
  - calcul pur et mémoïsé côté client, sans dépendance de layout externe.
- **Zoom / pan** (`use-tree-viewport.ts`) :
  - panoramique au pointeur (souris, tactile), capture après un seuil pour ne
    pas bloquer les clics sur les cartes ni sur les boutons « + » ;
  - zoom molette centré sur le curseur + boutons +/− ; pincement à deux doigts ;
  - raccourcis clavier : flèches (pan), `+`/`−` (zoom), `0` (recadrage) ;
  - recadrage automatique à l'ouverture et bouton « Recadrer » ;
  - échelle bornée entre 15 % et 250 %.
- **Impression** (P8.5) :
  - bouton « Imprimer » (icône imprimante) dans la barre de zoom ; Ctrl+P /
    Cmd+P est également pris en charge ;
  - la caméra est recalculée (`computePrintCamera`) pour faire tenir **l'arbre
    visible** — branches dépliées/repliées telles qu'affichées — sur une page
    **A4 paysage**, indépendamment du zoom/pan en cours ; l'événement
    `beforeprint` applique la caméra de façon synchrone (`flushSync`) et
    `afterprint` restaure la vue écran ;
  - `@media print` : en-tête de l'application, barre d'outils, contrôles de zoom,
    boutons « + / − » et aide clavier masqués ; canevas figé sur le ratio de la
    zone imprimable (`1000 / 530`) ; fond blanc et couleurs conservées
    (`print-color-adjust: exact`) ;
  - en-tête d'impression : nom de la personne focalisée, nombre de générations
    ascendantes/descendantes affichées et date d'impression.
- **États** : skeleton, erreur avec retry, personne introuvable, famille vide,
  arbre réduit à une personne (invitation à compléter la fiche).
- **Accessibilité** : canevas focusable, aide textuelle, boutons de zoom et
  boutons « + » étiquetés, cartes = liens navigables au clavier, pourcentage de
  zoom en `aria-live`.

## Performance

- Une seule RPC par arbre ; `staleTime` 60 s et `placeholderData`
  (`keepPreviousData`) pour éviter le clignotement.
- Le dépliage d'une branche est purement client : pas d'appel réseau, pas de
  rechargement.
- Les mutations existantes invalident `personneKeys.all`, donc l'arbre est
  rafraîchi automatiquement après une création / modification / suppression.
- Placement `O(n log n)` par passe, borné en itérations, sur des arbres
  familiaux de taille raisonnable.

## Non retenu / différé

- Sélecteurs de profondeur « Ascendants » / « Descendants » : retirés au profit
  de l'affichage direct à 3 générations et des boutons « + » contextuels.
- Librairie de graphe (React Flow, d3-hierarchy) : le placement en couches
  maison suffit et évite une dépendance lourde.
- Arbre « forêt » de plusieurs lignées racines : la racine affichée par défaut
  est unique.
- Export image et mini-carte de navigation : envisageables en P9.
