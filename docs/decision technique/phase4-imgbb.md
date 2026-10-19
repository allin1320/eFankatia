# Décisions Techniques — Phase 4 (Stockage des photos — imgbb)

Registre des choix de conception pris pendant la Phase 4 (intégration de l'API imgbb). Objectif : garder la trace des décisions qui impactent les phases suivantes (P5 formulaire personne, P8 arbre).

## Service imgbb

- **Fonction pure `uploadImageToImgbb(imageBase64, name?)`** (`src/lib/imgbb/upload.ts`) : envoie l'image en base64 vers `https://api.imgbb.com/1/upload?key=…` via `FormData` (champ `image`), sans aucune dépendance TanStack/Supabase — importable depuis Node pour le test en ligne de commande.
- **Clé API côté serveur uniquement** : `IMGBB_APIKEY` lue via `process.env` (pas de préfixe `VITE_`), jamais exposée côté client. Le wrapper `createServerFn` (qui portera l'appel depuis l'UI) est **différé à la Phase 5**.
- **Réponse normalisée** `ImgbbUploadResult` : `{ url, displayUrl, thumbUrl, deleteUrl, width, height }`. imgbb renvoie la miniature (`thumbUrl`) en même temps que l'URL plein format (`url`), d'où le stockage des deux.

## Schéma

- **`personnes.urlImg`** (plein format) et **`personnes.urlImgThumb`** (miniature), toutes deux `text` nullable.
- **Helper `_insert_personne`** : re-défini à chaque ajout de colonne pour insérer les deux champs. Les RPC `create_personne_*` passent leur payload `p_new` sans modification.
- **Types générés** : `npx supabase gen types typescript --local` (note : le CLI récent produit une sortie non formatée, re-formatée au style du projet).

## Test

- **`npm run test:upload`** (`tsx --env-file=.env scripts/test-upload.ts`) : envoie la fixture `scripts/fixtures/test-image.png` vers imgbb et vérifie qu'une URL publique est renvoyée. Aucun navigateur, aucune UI.
