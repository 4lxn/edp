/**
 * Admin HTTP API under /admin/api/* — used by the admin page (admin/index.html).
 *
 * Production: edits go to an OverlayStore on the volume and "Publicar" commits
 * them to GitHub (server/github.mjs); Railway then redeploys with the changes.
 * `npm run dev`: the same API on a DirectStore (writes the repo files), and
 * publishing is done with git push.
 *
 * Auth: one password (ADMIN_PASSWORD). Login sets a signed, HttpOnly,
 * SameSite=Strict cookie valid 30 days. Every non-GET request must also carry
 * "x-edp-admin: 1" (a header cross-site forms can't send). Failed logins are
 * rate-limited.
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { contentPath, SITE_PATH } from './content-store.mjs'
import * as albums from './albums.mjs'

const COOKIE = 'edp_admin'
const SESSION_SECONDS = 30 * 24 * 3600
const JSON_LIMIT = 2 * 1024 * 1024
const UPLOAD_LIMIT = 30 * 1024 * 1024
const THUMB_WIDTHS = [240, 480, 960]
const LOGIN_WINDOW_MS = 15 * 60 * 1000
const LOGIN_MAX_PER_IP = 8
const LOGIN_MAX_TOTAL = 40
const STUCK_PUBLISH_MS = 10 * 60 * 1000

const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest()
const b64url = (buf) => Buffer.from(buf).toString('base64url')

function send(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(data))
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (c) => {
      size += c.length
      if (size > limit) { reject(new albums.UserError('Archivo demasiado grande', 413)); req.destroy() } else chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

async function readJson(req) {
  const buf = await readBody(req, JSON_LIMIT)
  try { return buf.length ? JSON.parse(buf) : {} } catch { throw new albums.UserError('JSON inválido') }
}

function loadSecret(file) {
  try {
    const s = fs.readFileSync(file)
    if (s.length >= 32) return s
  } catch { /* first run */ }
  const s = crypto.randomBytes(32)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, s, { mode: 0o600 })
  return s
}

/** Human summary of a change set, used as the commit message. */
function commitMessage(written, deleted, note) {
  const byAlbum = new Map()
  const album = (p) => {
    const slug = p.split('/')[2]
    if (!byAlbum.has(slug)) byAlbum.set(slug, { added: 0, removed: 0, gone: false })
    return byAlbum.get(slug)
  }
  let site = false
  for (const p of written) {
    if (p === SITE_PATH) site = true
    else if (!p.endsWith('/_meta.json')) album(p).added++
    else album(p)
  }
  for (const p of deleted) {
    if (p.endsWith('/_meta.json')) album(p).gone = true
    else album(p).removed++
  }
  const count = (n, one, many) => `${n} ${n === 1 ? one : many}`
  const parts = [...byAlbum].map(([slug, a]) => {
    if (a.gone) return `proyecto ${slug} borrado`
    const bits = [
      a.added && count(a.added, 'foto nueva', 'fotos nuevas'),
      a.removed && count(a.removed, 'foto borrada', 'fotos borradas'),
    ].filter(Boolean)
    return bits.length ? `${bits.join(' y ')} en ${slug}` : `datos de ${slug}`
  })
  if (site) parts.push('textos del sitio')
  let subject = `Admin: ${parts.join(', ')}`
  if (subject.length > 100) subject = `${subject.slice(0, 98).replace(/,?\s+\S*$/, '')}…`
  const files = [...written.map((p) => `+ ${p}`), ...deleted.map((p) => `- ${p}`)]
  return [subject, '', ...(note ? [String(note).slice(0, 500), ''] : []), ...files].join('\n')
}

/**
 * @param {{ store, mode: 'prod'|'dev', password?: string, dataDir: string,
 *           publisher?: { commit: Function }, deployedSha?: string, onChange?: Function }} opts
 */
