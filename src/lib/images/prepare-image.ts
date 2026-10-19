/** Erreur de préparation d'image (message directement affichable). */
export class ImagePreparationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImagePreparationError'
  }
}

export type PreparedImage = {
  /** Image encodée en base64, sans préfixe `data:` (format attendu par imgbb). */
  base64: string
  mimeType: 'image/webp' | 'image/jpeg'
  width: number
  height: number
  /** Taille du fichier compressé, en octets. */
  size: number
}

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_INPUT_BYTES = 10 * 1024 * 1024
const MAX_PIXELS = 40_000_000
const MAX_DIMENSION = 1600
const QUALITY = 0.85

/** Vérifie un fichier rapidement (type + taille) sans le décoder. */
export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_TYPES.has(file.type)) {
    return 'Format non pris en charge. Utilisez une image JPG, PNG ou WebP.'
  }
  if (file.size > MAX_INPUT_BYTES) {
    return "L'image est trop lourde (10 Mo maximum)."
  }
  return null
}

/** Réduit une dimension en conservant le ratio, sans agrandir. */
function fitDimension(width: number, height: number) {
  const longest = Math.max(width, height)
  if (longest <= MAX_DIMENSION) return { width, height }
  const ratio = MAX_DIMENSION / longest
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  }
}

async function decodeImage(
  file: File,
): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      // Certains navigateurs ne supportent pas l'option : on retombe sur <img>.
    }
  }

  const objectUrl = URL.createObjectURL(file)
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () =>
        reject(new ImagePreparationError("Impossible de lire l'image."))
      image.src = objectUrl
    })
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function encode(
  canvas: HTMLCanvasElement,
  mimeType: 'image/webp' | 'image/jpeg',
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, QUALITY)
  })
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new ImagePreparationError("Impossible de lire l'image."))
        return
      }
      const [, base64 = ''] = result.split(',')
      resolve(base64)
    }
    reader.onerror = () =>
      reject(new ImagePreparationError("Impossible de lire l'image."))
    reader.readAsDataURL(blob)
  })
}

/**
 * Compresse et prépare une image pour l'upload imgbb.
 *
 * - formats acceptés : JPG, PNG, WebP ;
 * - taille maximale : 10 Mo et 40 mégapixels ;
 * - redimensionnement à 1600 px maximum sur le grand côté ;
 * - encodage WebP (repli JPEG).
 */
export async function prepareImage(file: File): Promise<PreparedImage> {
  const validationError = validateImageFile(file)
  if (validationError) {
    throw new ImagePreparationError(validationError)
  }

  const source = await decodeImage(file)
  const sourceWidth =
    'naturalWidth' in source ? source.naturalWidth : source.width
  const sourceHeight =
    'naturalHeight' in source ? source.naturalHeight : source.height

  if (sourceWidth * sourceHeight > MAX_PIXELS) {
    if ('close' in source) source.close()
    throw new ImagePreparationError(
      'Image trop grande (40 mégapixels maximum).',
    )
  }

  const { width, height } = fitDimension(sourceWidth, sourceHeight)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) {
    if ('close' in source) source.close()
    throw new ImagePreparationError('Compression impossible sur cet appareil.')
  }

  context.drawImage(source, 0, 0, width, height)
  if ('close' in source) source.close()

  let blob = await encode(canvas, 'image/webp')
  if (!blob || blob.type !== 'image/webp') {
    blob = await encode(canvas, 'image/jpeg')
  }

  if (!blob || (blob.type !== 'image/webp' && blob.type !== 'image/jpeg')) {
    throw new ImagePreparationError("La compression de l'image a échoué.")
  }

  const base64 = await blobToBase64(blob)

  return {
    base64,
    mimeType: blob.type === 'image/webp' ? 'image/webp' : 'image/jpeg',
    width,
    height,
    size: blob.size,
  }
}
