import { useEffect, useRef, useState } from 'react'

import type { PhotoUrls } from '#/lib/personnes/types'
import type { PhotoFieldStatus } from './photo-upload-field'

export type PersonnePhotoState = {
  file: File | null
  previewUrl: string | null
  urls: PhotoUrls | null
  status: PhotoFieldStatus
  error: string | null
  /** Une photo existante a été explicitement retirée. */
  removed: boolean
}

const EMPTY_PHOTO: PersonnePhotoState = {
  file: null,
  previewUrl: null,
  urls: null,
  status: 'empty',
  error: null,
  removed: false,
}

type InitialPhoto = {
  urlImg: string | null
  urlImgThumb: string | null
}

/**
 * État partagé de la photo de profil (création et modification).
 *
 * En modification, l'URL existante sert d'aperçu et `removed` distingue
 * « aucune nouvelle photo » de « suppression de la photo existante ».
 */
export function usePersonnePhoto(initial?: InitialPhoto | null) {
  const [photo, setPhoto] = useState<PersonnePhotoState>(() => {
    if (!initial?.urlImg && !initial?.urlImgThumb) return EMPTY_PHOTO
    return {
      file: null,
      previewUrl: initial.urlImgThumb ?? initial.urlImg,
      urls:
        initial.urlImg && initial.urlImgThumb
          ? { urlImg: initial.urlImg, urlImgThumb: initial.urlImgThumb }
          : null,
      status: 'uploaded',
      error: null,
      removed: false,
    }
  })
  const previewUrlRef = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }
    }
  }, [])

  const replacePreviewUrl = (url: string | null) => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
    }
    previewUrlRef.current = url
  }

  const choose = (file: File) => {
    const url = URL.createObjectURL(file)
    replacePreviewUrl(url)
    setPhoto({
      file,
      previewUrl: url,
      urls: null,
      status: 'ready',
      error: null,
      removed: false,
    })
  }

  const remove = () => {
    replacePreviewUrl(null)
    const hadExistingPhoto = Boolean(initial?.urlImg || initial?.urlImgThumb)
    setPhoto({ ...EMPTY_PHOTO, removed: hadExistingPhoto })
  }

  const reject = (message: string) => {
    setPhoto((prev) => ({ ...prev, status: 'error', error: message }))
  }

  const markUploading = () => {
    setPhoto((prev) => ({ ...prev, status: 'uploading', error: null }))
  }

  const markUploaded = (urls: PhotoUrls) => {
    setPhoto((prev) => ({
      ...prev,
      urls,
      status: 'uploaded',
      error: null,
    }))
  }

  const markError = (message: string) => {
    setPhoto((prev) => ({ ...prev, status: 'error', error: message }))
  }

  const reset = () => {
    replacePreviewUrl(null)
    setPhoto(EMPTY_PHOTO)
  }

  return {
    photo,
    choose,
    remove,
    reject,
    markUploading,
    markUploaded,
    markError,
    reset,
  }
}
