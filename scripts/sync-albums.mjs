/**
 * sync-albums.mjs
 *
 * Scans `public/albums/<slug>/` folders and generates
 * `src/albums.generated.js` with ALBUMS and GALLERY.
 *
 * Folder convention:
 *   public/albums/<slug>/_meta.json   → metadata (title, type, captions, etc.)
 *   public/albums/<slug>/*.{jpg,jpeg,png,webp} → images
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

function readAlbums() {
  const slugs = fs.readdirSync(ALBUMS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)

  return slugs.map(slug => {
    const dir = path.join(ALBUMS_DIR, slug)
    const metaPath = path.join(dir, '_meta.json')

    if (!fs.existsSync(metaPath)) {
      console.warn(`⚠  ${slug}: missing _meta.json — skipping`)
      return null
    }

    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'))

    const files = fs.readdirSync(dir).filter(f => IMG_EXT.test(f))
    const images = orderImages(files, meta.imageOrder).map(file => ({
      file,
      caption: meta.captions?.[file] ?? { es: '', en: '' },
    }))

    if (images.length === 0) {
      console.warn(`⚠  ${slug}: no images found — skipping`)
      return null
    }

    const hero = meta.hero && images.find(i => i.file === meta.hero)
      ? meta.hero
      : images[0].file

    return {
      slug,
      order: meta.order ?? 999,
      featured: meta.featured ?? false,
      title: meta.title,
      type: meta.type,
      location: meta.location,
      hero,
      images,
    }
  })
  .filter(Boolean)
  .sort((a, b) => a.order - b.order)
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
    featured: ${al.featured},
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

/**
 * Regenerate src/albums.generated.js from public/albums/.
 * Returns a summary; throws on hard errors (caller decides how to report).
 */
export function syncAlbums() {
  if (!fs.existsSync(ALBUMS_DIR)) {
    throw new Error(`${ALBUMS_DIR} not found`)
  }

  const albums = readAlbums()
  const output = generate(albums)
  fs.writeFileSync(OUT_FILE, output, 'utf8')

  return {
    outFile: OUT_FILE,
    count: albums.length,
    totalImages: albums.reduce((s, a) => s + a.images.length, 0),
    albums: albums.map(a => ({ slug: a.slug, images: a.images.length })),
  }
}

function main() {
  let result
  try {
    result = syncAlbums()
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
