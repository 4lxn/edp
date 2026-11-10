/**
 * sync-albums.mjs
 *
 * Scans `public/albums/<slug>/` folders and generates
 * `src/albums.generated.js` with ALBUMS and GALLERY.
 *
 * Zero-config by design: a folder with images is enough.
 *   public/albums/<slug>/*.{jpg,jpeg,png,webp,avif}  → images (sorted)
 *   public/albums/<slug>/_meta.json                  → OPTIONAL overrides
 *
 * Everything in _meta.json is optional. Sensible defaults are derived:
 *   - title    → folder name in Title Case ("casa-frijol" → "Casa Frijol")
 *   - type     → empty (the UI hides it)
 *   - location → empty
 *   - hero     → first image alphabetically
 *   - order    → numeric prefix in folder name ("02-..." → 2), else 999
 *   - captions → empty
 *
 * Optional project facts (ficha de obra). Any of these may be omitted; the UI
 * hides rows with no data. Text fields accept a string or { es, en }:
 *   title_en (project name on English pages, when it needs translating),
 *   year, client, architect, dimensions, materials, duration, scope, fact,
 *   story ({ es: [paragraphs], en: [...] } or a string per language),
 *   sequence: [filenames]  curated photos shown on the project page, in order
 *   process:  [filenames]  construction photos shown under "Proceso"
 *   focus:    { "<file>": "50% 40%" }  object-position per photo
 *   press:    { outlet, title, url, date }  shown only when the site-wide
 *             press flag in src/facts.js is enabled
 *
 * Site-level choices (landing hero, service photos, share image) live in
 * public/albums/_site.json so they can be swapped without touching code.
 *
 * Every image is measured (EXIF-aware) so the site can emit width/height and
 * never render a photo larger than its source.
 *
 * Tolerant inputs:
 *   - type/location/caption can be a plain string (used for both languages)
 *     or { es, en }; a missing language falls back to the other.
 *   - a malformed _meta.json warns and falls back to defaults (never crashes
 *     the build).
 *
 * Image order:
 *   - If `_meta.json` has `imageOrder: [filenames]`, that order wins (used by the
 *     local admin panel to reorder without renaming). Any file not listed falls
 *     back to alphabetical, appended after the ordered ones.
 *   - Otherwise images are sorted alphabetically (numeric prefixes like 01-, 02-).
 *
 * Usage (CLI):  npm run sync
 * Programmatic: import { syncAlbums } from './sync-albums.mjs'
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const ROOT = path.resolve(__dirname, '..')
export const ALBUMS_DIR = path.join(ROOT, 'public', 'albums')
const OUT_FILE = path.join(ROOT, 'src', 'albums.generated.js')

export const IMG_EXT = /\.(jpe?g|png|webp|avif)$/i

function orderImages(files, imageOrder) {
  const sorted = [...files].sort()
  if (!Array.isArray(imageOrder) || imageOrder.length === 0) return sorted
  const pos = (f) => {
    const i = imageOrder.indexOf(f)
    return i === -1 ? Infinity : i
  }
  // Stable sort: listed files by their position, the rest stay alphabetical.
  return sorted.sort((a, b) => pos(a) - pos(b))
}

// "02-casa-frijol" → "Casa Frijol" (also strips a leading order prefix)
function titleFromSlug(slug) {
  return slug
    .replace(/^\d+[-_]/, '')
    .split(/[-_]/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// numeric prefix in the folder name controls order: "02-foo" → 2
function orderFromSlug(slug, metaOrder) {
  if (Number.isFinite(metaOrder)) return metaOrder
  const m = slug.match(/^(\d+)[-_]/)
  return m ? parseInt(m[1], 10) : 999
}

// Accept a string ("hola"), a partial object ({ es }) or a full { es, en }.
// A missing language falls back to the other so one caption is enough.
function bilingual(val, fallback = { es: '', en: '' }) {
  if (val == null) return { ...fallback }
  if (typeof val === 'string') return { es: val, en: val }
  if (typeof val === 'object') {
    const es = val.es ?? val.en ?? fallback.es
    const en = val.en ?? val.es ?? fallback.en
    return { es, en }
  }
  return { ...fallback }
}

function readMeta(slug, metaPath) {
  if (!fs.existsSync(metaPath)) return {}
  try {
    return JSON.parse(fs.readFileSync(metaPath, 'utf8'))
  } catch (e) {
    console.warn(`⚠  ${slug}: _meta.json has a syntax error — using defaults (${e.message})`)
    return {}
  }
}

async function measure(absPath) {
  const m = await sharp(absPath).metadata()
  const swap = (m.orientation || 1) >= 5
  return { w: swap ? m.height : m.width, h: swap ? m.width : m.height }
}

// Optional bilingual text: returns null when empty so the UI can hide the row.
function optText(val) {
  const b = bilingual(val)
  return (b.es || b.en) ? b : null
}

function optStory(val) {
  if (!val) return null
  const norm = (v) => (Array.isArray(v) ? v : typeof v === 'string' && v ? [v] : [])
  const es = norm(typeof val === 'string' || Array.isArray(val) ? val : val.es)
  const en = norm(typeof val === 'string' || Array.isArray(val) ? val : val.en)
  if (!es.length && !en.length) return null
  return { es: es.length ? es : en, en: en.length ? en : es }
}

async function readAlbums() {
  const slugs = fs.readdirSync(ALBUMS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)

  const albums = []
  for (const slug of slugs) {
    const dir = path.join(ALBUMS_DIR, slug)
    const meta = readMeta(slug, path.join(dir, '_meta.json'))

    const files = fs.readdirSync(dir).filter(f => IMG_EXT.test(f))
    if (files.length === 0) {
      console.warn(`⚠  ${slug}: no images yet — skipping (drop photos in to publish)`)
      continue
    }

    const images = []
    for (const file of orderImages(files, meta.imageOrder)) {
      const { w, h } = await measure(path.join(dir, file))
      const img = { src: `/albums/${slug}/${file}`, w, h, caption: bilingual(meta.captions?.[file]) }
      const focus = meta.focus?.[file]
      if (typeof focus === 'string' && focus) img.focus = focus
      images.push({ file, img })
    }
    const indexOf = (f) => images.findIndex(i => i.file === f)
    const pick = (list) => (Array.isArray(list) ? list.map(indexOf).filter(i => i !== -1) : [])

    const title = typeof meta.title === 'string'
      ? meta.title
      : (meta.title && (meta.title.es || meta.title.en)) || titleFromSlug(slug)

    const heroIdx = Math.max(0, indexOf(meta.hero))
    const press = meta.press && meta.press.outlet ? meta.press : null

    albums.push({
      slug,
      order: orderFromSlug(slug, meta.order),
      featured: meta.featured ?? false,
      title,
      titleEn: typeof meta.title_en === 'string' && meta.title_en ? meta.title_en : null,
      type: bilingual(meta.type),
      location: bilingual(meta.location),
      hero: heroIdx,
      year: meta.year ?? null,
      client: optText(meta.client),
      architect: optText(meta.architect),
      dimensions: optText(meta.dimensions),
      materials: optText(meta.materials),
      duration: optText(meta.duration),
      scope: optText(meta.scope),
      fact: optText(meta.fact),
      story: optStory(meta.story),
      press,
      sequence: pick(meta.sequence),
      process: pick(meta.process),
      images: images.map(i => i.img),
    })
  }
  return albums.sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug))
}

// public/albums/_site.json → landing hero, service photos, share image.
async function readSite() {
  const p = path.join(ALBUMS_DIR, '_site.json')
  let cfg = {}
  if (fs.existsSync(p)) {
    try { cfg = JSON.parse(fs.readFileSync(p, 'utf8')) }
    catch (e) { console.warn(`⚠  _site.json has a syntax error — ignoring (${e.message})`) }
  }
  const resolve = async (entry) => {
    if (!entry) return null
    const rel = typeof entry === 'string' ? entry : entry.src
    if (!rel) return null
    const abs = path.join(ROOT, 'public', rel)
    if (!fs.existsSync(abs)) { console.warn(`⚠  _site.json: ${rel} not found`); return null }
    const img = { src: '/' + rel, ...(await measure(abs)) }
    if (typeof entry === 'object') {
      if (entry.focus) img.focus = entry.focus
      if (entry.focusMobile) img.focusMobile = entry.focusMobile
    }
    return img
  }
  const services = {}
  for (const [k, v] of Object.entries(cfg.services || {})) services[k] = await resolve(v)
  // "En obra" band: muted process clips ({ video, poster }) and/or stills ({ src }).
  const film = []
  for (const it of Array.isArray(cfg.film) ? cfg.film : []) {
    const alt = bilingual(it.alt)
    if (it.video) {
      if (!fs.existsSync(path.join(ROOT, 'public', it.video))) { console.warn(`⚠  _site.json: ${it.video} not found`); continue }
      film.push({ video: true, src: '/' + it.video, poster: it.poster ? '/' + it.poster : undefined, w: it.w || 720, h: it.h || 1280, alt })
    } else {
      const img = await resolve(it)
      if (img) film.push({ ...img, alt })
    }
  }
  return { hero: await resolve(cfg.hero), og: await resolve(cfg.og || cfg.hero), services, film }
}

function generate(albums, site) {
  const map = Object.fromEntries(albums.map(a => [a.slug, a]))
  return `/**
 * AUTO-GENERATED — do not edit by hand.
 * Run \`npm run sync\` to regenerate from public/albums/.
 */
