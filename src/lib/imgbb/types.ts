/** Réponse brute de l'API imgbb (POST /1/upload). */
export interface ImgbbApiResponse {
  data: {
    id: string
    title: string
    url_viewer: string
    /** URL directe de l'image hébergée. */
    url: string
    display_url: string
    width: number
    height: number
    size: number
    time: string
    expiration: string
    image: {
      filename: string
      name: string
      mime: string
      extension: string
      url: string
    }
    thumb: {
      filename: string
      name: string
      mime: string
      extension: string
      url: string
    }
    delete_url: string
  }
  success: boolean
  status: number
}

/** Résultat normalisé renvoyé par le service d'upload. */
export interface ImgbbUploadResult {
  /** URL publique directe de l'image (format i.ibb.co). */
  url: string
  /** URL d'affichage de l'image. */
  displayUrl: string
  /** URL de la miniature. */
  thumbUrl: string
  /** URL de suppression (pour purger l'image ultérieurement). */
  deleteUrl: string
  /** Largeur en pixels. */
  width: number
  /** Hauteur en pixels. */
  height: number
}
