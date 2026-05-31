#!/usr/bin/env node
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
 *   - type     → "Proyecto" / "Project"
 *   - location → empty
 *   - hero     → first image alphabetically
 *   - order    → numeric prefix in folder name ("02-..." → 2), else 999
 *   - captions → empty
 *
 * Tolerant inputs:
 *   - type/location/caption can be a plain string (used for both languages)
 *     or { es, en }; a missing language falls back to the other.
 *   - a malformed _meta.json warns and falls back to defaults (never crashes
 *     the build).
 *
 * Usage: npm run sync
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const ALBUMS_DIR = path.join(ROOT, 'public', 'albums')
const OUT_FILE = path.join(ROOT, 'src', 'albums.generated.js')

const IMG_EXT = /\.(jpe?g|png|webp|avif)$/i

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

function readAlbums() {
  const slugs = fs.readdirSync(ALBUMS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)

  return slugs.map(slug => {
    const dir = path.join(ALBUMS_DIR, slug)
    const meta = readMeta(slug, path.join(dir, '_meta.json'))

    const images = fs.readdirSync(dir)
      .filter(f => IMG_EXT.test(f))
      .sort()
      .map(file => ({
        file,
        caption: bilingual(meta.captions?.[file]),
      }))

    if (images.length === 0) {
      console.warn(`⚠  ${slug}: no images yet — skipping (drop photos in to publish)`)
      return null
    }

    const title = typeof meta.title === 'string'
      ? meta.title
      : (meta.title && (meta.title.es || meta.title.en)) || titleFromSlug(slug)

    const hero = meta.hero && images.some(i => i.file === meta.hero)
      ? meta.hero
      : images[0].file

    return {
      slug,
      order: orderFromSlug(slug, meta.order),
      title,
      type: bilingual(meta.type, { es: 'Proyecto', en: 'Project' }),
      location: bilingual(meta.location),
      hero,
      images,
    }
  })
  .filter(Boolean)
  .sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug))
}

function generate(albums) {
  const header = `/**
 * AUTO-GENERATED — do not edit by hand.
 * Run \`npm run sync\` to regenerate from public/albums/.
 */
const B = import.meta.env.BASE_URL
const a = (p) => \`\${B}albums/\${p}\`
`

  const albumEntries = albums.map(al => {
    const imgs = al.images.map(img => {
      const cap = JSON.stringify(img.caption)
      return `      { src: a('${al.slug}/${img.file}'), caption: ${cap} },`
    }).join('\n')

    return `  '${al.slug}': {
    order: ${al.order},
    title: ${JSON.stringify(al.title)},
    type: ${JSON.stringify(al.type)},
    location: ${JSON.stringify(al.location)},
    hero: a('${al.slug}/${al.hero}'),
    images: [
${imgs}
    ],
  },`
  }).join('\n')

  const galleryEntries = albums.map((al, i) => {
    const n = String(i + 1).padStart(2, '0')
    return `  {
    n: '${n}',
    slug: '${al.slug}',
    title: ${JSON.stringify(al.title)},
    type: ${JSON.stringify(al.type)},
    location: ${JSON.stringify(al.location)},
    img: a('${al.slug}/${al.hero}'),
  },`
  }).join('\n')

  return `${header}
export const ALBUMS = {
${albumEntries}
}

export const GALLERY = [
${galleryEntries}
]
`
}

function main() {
  if (!fs.existsSync(ALBUMS_DIR)) {
    console.error(`✗ ${ALBUMS_DIR} not found`)
    process.exit(1)
  }

  const albums = readAlbums()

  if (albums.length === 0) {
    console.error('✗ No valid albums found')
    process.exit(1)
  }

  const output = generate(albums)
  fs.writeFileSync(OUT_FILE, output, 'utf8')

  console.log(`✓ Generated ${path.relative(ROOT, OUT_FILE)}`)
  console.log(`  ${albums.length} albums, ${albums.reduce((s, a) => s + a.images.length, 0)} images`)
  for (const al of albums) {
    console.log(`  · ${al.slug.padEnd(20)} ${String(al.images.length).padStart(2)} imgs`)
  }
}

main()
