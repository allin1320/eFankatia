import type { ImgbbApiResponse, ImgbbUploadResult } from './types'

const IMGBB_UPLOAD_URL = 'https://api.imgbb.com/1/upload'

/** Erreur dédiée aux échecs d'upload imgbb. */
export class ImgbbError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'ImgbbError'
  }
}

/**
 * Envoie une image (base64) vers l'API imgbb et renvoie son URL publique.
 *
 * La clé API est lue depuis `process.env.IMGBB_APIKEY` : c'est un secret
 * **serveur uniquement**, il ne doit jamais être exposé côté client (donc pas
 * de préfixe `VITE_`).
 *
 * Fonction pure, sans dépendance TanStack/Supabase : elle reste importable
 * depuis Node (utilisée par `scripts/test-upload.ts`).
 */
export async function uploadImageToImgbb(
  imageBase64: string,
  name?: string,
): Promise<ImgbbUploadResult> {
  const apiKey = process.env.IMGBB_APIKEY

  if (!apiKey) {
    throw new ImgbbError(
      'IMGBB_APIKEY est manquante. Renseigne-la dans le fichier .env.',
    )
  }

  if (!imageBase64) {
    throw new ImgbbError('Aucune image fournie (base64 vide).')
  }

  const form = new FormData()
  form.append('image', imageBase64)
  if (name) {
    form.append('name', name)
  }

  const url = `${IMGBB_UPLOAD_URL}?key=${encodeURIComponent(apiKey)}`

  let response: Response
  try {
    response = await fetch(url, { method: 'POST', body: form })
  } catch (error) {
    throw new ImgbbError(
      `Échec de la requête vers imgbb : ${(error as Error).message}`,
    )
  }

  let payload: ImgbbApiResponse
  try {
    payload = (await response.json()) as ImgbbApiResponse
  } catch {
    throw new ImgbbError(
      `Réponse invalide d'imgbb (HTTP ${response.status}).`,
      response.status,
    )
  }

  if (!response.ok || !payload.success) {
    const message = (payload as { error?: { message?: string } }).error?.message
    throw new ImgbbError(
      message
        ? `imgbb a refusé l'image : ${message}`
        : `imgbb a refusé l'image (HTTP ${response.status}).`,
      response.status,
    )
  }

  return {
    url: payload.data.url,
    displayUrl: payload.data.display_url,
    thumbUrl: payload.data.thumb.url,
    deleteUrl: payload.data.delete_url,
    width: payload.data.width,
    height: payload.data.height,
  }
}
