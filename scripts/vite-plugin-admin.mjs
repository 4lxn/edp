/**
 * vite-plugin-admin.mjs
 *
 * DEV-ONLY local admin API for managing photo albums.
 * Mounts a tiny JSON API under /__albums/api/* on the Vite dev server. It writes
 * files into public/albums/<slug>/, optimizes uploaded images with sharp, and
 * regenerates src/albums.generated.js via syncAlbums() after each change.
 *
 * This plugin only applies during `vite serve` (development). It is NEVER part of
 * the production build, so the static site never exposes write endpoints.
 */
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { syncAlbums, ALBUMS_DIR, IMG_EXT } from './sync-albums.mjs'

const API_PREFIX = '/__albums/api'
const MAX_LONG_SIDE = 2400
const JPEG_QUALITY = 80

const isValidSlug = (s) => /^[a-z0-9][a-z0-9-]*$/.test(s)
const albumDir = (slug) => path.join(ALBUMS_DIR, slug)
const metaPath = (slug) => path.join(albumDir(slug), '_meta.json')

function send(res, status, data) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(data))
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (c) => {
      body += c
      if (body.length > 80 * 1024 * 1024) reject(new Error('payload too large'))
    })
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}) }
      catch (e) { reject(e) }
    })
    req.on('error', reject)
  })
}

function readMeta(slug) {
  const p = metaPath(slug)
  if (!fs.existsSync(p)) return {}
  try { return JSON.parse(fs.readFileSync(p, 'utf8')) }
  catch { return {} }
}

function writeMeta(slug, meta) {
  fs.mkdirSync(albumDir(slug), { recursive: true })
  fs.writeFileSync(metaPath(slug), JSON.stringify(meta, null, 2) + '\n', 'utf8')
}

function listImageFiles(slug) {
  const dir = albumDir(slug)
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).filter((f) => IMG_EXT.test(f)).sort()
}

function nextImageName(slug) {
  const files = listImageFiles(slug)
  let max = 0
  for (const f of files) {
    const m = f.match(/^(\d+)/)
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  let n = max + 1
  let name = `${String(n).padStart(2, '0')}.jpeg`
  while (fs.existsSync(path.join(albumDir(slug), name))) {
    n += 1
    name = `${String(n).padStart(2, '0')}.jpeg`
  }
  return name
}

function listAlbums() {
  if (!fs.existsSync(ALBUMS_DIR)) return []
  return fs.readdirSync(ALBUMS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const slug = d.name
      const meta = readMeta(slug)
      return { slug, ...meta, files: listImageFiles(slug) }
    })
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
}

async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost')
  const parts = url.pathname.slice(API_PREFIX.length).split('/').filter(Boolean)
  const [resource, slug] = parts

  // GET /albums
  if (req.method === 'GET' && resource === 'albums') {
    return send(res, 200, { albums: listAlbums() })
  }

  if (slug && !isValidSlug(slug)) {
    return send(res, 400, { error: 'invalid slug (use kebab-case: a-z, 0-9, -)' })
  }

  // POST /album/:slug — create/update _meta.json
  if (req.method === 'POST' && resource === 'album' && slug) {
    const meta = await readJson(req)
    writeMeta(slug, meta)
    const summary = syncAlbums()
    return send(res, 200, { ok: true, meta: readMeta(slug), files: listImageFiles(slug), summary })
  }

  // DELETE /album/:slug — remove the whole album folder
  if (req.method === 'DELETE' && resource === 'album' && slug) {
    const dir = albumDir(slug)
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true })
    const summary = syncAlbums()
    return send(res, 200, { ok: true, summary })
  }

  // POST /upload/:slug — { filename, dataBase64 } → optimize → write
  if (req.method === 'POST' && resource === 'upload' && slug) {
    const { dataBase64 } = await readJson(req)
    if (!dataBase64) return send(res, 400, { error: 'missing dataBase64' })
    const raw = Buffer.from(String(dataBase64).replace(/^data:[^,]+,/, ''), 'base64')
    const out = await sharp(raw)
      .rotate() // honor EXIF orientation
      .resize(MAX_LONG_SIDE, MAX_LONG_SIDE, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer()

    const name = nextImageName(slug)
    fs.mkdirSync(albumDir(slug), { recursive: true })
    fs.writeFileSync(path.join(albumDir(slug), name), out)

    const meta = readMeta(slug)
    meta.title = meta.title || slug
    meta.type = meta.type || { es: '', en: '' }
    meta.location = meta.location || { es: '', en: '' }
    meta.captions = meta.captions || {}
    if (!meta.captions[name]) meta.captions[name] = { es: '', en: '' }
    meta.imageOrder = Array.isArray(meta.imageOrder) ? meta.imageOrder : []
    if (!meta.imageOrder.includes(name)) meta.imageOrder.push(name)
    if (!meta.hero) meta.hero = name
    writeMeta(slug, meta)
    syncAlbums()

    return send(res, 200, {
      ok: true, file: name, bytes: out.length,
      meta: readMeta(slug), files: listImageFiles(slug),
    })
  }

  // POST /delete-image/:slug — { file }
  if (req.method === 'POST' && resource === 'delete-image' && slug) {
    const { file } = await readJson(req)
    const safe = path.basename(String(file || ''))
    const fp = path.join(albumDir(slug), safe)
    if (safe && fs.existsSync(fp)) fs.rmSync(fp)

    const meta = readMeta(slug)
    if (meta.captions) delete meta.captions[safe]
    if (Array.isArray(meta.imageOrder)) meta.imageOrder = meta.imageOrder.filter((f) => f !== safe)
    if (meta.hero === safe) meta.hero = listImageFiles(slug)[0] || ''
    writeMeta(slug, meta)
    syncAlbums()

    return send(res, 200, { ok: true, meta: readMeta(slug), files: listImageFiles(slug) })
  }

  return send(res, 404, { error: 'not found' })
}

export default function adminPlugin() {
  return {
    name: 'edp-album-admin',
    apply: 'serve', // dev only — never in production build
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url || !req.url.startsWith(API_PREFIX)) return next()
        handle(req, res).catch((err) => {
          console.error('[admin api]', err)
          send(res, 500, { error: err.message || 'server error' })
        })
      })
    },
  }
}
