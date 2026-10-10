/**
 * Production server (Railway).
 *
 * - Serves the pre-rendered site from dist/client (clean URLs: /proyectos →
 *   proyectos/index.html), with pre-compressed .br/.gz files when available.
 * - Resizes photos on demand under /_img/ (see server/images.mjs) and caches
 *   them on disk — on Railway, mount a volume and the cache survives deploys.
 * - Unknown paths get the pre-rendered 404 page (per language) with a real
 *   404 status.
 *
 * Run `npm run build` first, then `npm start`. Railway sets PORT.
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sirv from 'sirv'
import { createImageHandler, IMG_PREFIX } from './images.mjs'
import { OverlayStore } from './content-store.mjs'
import { createAdminApi } from './admin-api.mjs'
import { createPublisher } from './github.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CLIENT_DIR = path.join(ROOT, 'dist', 'client')
const WARM_LIST = path.join(ROOT, 'dist', 'img-warm.json')
const PORT = Number(process.env.PORT) || 3000
const SITE_URL = (process.env.SITE_URL || 'https://estructurasdelpacifico.com').replace(/\/+$/, '')
const SITE_HOST = new URL(SITE_URL).host
// Persistent storage: the Railway volume (image cache + unpublished admin edits).
const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(ROOT, '.data')
const CACHE_DIR = process.env.IMG_CACHE_DIR || path.join(DATA_DIR, 'img-cache')

if (!fs.existsSync(path.join(CLIENT_DIR, 'index.html'))) {
  console.error('✗ dist/client not found — run `npm run build` first')
  process.exit(1)
}

const NOT_FOUND = {
  es: fs.readFileSync(path.join(CLIENT_DIR, '404.html')),
  en: fs.readFileSync(path.join(CLIENT_DIR, 'en', '404.html')),
}

const BASE_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000',
}

const isAdminPage = (pathname) => pathname === '/admin' || pathname.startsWith('/admin/')

function cacheControl(pathname) {
  if (isAdminPage(pathname)) return 'no-store'
  // Vite output (JS, CSS, fonts) has content hashes in the file names.
  if (pathname.startsWith('/_app/')) return 'public, max-age=31536000, immutable'
  if (/\.(jpe?g|png|webp|avif|svg|ico)$/i.test(pathname)) return 'public, max-age=86400'
  if (/\.(xml|txt)$/i.test(pathname)) return 'public, max-age=3600'
  // HTML pages: browsers always revalidate; the CDN may keep a copy for a
  // minute and serve it while revalidating — which also covers the few
  // seconds a deploy takes (Railway purges cached HTML on each deploy).
  return 'public, max-age=0, s-maxage=60, stale-while-revalidate=600'
}

const images = createImageHandler({ sourceRoot: CLIENT_DIR, cacheDir: CACHE_DIR })

const serveStatic = sirv(CLIENT_DIR, {
  etag: true,
  gzip: true,
  brotli: true,
  extensions: ['html'],
  setHeaders: (res, pathname) => {
    res.setHeader('Cache-Control', cacheControl(pathname))
    if (isAdminPage(pathname)) res.setHeader('X-Robots-Tag', 'noindex')
  },
})

/* ---------- Admin (/admin page + /admin/api) ---------- */
const repo = process.env.GITHUB_REPO
  || (process.env.RAILWAY_GIT_REPO_OWNER && `${process.env.RAILWAY_GIT_REPO_OWNER}/${process.env.RAILWAY_GIT_REPO_NAME}`)
const branch = process.env.GITHUB_BRANCH || process.env.RAILWAY_GIT_BRANCH
const publisher = process.env.GITHUB_TOKEN && repo && branch
  ? createPublisher({ token: process.env.GITHUB_TOKEN, repo, branch, apiUrl: process.env.GITHUB_API_URL })
  : null
const adminApi = await createAdminApi({
  store: new OverlayStore({ root: ROOT, dataDir: DATA_DIR }),
  mode: 'prod',
  password: process.env.ADMIN_PASSWORD,
  dataDir: DATA_DIR,
  publisher,
  deployedSha: process.env.RAILWAY_GIT_COMMIT_SHA || process.env.DEPLOYED_SHA,
})
console.log(`  admin: ${process.env.ADMIN_PASSWORD ? 'password set' : 'disabled (no ADMIN_PASSWORD)'}`
  + ` · publish: ${publisher ? `${repo}@${branch}` : 'off (needs GITHUB_TOKEN)'}`)