export const ALBUMS = ${JSON.stringify(map, null, 1)}

export const ALBUM_ORDER = ${JSON.stringify(albums.map(a => a.slug))}

export const SITE = ${JSON.stringify(site, null, 1)}
`
}

/**
 * Regenerate src/albums.generated.js from public/albums/.
 * Returns a summary; throws on hard errors (caller decides how to report).
 */
export async function syncAlbums() {
  if (!fs.existsSync(ALBUMS_DIR)) {
    throw new Error(`${ALBUMS_DIR} not found`)
  }

  const albums = await readAlbums()
  const site = await readSite()
  fs.writeFileSync(OUT_FILE, generate(albums, site), 'utf8')

  return {
    outFile: OUT_FILE,
    count: albums.length,
    totalImages: albums.reduce((s, a) => s + a.images.length, 0),
    albums: albums.map(a => ({ slug: a.slug, images: a.images.length })),
  }
}

async function main() {
  let result
  try {
    result = await syncAlbums()
  } catch (err) {
    console.error(`✗ ${err.message}`)
    process.exit(1)
  }

  if (result.count === 0) {
    console.error('✗ No valid albums found')
    process.exit(1)
  }

  console.log(`✓ Generated ${path.relative(ROOT, result.outFile)}`)
  console.log(`  ${result.count} albums, ${result.totalImages} images`)
  for (const al of result.albums) {
    console.log(`  · ${al.slug.padEnd(20)} ${String(al.images).padStart(2)} imgs`)
  }
}

// Run as CLI only when executed directly (not when imported).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main()
}
