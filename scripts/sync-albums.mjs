#!/usr/bin/env node
/**
 * sync-albums.mjs
 *
 * Scans `public/albums/<slug>/` folders and generates
 * `src/albums.generated.js` with PROJECT_ALBUMS and GALLERY_ITEMS.
 *
 * Folder convention:
 *   public/albums/<slug>/_meta.json   → metadata (title, type, captions, etc.)
 *   public/albums/<slug>/*.{jpg,jpeg,png,webp} → images, sorted alphabetically
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

    const images = fs.readdirSync(dir)
      .filter(f => IMG_EXT.test(f))
      .sort()
      .map(file => ({
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
