/**
 * Album + site-copy operations on a content store (see content-store.mjs).
 * Shared by the online admin (server/admin-api.mjs) and `npm run dev`.
 */
import crypto from 'node:crypto'
import path from 'node:path'
import sharp from 'sharp'
import { ALBUMS_PREFIX, SITE_PATH } from './content-store.mjs'

export const IMG_EXT = /\.(jpe?g|png|webp|avif)$/i
export const isValidSlug = (s) => typeof s === 'string' && /^[a-z0-9][a-z0-9-]{0,60}$/.test(s)

const MAX_LONG_SIDE = 2400
const JPEG_QUALITY = 80
const ALBUMS_DIR = ALBUMS_PREFIX.slice(0, -1) // "public/albums"

/** An error whose message is safe and useful to show in the admin. */
export class UserError extends Error {
  constructor(message, status = 400) { super(message); this.status = status }
}

const dirOf = (slug) => `${ALBUMS_DIR}/${slug}`
const metaPath = (slug) => `${dirOf(slug)}/_meta.json`

const titleFromSlug = (slug) => slug.replace(/^\d+[-_]/, '').split(/[-_]/).filter(Boolean)
  .map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

const text = (v, max) => String(v ?? '').slice(0, max)
const pair = (v, max = 200) =>
  typeof v === 'string' ? { es: text(v, max), en: text(v, max) } : { es: text(v?.es, max), en: text(v?.en, max) }
const photoName = (f) => (typeof f === 'string' && IMG_EXT.test(f) ? path.posix.basename(f) : null)
function pairMap(obj, max) {
  const out = {}
  for (const [k, v] of Object.entries(obj && typeof obj === 'object' ? obj : {})) {
    const name = photoName(k)
    const p = pair(v, max)
    if (name && (p.es || p.en)) out[name] = p
  }
  return out
}

export async function readMeta(store, slug) {
  const buf = await store.read(metaPath(slug))
  if (!buf) return {}
  try { return JSON.parse(buf) } catch { return {} }
}

export async function listPhotos(store, slug) {
  const { files } = await store.list(dirOf(slug))
  return files.filter((f) => IMG_EXT.test(f))
}

export async function listAlbums(store) {
  const { dirs } = await store.list(ALBUMS_DIR)
  const out = []
  for (const slug of dirs.filter(isValidSlug)) {
    out.push({ ...(await readMeta(store, slug)), slug, files: await listPhotos(store, slug) })
  }
  return out.sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.slug.localeCompare(b.slug))
}

/** Writes _meta.json with only the known fields, in a stable order. */
export async function saveAlbum(store, slug, meta) {
  if (!isValidSlug(slug)) throw new UserError('Nombre de carpeta inválido (usa a-z, 0-9 y guiones)')
  const files = await listPhotos(store, slug)
  const order = meta.order === '' || meta.order == null ? NaN : Number(meta.order)
  const imageOrder = [...new Set((Array.isArray(meta.imageOrder) ? meta.imageOrder : []).map(photoName))]
    .filter((f) => f && files.includes(f))
  const hero = photoName(meta.hero)
  const clean = {
    order: Number.isFinite(order) ? order : 999,
    featured: !!meta.featured,
    title: text(meta.title, 120) || titleFromSlug(slug),
    type: pair(meta.type),
    location: pair(meta.location),
    description: pair(meta.description, 700),
    hero: files.includes(hero) ? hero : (imageOrder[0] || files[0] || ''),
    imageOrder,
    captions: pairMap(meta.captions),
    alts: pairMap(meta.alts, 300),
  }
  await store.write(metaPath(slug), JSON.stringify(clean, null, 2) + '\n')
  return clean
}

export async function createAlbum(store, slug, title) {
  if (!isValidSlug(slug)) throw new UserError('Nombre de carpeta inválido (usa a-z, 0-9 y guiones)')
  const albums = await listAlbums(store)
  if (albums.some((a) => a.slug === slug)) throw new UserError('Ya existe un proyecto con ese nombre')
  const order = albums.reduce((m, a) => Math.max(m, Number(a.order) || 0), 0) + 1
  return saveAlbum(store, slug, { title, order })
}

export async function deleteAlbum(store, slug) {
  if (!isValidSlug(slug)) throw new UserError('Proyecto inválido')
  await store.removeDir(dirOf(slug))
}

// Never reuses a name, so a new photo can't inherit a deleted one's
// caption/alt or its cached /_img/ versions.
async function nextPhotoName(store, slug) {
  const files = await listPhotos(store, slug)
  const max = files.reduce((m, f) => Math.max(m, parseInt(f, 10) || 0), 0)
  return `${String(max + 1).padStart(2, '0')}-${crypto.randomBytes(3).toString('hex')}.jpeg`
}

