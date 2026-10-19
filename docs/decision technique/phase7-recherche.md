# Décisions Techniques — Phase 7 (Recherche et consultation)

Registre des choix pris pendant la Phase 7.

## Backend

- Extension **`pg_trgm`** (schéma `extensions`) + index GIN trigram sur
  l'expression normalisée `nom + prénom + appellation + profession`.
- Wrapper **`public.immutable_unaccent(text)`** (`IMMUTABLE`, `PARALLEL SAFE`) :
  `unaccent` est `STABLE`, ce qui interdit de l'utiliser directement dans un
  index. Le dictionnaire étant figé par migration, le wrapper est sûr.
- **RPC `search_personnes(p_query, p_limit, p_offset)`** :
  - normalisation sans accents et sans casse ;
  - multi-termes : chaque mot doit apparaître dans le texte concaténé
    (`regexp_split_to_array` + `NOT EXISTS`) ;
  - classement : appellation exacte, « prénom nom » exact, préfixes, puis reste ;
  - requête vide → membres récents (`created_at desc`) ;
  - `total_count` via `count(*) over()` pour la pagination ;
  - `security invoker` (la lecture est ouverte à tout authentifié), limite
    plafonnée à 50.

## Frontend

- Route `/app/recherche` avec état dans l'URL (`?q=`, `?notice=deleted`), ce qui
  rend la recherche partageable et compatible retour/avant.
- Debounce 300 ms + `useInfiniteQuery` (pages de 30) + `placeholderData`
  (`keepPreviousData`) pour éviter le clignotement entre requêtes.
- « Charger plus » explicite plutôt qu'un scroll infini : plus simple à rendre
  accessible au clavier.
- Accès depuis l'en-tête (icône loupe) et depuis la carte « Recherche » du
  dashboard.
- Résultats : avatar, nom/prénom, appellation, dates, profession, localisation,
  badge « Lignée générale » ; lien direct vers la fiche.
- États : skeleton, aucun résultat, erreur avec retry ; nombre de résultats
  annoncé en `aria-live`.

## Performance

- Index trigram réutilisé par la RPC ; jeu de données familial, la recherche
  reste sub-100 ms.
- Une seule RPC par page, pagination par offset plafonnée.
- `staleTime` 30 s et cache par terme normalisé.
- Les créations / modifications / suppressions invalident `searchKeys.all`.

## Non retenu / différé

- Filtres avancés (sexe, ville, plage de dates) : reportés.
- Palette de commandes `⌘K` : l'icône de l'en-tête suffit pour la P7.
- Recherche floue tolérante aux fautes : `pg_trgm` est en place, mais la RPC
  reste basée sur `LIKE` par terme. Envisageable en P9 si besoin.