/** Split a raw request target into path + query without URL parsing (which
 *  would treat "//host/…" as an authority and can throw on garbage). */
function splitTarget(raw = '/') {
  const q = raw.indexOf('?')
  const pathname = q === -1 ? raw : raw.slice(0, q)
  const search = q === -1 ? '' : raw.slice(q)
  // Only origin-form paths with a single leading slash are served.
  if (!pathname.startsWith('/') || pathname.startsWith('//') || pathname.includes('\\')) return null
  return { pathname, search }
}

/** sirv streams with fs.createReadStream(start,end) — an inverted or odd Range
 *  makes that throw synchronously. Keep only simple, well-formed ranges. */
function sanitizeRange(req) {
  const range = req.headers.range
  if (!range) return
  const m = /^bytes=(\d+)-(\d*)$/.exec(range)
  if (!m || (m[2] !== '' && Number(m[2]) < Number(m[1]))) delete req.headers.range
}

const isEnglish = (pathname) => pathname === '/en' || pathname.startsWith('/en/')

function redirect(res, location) {
  res.writeHead(301, { Location: location, 'Cache-Control': 'public, max-age=3600' })
  res.end()
}

function notFound(req, res, pathname = '/') {
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(req.method === 'HEAD' ? undefined : NOT_FOUND[isEnglish(pathname) ? 'en' : 'es'])
}

function handle(req, res) {
  for (const [k, v] of Object.entries(BASE_HEADERS)) res.setHeader(k, v)

  const target = splitTarget(req.url)
  if (!target) {
    res.writeHead(400, { 'Content-Type': 'text/plain' })
    return res.end('bad request')
  }
  const { pathname, search } = target
  const host = String(req.headers.host || '').toLowerCase()

  if (pathname === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' })
    return res.end('ok')
  }

  // One canonical origin: https, no www. Redirect targets come from SITE_URL,
  // never from the request's Host header.
  if (host === `www.${SITE_HOST}` || (host === SITE_HOST && req.headers['x-forwarded-proto'] === 'http')) {
    return redirect(res, SITE_URL + pathname + search)
  }

  if (pathname.startsWith(IMG_PREFIX)) return images(req, res)
  if (pathname.startsWith('/admin/api/')) {
    return adminApi(req, res).catch((err) => {
      console.error('[admin]', err)
      if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain' })
      res.end('server error')
    })
  }

  // One canonical path: no trailing slash (except "/"), no index.html.
  // Rebuilt from a single leading slash so the Location can't become "//host".
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return redirect(res, '/' + pathname.replace(/^\/+|\/+$/g, '') + search)
  }
  if (pathname.endsWith('/index.html')) {
    return redirect(res, '/' + pathname.slice(0, -'/index.html'.length).replace(/^\/+/, '') + search)
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' })
    return res.end()
  }
  if (/^\/(en\/)?404(\.html)?$/.test(pathname)) return notFound(req, res, pathname)

  sanitizeRange(req)
  serveStatic(req, res, () => notFound(req, res, pathname))
}

const server = http.createServer((req, res) => {
  try {
    handle(req, res)
  } catch (err) {
    console.error('[server]', req.method, req.url, err)
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain' })
    res.end('server error')
  }
})

server.listen(PORT, () => {
  console.log(`✓ Listening on :${PORT} (image cache: ${CACHE_DIR})`)
  warmImages()
})

// Pre-generate the AVIF variants the pages reference, one at a time, so the
// first visitors after a deploy don't wait on image encoding. Variants already
// in the cache (same photo content) are skipped quickly.
async function warmImages() {
  if (process.env.IMG_WARM === '0' || !fs.existsSync(WARM_LIST)) return
  const urls = JSON.parse(fs.readFileSync(WARM_LIST, 'utf8'))
  const started = Date.now()
  for (const u of urls) {
    await new Promise((resolve) => {
      const req = http.get({ port: PORT, path: u, headers: { host: 'localhost' } }, (r) => { r.resume(); r.on('end', resolve) })
      req.on('error', resolve)
    })
  }
  console.log(`✓ Warmed ${urls.length} image variants in ${Math.round((Date.now() - started) / 1000)}s`)
}

for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => server.close(() => process.exit(0)))
}
