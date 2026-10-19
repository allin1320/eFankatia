import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { getSupabaseServerClient } from '../supabase/server'
import { uploadImageToImgbb } from './upload'

const photoInput = z.object({
  base64: z.string().min(64).max(6_500_000),
  mimeType: z.enum(['image/webp', 'image/jpeg', 'image/png']),
  name: z.string().trim().max(120).optional(),
})

export type UploadPhotoResult = {
  urlImg: string
  urlImgThumb: string
}

/**
 * Envoie une photo de profil vers imgbb.
 *
 * Server function : la clé `IMGBB_APIKEY` reste côté serveur. La session
 * Supabase est vérifiée avant l'appel, et seuls les administrateurs et
 * modérateurs peuvent envoyer des photos.
 */
export const uploadPersonnePhoto = createServerFn({ method: 'POST' })
  .validator(photoInput)
  .handler(async ({ data }): Promise<UploadPhotoResult> => {
    const supabase = getSupabaseServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('Authentification requise pour envoyer une photo.')
    }

    const { data: role, error: roleError } = await supabase.rpc('current_role')

    if (roleError) {
      throw new Error('Impossible de vérifier vos droits pour le moment.')
    }

    if (role !== 'ROLE_ADMIN' && role !== 'ROLE_MODERATEUR') {
      throw new Error(
        'Accès refusé : seuls les administrateurs et modérateurs peuvent envoyer une photo.',
      )
    }

    const result = await uploadImageToImgbb(data.base64, data.name)

    return {
      urlImg: result.displayUrl,
      urlImgThumb: result.thumbUrl,
    }
  })
