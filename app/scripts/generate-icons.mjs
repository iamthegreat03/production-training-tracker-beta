/**
 * Generates PWA icons as solid-orange PNGs using pure Node.js (no deps).
 * Run from the app/ directory: node scripts/generate-icons.mjs
 */
import { writeFileSync, mkdirSync } from 'fs'
import { deflateSync } from 'zlib'

// CRC32 lookup table
const CRC_TABLE = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  CRC_TABLE[n] = c
}
function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crcBuf])
}

function makePNG(size, r, g, b) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr.writeUInt8(8, 8)  // bit depth
  ihdr.writeUInt8(2, 9)  // color type RGB

  // Raw scanlines: filter byte + RGB per pixel
  const row = 1 + size * 3
  const raw = Buffer.alloc(size * row)
  for (let y = 0; y < size; y++) {
    raw[y * row] = 0 // filter: None
    for (let x = 0; x < size; x++) {
      raw[y * row + 1 + x * 3] = r
      raw[y * row + 1 + x * 3 + 1] = g
      raw[y * row + 1 + x * 3 + 2] = b
    }
  }

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 6 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// Orange #f97316 = rgb(249, 115, 22)
const [r, g, b] = [249, 115, 22]

mkdirSync('public', { recursive: true })
writeFileSync('public/pwa-192x192.png', makePNG(192, r, g, b))
writeFileSync('public/pwa-512x512.png', makePNG(512, r, g, b))
writeFileSync('public/apple-touch-icon.png', makePNG(180, r, g, b))
writeFileSync('public/favicon-32x32.png', makePNG(32, r, g, b))

console.log('Icons generated in public/')
