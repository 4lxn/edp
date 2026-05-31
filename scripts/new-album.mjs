#!/usr/bin/env node
/**
 * new-album.mjs — scaffold a new project album folder.
 *
 * Usage:
 *   npm run new-album <slug> ["Título del proyecto"]
 *
 * Example:
 *   npm run new-album casa-luna "Casa Luna"
 *
 * Creates public/albums/<slug>/_meta.json prefilled with a bilingual
 * template. Then drop your photos into that folder and push — the deploy
 * runs `npm run sync` automatically and publishes the album.
 *
 * Everything in _meta.json is optional: you can delete fields you don't
 * need. Captions are filled in automatically (empty) once you add photos
 * and run `npm run sync`.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const rawSlug = process.argv[2]
const titleArg = process.argv[3]

if (!rawSlug) {
  console.error('Uso: npm run new-album <slug> ["Título"]')
  console.error('Ej.: npm run new-album casa-luna "Casa Luna"')
  process.exit(1)
}

// normalize to a url-safe slug
const slug = rawSlug
  .toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip accents
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

if (!slug) {
  console.error(`✗ "${rawSlug}" no produce un slug válido`)
  process.exit(1)
}

const title = titleArg || slug
  .split('-')
  .map(w => w.charAt(0).toUpperCase() + w.slice(1))
  .join(' ')

const dir = path.join(ROOT, 'public', 'albums', slug)
const metaPath = path.join(dir, '_meta.json')

if (fs.existsSync(metaPath)) {
  console.error(`✗ Ya existe public/albums/${slug}/_meta.json`)
  process.exit(1)
}

fs.mkdirSync(dir, { recursive: true })

const template = {
  order: 999,
  title,
  type: { es: 'Proyecto', en: 'Project' },
  location: { es: '', en: '' },
  captions: {},
}

fs.writeFileSync(metaPath, JSON.stringify(template, null, 2) + '\n', 'utf8')

console.log(`✓ Creado public/albums/${slug}/`)
console.log('')
console.log('Siguientes pasos:')
console.log(`  1. Copia tus fotos a public/albums/${slug}/`)
console.log(`  2. (opcional) Edita _meta.json: ubicación, captions, orden`)
console.log(`  3. npm run sync        # actualiza la galería`)
console.log(`  4. git add -A && git commit -m "feat: álbum ${slug}" && git push`)
console.log('')
console.log('El deploy publica solo al hacer push a main.')
