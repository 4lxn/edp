/**
 * Album + site-copy operations on a content store (see content-store.mjs).
 * Shared by the online admin (server/admin-api.mjs) and `npm run dev`.
 *
 * Everything that reaches the pages is validated here, so nothing saved from
 * the admin can break the build (scripts/prerender.mjs fails on empty titles
 * or descriptions and on "undefined"/"NaN"/"[object Object]" in a page).
 */
import crypto from 'node:crypto'
import sharp from 'sharp'
import { ALBUMS_PREFIX, SITE_PATH } from './content-store.mjs'

export const IMG_EXT = /\.(jpe?g|png|webp|avif)$/i
export const isValidSlug = (s) => typeof s === 'string' && /^[a-z0-9][a-z0-9-]{0,60}$/.test(s)
/** Largest photo sharp may open, in pixels (~100 MP covers phone cameras). */
export const MAX_PIXELS = 100_000_000

// A photo file name: no folders, spaces or backslashes.
const PHOTO_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,120}\.(jpe?g|png|webp|avif)$/i
const BUILD_TRAPS = /undefined|NaN|\[object Object\]/
const MAX_LONG_SIDE = 2400
const JPEG_QUALITY = 80
const ALBUMS_DIR = ALBUMS_PREFIX.slice(0, -1) // "public/albums"
const FORMAT_HELP = 'Formato no soportado. Sube JPG o PNG (en iPhone: Ajustes › Cámara › Formatos › "Más compatible").'

/** An error whose message is safe and useful to show in the admin. */
export class UserError extends Error {
  constructor(message, status = 400) { super(message); this.status = status }
}

const dirOf = (slug) => `${ALBUMS_DIR}/${slug}`
const metaPath = (slug) => `${dirOf(slug)}/_meta.json`

// Same defaults as scripts/sync-albums.mjs.
const titleFromSlug = (slug) => slug.replace(/^\d+[-_]/, '').split(/[-_]/).filter(Boolean)
  .map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
function orderOf(slug, value) {
  const n = value === '' || value == null ? NaN : Number(value)
  if (Number.isFinite(n)) return n
  const m = slug.match(/^(\d+)[-_]/)
  return m ? parseInt(m[1], 10) : 999
}

function text(v, max, label) {
  const s = String(v ?? '').slice(0, max)
  if (BUILD_TRAPS.test(s)) throw new UserError(`«${label}» no puede contener «undefined», «NaN» ni «[object Object]».`)
  return s
}
const pair = (v, max, label) =>
  typeof v === 'string' ? { es: text(v, max, label), en: text(v, max, label) } : { es: text(v?.es, max, label), en: text(v?.en, max, label) }
const photoName = (f) => (typeof f === 'string' && PHOTO_NAME.test(f) ? f : null)
function pairMap(obj, max, label) {
  const out = {}
  for (const [k, v] of Object.entries(obj && typeof obj === 'object' ? obj : {})) {
    const name = photoName(k)
    const p = pair(v, max, label)
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
    const meta = await readMeta(store, slug)
    out.push({ ...meta, slug, order: orderOf(slug, meta.order), files: await listPhotos(store, slug) })
  }
  return out.sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug))
}

/** Writes _meta.json with only the known fields, in a stable order. */
export async function saveAlbum(store, slug, meta) {
  if (!isValidSlug(slug)) throw new UserError('Nombre de carpeta inválido (usa a-z, 0-9 y guiones)')
  const files = await listPhotos(store, slug)
  const imageOrder = [...new Set((Array.isArray(meta.imageOrder) ? meta.imageOrder : []).map(photoName))]
    .filter((f) => f && files.includes(f))
  const hero = photoName(meta.hero)
  // sync-albums also accepts a { es, en } title; the site shows one.
  const title = meta.title && typeof meta.title === 'object' ? meta.title.es || meta.title.en : meta.title
  const clean = {
    order: orderOf(slug, meta.order),
    featured: !!meta.featured,
    title: text(title, 120, 'Nombre').trim() || titleFromSlug(slug),
    type: pair(meta.type, 200, 'Tipo de obra'),
    location: pair(meta.location, 200, 'Ubicación'),
    description: pair(meta.description, 700, 'Descripción'),
    hero: files.includes(hero) ? hero : (imageOrder[0] || files[0] || ''),
    imageOrder,
    captions: pairMap(meta.captions, 200, 'Pie de foto'),
    alts: pairMap(meta.alts, 300, 'Descripción para Google'),
  }
  await store.write(metaPath(slug), JSON.stringify(clean, null, 2) + '\n')
  return clean
}