export async function createAdminApi({ store, mode, password, dataDir, publisher, deployedSha, onChange = () => {} }) {
  const secret = loadSecret(path.join(dataDir, 'admin', 'secret'))
  const statePath = path.join(dataDir, 'admin', 'state.json')
  let state = { publishing: null }
  try { state = { publishing: null, ...JSON.parse(fs.readFileSync(statePath, 'utf8')) } } catch { /* none */ }
  const saveState = () => {
    fs.mkdirSync(path.dirname(statePath), { recursive: true })
    fs.writeFileSync(statePath, JSON.stringify(state, null, 1))
  }

  // Pending edits that the running checkout already contains are done.
  await store.prune?.()
  // The publish we were waiting for is live — as this deployment, or inside a
  // later commit (then nothing is left pending): unlock the admin.
  if (state.publishing) {
    const { written, deleted } = await store.changes()
    const live = deployedSha && state.publishing.sha === deployedSha
    if (live) await store.clear() // edits were blocked while publishing: all of them are in it
    if (live || (mode === 'prod' && !written.length && !deleted.length)) {
      state.publishing = null
      saveState()
    }
  }

  /* ---------- sessions ---------- */
  // Signed with a key from the volume secret AND the password, so changing
  // ADMIN_PASSWORD signs every device out.
  const key = crypto.createHmac('sha256', secret).update(`session:${password || ''}`).digest()
  const sign = (exp) => b64url(crypto.createHmac('sha256', key).update(String(exp)).digest())
  function isAuthed(req) {
    const raw = String(req.headers.cookie || '').split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`))
    if (!raw) return false
    const [exp, sig] = raw.slice(COOKIE.length + 1).split('.')
    if (!exp || !sig || Number(exp) < Date.now() / 1000) return false
    const want = Buffer.from(sign(exp))
    const got = Buffer.from(sig)
    return got.length === want.length && crypto.timingSafeEqual(got, want)
  }
  function setCookie(req, res, value, maxAge) {
    const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : ''
    res.setHeader('Set-Cookie', `${COOKIE}=${value}; Path=/admin; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`)
  }

  const attempts = new Map()
  let totalFails = []
  function allowLogin(ip) {
    const now = Date.now()
    totalFails = totalFails.filter((t) => now - t < LOGIN_WINDOW_MS)
    const fails = (attempts.get(ip) || []).filter((t) => now - t < LOGIN_WINDOW_MS)
    attempts.set(ip, fails)
    return fails.length < LOGIN_MAX_PER_IP && totalFails.length < LOGIN_MAX_TOTAL
  }
  function failLogin(ip) {
    attempts.get(ip)?.push(Date.now())
    totalFails.push(Date.now())
  }

  /* ---------- thumbnails (admin grid) ---------- */
  const thumbs = new Map()
  async function thumbnail(slug, file, width) {
    const buf = await albums.readPhoto(store, slug, file)
    if (!buf) return null
    const key = `${slug}/${file}@${width}:${crypto.createHash('sha1').update(buf).digest('hex')}`
    if (!thumbs.has(key)) {
      const out = await sharp(buf, { failOn: 'none' }).rotate()
        .resize({ width, withoutEnlargement: true }).jpeg({ quality: 72 }).toBuffer()
      thumbs.set(key, out)
      if (thumbs.size > 300) thumbs.delete(thumbs.keys().next().value)
    }
    return thumbs.get(key)
  }

  async function snapshot() {
    const changes = await store.changes()
    return {
      mode,
      albums: await albums.listAlbums(store),
      site: await albums.readSite(store),
      changes,
      publishing: state.publishing,
      deployedSha: deployedSha || null,
      canPublish: mode === 'prod' && !!publisher,
    }
  }

  async function publish(note) {
    if (mode !== 'prod') throw new albums.UserError('En desarrollo se publica con git push.')
    if (!publisher) throw new albums.UserError('Falta GITHUB_TOKEN en las variables de Railway.', 503)
    if (state.publishing) throw new albums.UserError('Ya hay una publicación en curso.', 409)
    const { written, deleted } = await store.changes()
    if (!written.length && !deleted.length) throw new albums.UserError('No hay cambios para publicar.')
    const files = []
    for (const p of [...written, ...deleted]) {
      if (!contentPath(p)) throw new Error(`refusing to publish unexpected path ${p}`)
    }
    for (const p of written) files.push({ path: p, content: await store.read(p) })
    const sha = await publisher.commit({ files, deletions: deleted, message: commitMessage(written, deleted, note) })
    if (sha === deployedSha) {
      await store.clear() // content was already identical to what's live
      return { sha, live: true }
    }
    state.publishing = { sha, at: new Date().toISOString(), count: written.length + deleted.length }
    saveState()
    return { sha, live: false }
  }

  async function changed() {
    try { await onChange() } catch (err) { console.error('[admin] onChange', err) }
  }

  /* ---------- router ---------- */
  return async function adminApi(req, res) {
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Robots-Tag', 'noindex')
    const url = new URL(req.url, 'http://x')
    let parts
    try { parts = url.pathname.replace(/^\/admin\/api\/?/, '').split('/').filter(Boolean).map(decodeURIComponent) } catch {
      return send(res, 400, { error: 'URL inválida' })
    }
    const [a, b, c, d] = parts
    const m = req.method
    try {
      if (m !== 'GET' && m !== 'HEAD' && req.headers['x-edp-admin'] !== '1') return send(res, 403, { error: 'Solicitud no permitida' })

      if (a === 'session' && m === 'GET') {
        return send(res, 200, { authenticated: !!password && isAuthed(req), configured: !!password, mode })
      }
      if (a === 'login' && m === 'POST') {
        if (!password) return send(res, 503, { error: 'Admin no configurado: falta ADMIN_PASSWORD.' })
        const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim()
        if (!allowLogin(ip)) return send(res, 429, { error: 'Demasiados intentos. Espera 15 minutos.' })
        const body = await readJson(req)
        if (!crypto.timingSafeEqual(sha256(body.password || ''), sha256(password))) {
          failLogin(ip)
          return send(res, 401, { error: 'Contraseña incorrecta' })
        }
        const exp = Math.floor(Date.now() / 1000) + SESSION_SECONDS
        setCookie(req, res, `${exp}.${sign(exp)}`, SESSION_SECONDS)
        return send(res, 200, { ok: true })
      }
      if (a === 'logout' && m === 'POST') {
        setCookie(req, res, '', 0)
        return send(res, 200, { ok: true })
      }

      if (!password) return send(res, 503, { error: 'Admin no configurado: falta ADMIN_PASSWORD.' })
      if (!isAuthed(req)) return send(res, 401, { error: 'Sesión expirada. Vuelve a entrar.' })

      if (a === 'content' && m === 'GET') return send(res, 200, await snapshot())
      if (a === 'status' && m === 'GET') {
        return send(res, 200, { deployedSha: deployedSha || null, publishing: state.publishing })
      }
      if (a === 'albums' && b && c === 'photos' && d && m === 'GET') {
        const w = THUMB_WIDTHS.includes(Number(url.searchParams.get('w'))) ? Number(url.searchParams.get('w')) : 480
        const img = await thumbnail(b, d, w)
        if (!img) return send(res, 404, { error: 'Foto no encontrada' })
        res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=600' })
        return res.end(img)
      }

      // Everything below changes content: not while a publish is rolling out.
      if (state.publishing && !(a === 'publish' && b === 'unlock')) {
        return send(res, 409, { error: 'Publicando… espera a que el sitio se actualice (unos 2 minutos).' })
      }

      if (a === 'albums' && b && !c && m === 'POST') {
        const body = await readJson(req)
        await albums.createAlbum(store, b, body.title)
        await changed()
        return send(res, 200, await snapshot())
      }
      if (a === 'albums' && b && !c && m === 'PUT') {
        await albums.saveAlbum(store, b, await readJson(req))
        await changed()
        return send(res, 200, await snapshot())
      }
      if (a === 'albums' && b && !c && m === 'DELETE') {
        await albums.deleteAlbum(store, b)
        await changed()
        return send(res, 200, await snapshot())
      }
      if (a === 'albums' && b && c === 'photos' && !d && m === 'POST') {
        const added = await albums.addPhoto(store, b, await readBody(req, UPLOAD_LIMIT))
        await changed()
        return send(res, 200, { added, ...(await snapshot()) })
      }
      if (a === 'albums' && b && c === 'photos' && d && m === 'DELETE') {
        await albums.deletePhoto(store, b, d)
        await changed()
        return send(res, 200, await snapshot())
      }
      if (a === 'site' && m === 'PUT') {
        await albums.saveSite(store, await readJson(req))
        await changed()
        return send(res, 200, await snapshot())
      }
      if (a === 'discard' && m === 'POST') {
        await store.clear()
        await changed()
        return send(res, 200, await snapshot())
      }
      if (a === 'publish' && !b && m === 'POST') {
        const body = await readJson(req)
        const result = await publish(body.message)
        return send(res, 200, { ...result, ...(await snapshot()) })
      }
      if (a === 'publish' && b === 'unlock' && m === 'POST') {
        const since = state.publishing ? Date.now() - Date.parse(state.publishing.at) : Infinity
        if (since < STUCK_PUBLISH_MS) return send(res, 409, { error: 'La publicación sigue en curso; espera unos minutos más.' })
        state.publishing = null
        saveState()
        return send(res, 200, await snapshot())
      }
      return send(res, 404, { error: 'No encontrado' })
    } catch (err) {
      if (err instanceof albums.UserError) return send(res, err.status, { error: err.message })
      console.error('[admin]', m, url.pathname, err)
      return send(res, 500, { error: err.status ? `Error al publicar en GitHub (${err.status}). Revisa GITHUB_TOKEN.` : 'Error del servidor' })
    }
  }
}