/** Optimizes an uploaded photo (≤2400 px, JPEG) and appends it to the album. */
export async function addPhoto(store, slug, buffer) {
  if (!isValidSlug(slug)) throw new UserError('Proyecto inválido')
  let format
  try { ({ format } = await sharp(buffer, { failOn: 'none' }).metadata()) } catch { format = null }
  if (!['jpeg', 'png', 'webp', 'avif', 'tiff', 'gif'].includes(format)) {
    throw new UserError('Formato no soportado. Sube JPG o PNG (en iPhone: Ajustes › Cámara › Formatos › "Más compatible").')
  }
  const out = await sharp(buffer, { failOn: 'none' })
    .rotate() // honor EXIF orientation
    .resize(MAX_LONG_SIDE, MAX_LONG_SIDE, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer()

  const name = await nextPhotoName(store, slug)
  await store.write(`${dirOf(slug)}/${name}`, out)
  const meta = await readMeta(store, slug)
  const order = Array.isArray(meta.imageOrder) && meta.imageOrder.length ? meta.imageOrder : await listPhotos(store, slug)
  await saveAlbum(store, slug, { ...meta, imageOrder: [...order.filter((f) => f !== name), name] })
  return { name, bytes: out.length }
}

export async function deletePhoto(store, slug, file) {
  const name = photoName(file)
  if (!isValidSlug(slug) || !name) throw new UserError('Foto inválida')
  await store.remove(`${dirOf(slug)}/${name}`)
  const meta = await readMeta(store, slug)
  if (meta.captions) delete meta.captions[name]
  if (meta.alts) delete meta.alts[name]
  if (Array.isArray(meta.imageOrder)) meta.imageOrder = meta.imageOrder.filter((f) => f !== name)
  if (meta.hero === name) meta.hero = ''
  await saveAlbum(store, slug, meta)
}

export async function readPhoto(store, slug, file) {
  const name = photoName(file)
  if (!isValidSlug(slug) || !name) return null
  return store.read(`${dirOf(slug)}/${name}`)
}

/* ---------- Site copy (src/content/site.json) ---------- */

export async function readSite(store) {
  const buf = await store.read(SITE_PATH)
  if (!buf) throw new UserError('No se encontró src/content/site.json', 500)
  return JSON.parse(buf)
}

// Strings may change freely; keys, types and list lengths must stay the same,
// because every page reads the copy by that structure.
function sameShape(a, b, where) {
  if (typeof a === 'string') {
    if (typeof b !== 'string') throw new UserError(`"${where}" debe ser texto`)
    if (b.length > 4000) throw new UserError(`"${where}" es demasiado largo`)
    return
  }
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || b.length !== a.length) throw new UserError(`"${where}" debe tener ${a.length} elementos`)
    a.forEach((v, i) => sameShape(v, b[i], `${where}[${i + 1}]`))
    return
  }
  if (a && typeof a === 'object') {
    if (!b || typeof b !== 'object' || Array.isArray(b)) throw new UserError(`"${where}" tiene un formato inválido`)
    for (const k of Object.keys(a)) sameShape(a[k], b[k], where ? `${where}.${k}` : k)
    return
  }
  if (typeof b !== typeof a) throw new UserError(`"${where}" tiene un formato inválido`)
}

// The incoming copy projected onto the current structure (drops unknown keys).
const pick = (a, b) => (typeof a === 'string' ? b
  : Array.isArray(a) ? a.map((v, i) => pick(v, b[i]))
  : Object.fromEntries(Object.keys(a).map((k) => [k, pick(a[k], b[k])])))

export async function saveSite(store, next) {
  const current = await readSite(store)
  sameShape(current.es, next?.es, 'es')
  sameShape(current.en, next?.en, 'en')
  const b = next?.business || {}
  const social = (Array.isArray(b.social) ? b.social : [])
    .map((u) => text(u, 300).trim()).filter((u) => /^https:\/\/[^\s]+$/.test(u))
  const business = {
    name: text(b.name, 120) || current.business.name,
    email: text(b.email, 120).trim(),
    phone: text(b.phone, 40).trim(),
    whatsapp: text(b.whatsapp, 40).trim(),
    social,
    legalName: text(b.legalName, 200).trim(),
    address: text(b.address, 300).trim(),
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(business.email)) throw new UserError('El correo de contacto no es válido')
  const out = { business, es: pick(current.es, next.es), en: pick(current.en, next.en) }
  await store.write(SITE_PATH, JSON.stringify(out, null, 2) + '\n')
  return out
}
