import sharp from 'sharp'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(__dirname, '../public')
const logoPath = resolve(publicDir, 'rs-logo.png')

async function generateIcon(size, logoScale, outputName) {
  const logoSize = Math.round(size * logoScale)
  const padding = Math.round((size - logoSize) / 2)

  const logo = await sharp(logoPath)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer()

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 6, g: 6, b: 18, alpha: 255 },
    },
  })
    .composite([{ input: logo, top: padding, left: padding }])
    .png()
    .toFile(resolve(publicDir, outputName))

  console.log(`✓ ${outputName} (${size}×${size}, logo ${Math.round(logoScale * 100)}%)`)
}

// any — logo at 70% so it looks good at any shape
await generateIcon(192, 0.70, 'pwa-192x192.png')
// maskable — logo at 55% to stay within the safe zone (inner 80%)
await generateIcon(512, 0.55, 'pwa-512x512.png')
// apple touch icon — same as 192 style, 180px
await generateIcon(180, 0.70, 'apple-touch-icon.png')

console.log('Done.')
