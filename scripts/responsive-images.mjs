/**
 * responsive-images.mjs
 *
 * Generates the responsive variants the site serves: for every photo in
 * public/albums/ and public/assets/, AVIF + JPEG at 640/960/1440/1920/2560
 * (never wider than the source — nothing is upscaled). Output goes to
 * public/r/ (git-ignored, rebuilt on demand) and is skipped when the source is unchanged,
 * so re-running is cheap. Also writes the 1200×630 share image (public/r/og.jpg)
 * from the `og` entry of public/albums/_site.json.
 *
 * Runs as part of `npm run build`. Usage: npm run images
 */
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { variantWidths, variantUrl } from '../src/imgsizes.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PUBLIC = path.resolve(__dirname, '..', 'public')
const SOURCES = ['albums', 'assets']
const IMG_EXT = /\.(jpe?g|png|webp)$/i

function collect(dir) {
  const out = []
  if (!fs.existsSync(dir)) return out
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...collect(p))
    else if (IMG_EXT.test(e.name)) out.push(p)
  }
  return out
}

// Freshness is tracked by content hash (not mtime) so a CI cache of public/r/
// is reused even though a fresh checkout resets every file's timestamp.
const MANIFEST = path.join(PUBLIC, 'r', 'manifest.json')
let manifest = {}
try { manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) } catch { /* first run */ }
const hashOf = (file) => crypto.createHash('sha1').update(fs.readFileSync(file)).digest('hex')

async function variantsFor(file) {
  const src = '/' + path.relative(PUBLIC, file).split(path.sep).join('/')
  const hash = hashOf(file)
  const same = manifest[src] === hash
  const meta = await sharp(file).metadata()
  const w = (meta.orientation || 1) >= 5 ? meta.height : meta.width
  let made = 0
  for (const width of variantWidths(w)) {
    for (const ext of ['avif', 'jpg']) {
      const out = path.join(PUBLIC, variantUrl(src, width, ext))
      if (same && fs.existsSync(out)) continue
      fs.mkdirSync(path.dirname(out), { recursive: true })
      const pipe = sharp(file).rotate().resize({ width, withoutEnlargement: true })
      if (ext === 'avif') await pipe.avif({ quality: 58, effort: 2 }).toFile(out)
      else await pipe.jpeg({ quality: 80, mozjpeg: true, progressive: true }).toFile(out)
      made += 1
    }
  }
  manifest[src] = hash
  return made
}

async function shareImage() {
  const cfgPath = path.join(PUBLIC, 'albums', '_site.json')
  if (!fs.existsSync(cfgPath)) return
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
  const entry = cfg.og || cfg.hero
  const rel = typeof entry === 'string' ? entry : entry?.src
  if (!rel) return
  const file = path.join(PUBLIC, rel)
  const out = path.join(PUBLIC, 'r', 'og.jpg')
  if (!fs.existsSync(file)) return
  const hash = hashOf(file)
  if (manifest['og:' + rel] === hash && fs.existsSync(out)) return
  manifest['og:' + rel] = hash
  fs.mkdirSync(path.dirname(out), { recursive: true })
  await sharp(file).rotate().resize(1200, 630, { fit: 'cover', position: 'attention' })
    .jpeg({ quality: 82, mozjpeg: true }).toFile(out)
}

async function main() {
  const files = SOURCES.flatMap((d) => collect(path.join(PUBLIC, d)))
  let made = 0, next = 0
  const worker = async () => {
    while (next < files.length) made += await variantsFor(files[next++])
  }
  await Promise.all(Array.from({ length: Math.max(2, os.cpus().length - 1) }, worker))
  await shareImage()
  fs.mkdirSync(path.dirname(MANIFEST), { recursive: true })
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest))
  console.log(`✓ Responsive images: ${files.length} sources, ${made} variants written (rest up to date)`)
}

main().catch((e) => { console.error(`✗ ${e.message}`); process.exit(1) })
