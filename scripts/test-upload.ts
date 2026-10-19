import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { uploadImageToImgbb } from '../src/lib/imgbb/upload'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(__dirname, 'fixtures', 'test-image.png')

async function main(): Promise<void> {
  const imageBase64 = readFileSync(fixturePath).toString('base64')

  console.log('📤 Envoi de l’image de test vers imgbb…')

  const result = await uploadImageToImgbb(imageBase64, 'test-upload')

  if (!result.url.startsWith('https://')) {
    throw new Error(`URL inattendue reçue : ${result.url}`)
  }

  console.log('✅ Upload réussi !')
  console.log('   URL publique :', result.url)
  console.log('   Miniature    :', result.thumbUrl)
  console.log('   Dimensions   :', `${result.width}x${result.height}`)
  console.log('   Suppression  :', result.deleteUrl)
}

main().catch((error: unknown) => {
  console.error('❌ Échec du test d’upload :', (error as Error).message)
  process.exitCode = 1
})
