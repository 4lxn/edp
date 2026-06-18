/**
 * optimize-images.mjs
 *
 * Recompresses every album photo in public/albums/ for web delivery:
 * resizes the long side to <=2400px, re-encodes JPEG at quality 80 (mozjpeg),
 * strips metadata, and honors EXIF orientation. Files are overwritten ONLY when
 * the result is smaller, so re-running is safe and idempotent.
 *
 * Usage: npm run optimize
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ALBUMS_DIR = path.resolve(__dirname, '..', 'public', 'albums')
const MAX_LONG_SIDE = 2400
const JPEG_QUALITY = 80
const IMG_EXT = /\.(jpe?g|png)$/i

const mb = (b) => (b / 1048576).toFixed(2) + 'MB'

function collect(dir) {
  const out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...collect(p))
    else if (IMG_EXT.test(e.name)) out.push(p)
  }
  return out
}

async function main() {
  if (!fs.existsSync(ALBUMS_DIR)) {
    console.error(`✗ ${ALBUMS_DIR} not found`)
    process.exit(1)
  }
  const files = collect(ALBUMS_DIR)
  let before = 0, after = 0, changed = 0

  for (const f of files) {
    const orig = fs.readFileSync(f)
    before += orig.length
    const out = await sharp(orig)
      .rotate()
      .resize(MAX_LONG_SIDE, MAX_LONG_SIDE, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer()
    if (out.length < orig.length * 0.98) {
      fs.writeFileSync(f, out)
      after += out.length
      changed += 1
    } else {
      after += orig.length
    }
  }

  console.log(`✓ Optimized ${changed}/${files.length} images`)
  console.log(`  ${mb(before)} → ${mb(after)} (${Math.round(after / before * 100)}%)`)
}

main()
