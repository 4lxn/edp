/**
 * On-demand responsive images.
 *
 * GET /_img/<width|og>/<avif|webp|jpeg>/<path under the source root>
 *
 * Resizes + re-encodes the source photo with sharp on first request, writes the
 * result to a disk cache and serves it from there afterwards. Used by the
 * production server (server/index.mjs) and by `npm run dev` (vite plugin), so
 * album photos uploaded later need no rebuild.
 *
 * Cache entries are keyed by a hash of the source file's CONTENT (not its
 * timestamp — every build copies public/ into dist/ with fresh mtimes), so a
 * volume-backed cache survives deploys and ETags stay stable.
 *
 * Only whitelisted sizes/formats and files under albums/ or assets/ are
 * accepted, so the cache can't be flooded with arbitrary variants.
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { pipeline } from 'node:stream'
import sharp from 'sharp'
import { IMG_PREFIX, WIDTHS, FORMATS } from '../src/images.js'

export { IMG_PREFIX }

// Bump when the encoder settings below change, so old variants aren't reused.
const VARIANT_VERSION = 'v1'
const SOURCE_EXT = /\.(jpe?g|png|webp|avif)$/i
const ALLOWED_DIRS = ['albums/', 'assets/']
const FILE_EXT = { avif: 'avif', webp: 'webp', jpeg: 'jpg' }
const MIME = { avif: 'image/avif', webp: 'image/webp', jpeg: 'image/jpeg' }
const CACHE_CONTROL = 'public, max-age=2592000, stale-while-revalidate=86400'

sharp.cache({ memory: 64 })

/** Parse "/_img/800/avif/albums/x/01.jpeg" → { size, format, rel } or null. */
export function parseImagePath(pathname) {
  if (!pathname.startsWith(IMG_PREFIX)) return null
  const [size, format, ...rest] = pathname.slice(IMG_PREFIX.length).split('/')
  if (!rest.length) return null

  const width = Number(size)
  const isOg = size === 'og'
  if (!isOg && !WIDTHS.includes(width)) return null
  if (!FORMATS.includes(format) || (isOg && format !== 'jpeg')) return null

  let rel
  try { rel = rest.map(decodeURIComponent).join('/') } catch { return null }
  if (rel.includes('..') || rel.includes('\\') || rel.includes('\0') || !SOURCE_EXT.test(rel)) return null
  if (!ALLOWED_DIRS.some((d) => rel.startsWith(d))) return null

  return { size: isOg ? 'og' : width, format, rel }
}

function encode(input, { size, format }) {
  let img = sharp(input, { failOn: 'none' }).rotate()
  img = size === 'og'
    ? img.resize(1200, 630, { fit: 'cover', position: 'attention' })
    : img.resize({ width: size, withoutEnlargement: true })
  // effort 2: ~5× faster than the default 4 for files only ~2–5% larger
  if (format === 'avif') return img.avif({ quality: 50, effort: 2 }).toBuffer()
  if (format === 'webp') return img.webp({ quality: 72 }).toBuffer()
  return img.jpeg({ quality: size === 'og' ? 82 : 78, mozjpeg: true, progressive: true }).toBuffer()
}

/** sha1 of a file's content, streamed (photos are a few MB). */
function hashFile(file) {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash('sha1')
    fs.createReadStream(file)
      .on('error', reject)
      .on('data', (chunk) => h.update(chunk))
      .on('end', () => resolve(h.digest('hex').slice(0, 12)))
  })
}

/**
 * @param {{ sourceRoot: string, cacheDir: string, maxConcurrent?: number }} opts
 * @returns {(req, res, next?) => void} connect-style middleware
 */
export function createImageHandler({ sourceRoot, cacheDir, maxConcurrent = 2 }) {
  const root = path.resolve(sourceRoot) + path.sep
  const hashes = new Map() // srcPath → { size, mtimeMs, hash }
  const inFlight = new Map()
  let active = 0
  const queue = []

  const withSlot = async (fn) => {
    if (active >= maxConcurrent) await new Promise((r) => queue.push(r))
    active++
    try { return await fn() } finally {
      active--
      queue.shift()?.()
    }
  }

  async function sourceHash(srcPath, st) {
    const known = hashes.get(srcPath)
    if (known && known.size === st.size && known.mtimeMs === st.mtimeMs) return known.hash
    const hash = await hashFile(srcPath)
    hashes.set(srcPath, { size: st.size, mtimeMs: st.mtimeMs, hash })
    return hash
  }

  async function variant(job, srcPath, hash) {
    const out = path.join(cacheDir, VARIANT_VERSION, String(job.size), job.format,
      `${job.rel}.${hash}.${FILE_EXT[job.format]}`)
    try {
      return { file: out, stat: await fsp.stat(out) }
    } catch { /* not cached yet */ }

    if (!inFlight.has(out)) {
      inFlight.set(out, withSlot(async () => {
        const buf = await encode(srcPath, job)
        await fsp.mkdir(path.dirname(out), { recursive: true })
        const tmp = `${out}.${process.pid}.${Date.now()}.tmp`
        await fsp.writeFile(tmp, buf)
        await fsp.rename(tmp, out)
      }).finally(() => inFlight.delete(out)))
    }
    await inFlight.get(out)
    return { file: out, stat: await fsp.stat(out) }
  }

  return async function imageHandler(req, res, next) {
    let pathname
    try { pathname = new URL(req.url, 'http://x').pathname } catch { return notFound(res) }
    if (!pathname.startsWith(IMG_PREFIX)) return next ? next() : notFound(res)
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' })
      return res.end()
    }

    const job = parseImagePath(pathname)
    if (!job) return notFound(res)

    const srcPath = path.resolve(root, job.rel)
    if (!srcPath.startsWith(root)) return notFound(res)

    let srcStat
    try { srcStat = await fsp.stat(srcPath) } catch { return notFound(res) }
    if (!srcStat.isFile()) return notFound(res)

    try {
      const hash = await sourceHash(srcPath, srcStat)
      const { file, stat } = await variant(job, srcPath, hash)
      const etag = `"${VARIANT_VERSION}-${hash}-${job.size}-${job.format}"`
      if (req.headers['if-none-match'] === etag) {
        res.writeHead(304, { ETag: etag, 'Cache-Control': CACHE_CONTROL })
        return res.end()
      }
      res.writeHead(200, {
        'Content-Type': MIME[job.format],
        'Content-Length': stat.size,
        'Cache-Control': CACHE_CONTROL,
        ETag: etag,
      })
      if (req.method === 'HEAD') return res.end()
      pipeline(fs.createReadStream(file), res, (err) => {
        if (err && err.code !== 'ERR_STREAM_PREMATURE_CLOSE') console.error('[img] stream', pathname, err.message)
      })
    } catch (err) {
      console.error('[img]', pathname, err.message)
      if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain' })
      res.end('image error')
    }
  }
}

function notFound(res) {
  res.writeHead(404, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' })
  res.end('not found')
}