export async function createAlbum(store, slug, title) {
  if (!isValidSlug(slug)) throw new UserError('Nombre de carpeta inválido (usa a-z, 0-9 y guiones)')
  const albums = await listAlbums(store)
  if (albums.some((a) => a.slug === slug)) throw new UserError('Ya existe un proyecto con ese nombre')
  // Right after the last numbered album (999 = "no order" doesn't count).
  const order = albums.reduce((m, a) => (a.order < 999 ? Math.max(m, a.order) : m), 0) + 1
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
  if (!(await store.list(ALBUMS_DIR)).dirs.includes(slug)) throw new UserError('Ese proyecto no existe', 404)
  const open = () => sharp(buffer, { failOn: 'none', limitInputPixels: MAX_PIXELS })
  let info = null
  try { info = await open().metadata() } catch { /* not an image */ }
  // sharp reports AVIF as HEIF with AV1 compression; iPhone HEIC (HEVC) can't be decoded.
  const avif = info?.format === 'heif' && info?.compression === 'av1'
  if (!info || !(avif || ['jpeg', 'png', 'webp', 'tiff', 'gif'].includes(info.format))) throw new UserError(FORMAT_HELP)
  if ((info.width || 0) * (info.height || 0) > MAX_PIXELS) throw new UserError('La foto es demasiado grande (más de 100 megapíxeles).')
  let out
  try {
    out = await open()
      .rotate() // honor EXIF orientation
      .resize(MAX_LONG_SIDE, MAX_LONG_SIDE, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer()
  } catch {
    throw new UserError('No se pudo procesar la foto. Prueba exportarla como JPG.')
  }

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

// Words may change freely, but keys, types and list lengths must stay the
// same (every page reads the copy by that structure), and a text that had
// words can't become empty (titles and descriptions are required).
function sameShape(a, b, where) {
  if (typeof a === 'string') {
    if (typeof b !== 'string') throw new UserError(`"${where}" debe ser texto`)
    if (b.length > 4000) throw new UserError(`"${where}" es demasiado largo`)
    if (a.trim() && !b.trim()) throw new UserError(`"${where}" no puede quedar vacío`)
    if (BUILD_TRAPS.test(b) && !BUILD_TRAPS.test(a)) {
      throw new UserError(`"${where}" no puede contener «undefined», «NaN» ni «[object Object]».`)
    }
    return
  }
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || b.length !== a.length) throw new UserError(`"${where}" debe tener ${a.length} elementos`)
    a.forEach((v, i) => sameShape(v, b[i], `${where}[${i + 1}]`))
    return
  }
  if (a !== null && typeof a === 'object') {
    if (!b || typeof b !== 'object' || Array.isArray(b)) throw new UserError(`"${where}" tiene un formato inválido`)
    for (const k of Object.keys(a)) sameShape(a[k], b[k], where ? `${where}.${k}` : k)
    return
  }
  if (a === null ? b !== null : typeof b !== typeof a) throw new UserError(`"${where}" tiene un formato inválido`)
}

// The incoming copy projected onto the current structure (drops unknown keys).
const pick = (a, b) => (Array.isArray(a) ? a.map((v, i) => pick(v, b[i]))
  : a !== null && typeof a === 'object' ? Object.fromEntries(Object.keys(a).map((k) => [k, pick(a[k], b[k])]))
  : b)

const EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/

export async function saveSite(store, next) {
  const current = await readSite(store)
  sameShape(current.es, next?.es, 'es')
  sameShape(current.en, next?.en, 'en')
  const b = next?.business && typeof next.business === 'object' ? next.business : {}
  const social = (Array.isArray(b.social) ? b.social : [])
    .map((u) => String(u ?? '').slice(0, 300).trim())
    .filter((u) => /^https:\/\/[^\s"<>]+$/.test(u) && !BUILD_TRAPS.test(u))
  const business = {
    ...current.business, // fields this editor doesn't know about stay as they are
    name: text(b.name, 120, 'Nombre').trim() || current.business.name,
    email: String(b.email ?? '').trim().slice(0, 120),
    phone: text(b.phone, 40, 'Teléfono').trim(),
    whatsapp: text(b.whatsapp, 40, 'WhatsApp').trim(),
    social,
    legalName: text(b.legalName, 200, 'Responsable').trim(),
    address: text(b.address, 300, 'Domicilio').trim(),
  }
  if (!EMAIL.test(business.email)) throw new UserError('El correo de contacto no es válido')
  const out = { business, es: pick(current.es, next.es), en: pick(current.en, next.en) }
  for (const k of Object.keys(current)) if (!(k in out)) out[k] = current[k]
  await store.write(SITE_PATH, JSON.stringify(out, null, 2) + '\n')
  return out
}
