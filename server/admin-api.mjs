/**
 * Admin HTTP API under /admin/api/* — used by the admin page (admin/index.html).
 *
 * Production: edits go to an OverlayStore on the volume. "Publicar" commits
 * them to GitHub in the background (server/github.mjs), merging with anything
 * changed there meanwhile; Railway then redeploys, and the new deployment
 * drops the published edits from the pending layer (edits made later stay).
 * `npm run dev`: the same API on a DirectStore (writes the repo files), and
 * publishing is done with git push.
 *
 * Auth: one password (ADMIN_PASSWORD). Login sets a signed, HttpOnly,
 * SameSite=Strict cookie valid 30 days; changing the password signs every
 * device out. Every non-GET request must also carry "x-edp-admin: 1" (a
 * header cross-site forms can't send). Failed logins are rate-limited.
 *
 * Changes run one at a time (two uploads never rewrite the same _meta.json
 * at once), and none while a publish is underway.
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { contentPath, SITE_PATH } from './content-store.mjs'
import * as albums from './albums.mjs'
import { gitBlobSha } from './github.mjs'
import { merge3 } from './merge.mjs'

const COOKIE = 'edp_admin'
const SESSION_SECONDS = 30 * 24 * 3600
const MB = 1024 * 1024
const JSON_LIMIT = 2 * MB
const UPLOAD_LIMIT = 30 * MB
const THUMB_WIDTHS = [240, 480, 960]
const LOGIN_WINDOW_MS = 15 * 60 * 1000
const LOGIN_MAX_PER_IP = 8
const LOGIN_SLOW_AFTER = 40 // failures from all addresses in the window
const LOGIN_SLOW_MS = 3000
const LOGIN_MAX_TRACKED = 5000
const STUCK_PUBLISH_MS = 10 * 60 * 1000

const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest()
const b64url = (buf) => Buffer.from(buf).toString('base64url')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const now = () => new Date().toISOString()

function send(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(data))
}

function readBody(req, limit, tooBig) {
  return new Promise((resolve, reject) => {
    if (Number(req.headers['content-length']) > limit) {
      req.resume() // let the rest arrive and be dropped; the 413 goes out now
      return reject(new albums.UserError(tooBig, 413))
    }
    const chunks = []
    let size = 0
    let over = false
    req.on('data', (c) => {
      if (over) return
      size += c.length
      if (size > limit) { over = true; reject(new albums.UserError(tooBig, 413)) } else chunks.push(c)
    })
    req.on('end', () => { if (!over) resolve(Buffer.concat(chunks)) })
    req.on('error', reject)
  })
}

async function readJson(req) {
  const buf = await readBody(req, JSON_LIMIT, 'Demasiados datos en una sola solicitud')
  try { return buf.length ? JSON.parse(buf) : {} } catch { throw new albums.UserError('JSON inválido') }
}

function writeJsonAtomic(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(data, null, 1))
  fs.renameSync(tmp, file)
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

/** What to tell the owner when a publish fails. */
function publishError(err) {
  if (err?.name === 'TimeoutError' || err?.name === 'AbortError') return 'GitHub no respondió a tiempo. Intenta de nuevo en unos minutos.'
  if (!err?.github) return 'No se pudo publicar. Intenta de nuevo en unos minutos.'
  if (err.status === 401) return 'GitHub rechazó el token: GITHUB_TOKEN es inválido o venció. Crea uno nuevo y cámbialo en Railway → Variables.'
  if (err.status === 403) {
    return 'El token no puede escribir en el repositorio (permiso Contents: Read and write) o GitHub limitó las solicitudes. Revisa el token o intenta en unos minutos.'
  }
  if (err.status === 404) return 'GitHub no encontró el repositorio o la rama: revisa que el token tenga acceso al repositorio edp.'
  if (err.status === 409 || err.status === 422) return 'GitHub no aceptó el cambio (¿la rama está protegida?). Intenta de nuevo.'
  return `GitHub respondió con un error (${err.status}). Intenta de nuevo en unos minutos.`
}

/**
 * @param {{ store, mode: 'prod'|'dev', password?: string, dataDir: string,
 *           publisher?: { commit: Function }, deployedSha?: string, onChange?: Function }} opts
 */
export async function createAdminApi({ store, mode, password, dataDir, publisher, deployedSha, onChange = () => {} }) {
  const secret = loadSecret(path.join(dataDir, 'admin', 'secret'))
  const statePath = path.join(dataDir, 'admin', 'state.json')
  let state = { publishing: null, lastError: null }
  try { state = { ...state, ...JSON.parse(fs.readFileSync(statePath, 'utf8')) } } catch { /* none yet */ }
  const saveState = () => writeJsonAtomic(statePath, state)

  /* ---------- one change at a time ---------- */
  let queue = Promise.resolve()
  const exclusive = (fn) => {
    const run = queue.then(fn)
    queue = run.catch(() => {})
    return run
  }

  /* ---------- startup: settle the last publish ---------- */
  // Pending edits that the running checkout already contains are done — that
  // is how a deployed publish leaves the pending layer.
  await store.prune?.()
  if (state.publishing) {
    const { written, deleted } = await store.changes()
    const nothingLeft = !written.length && !deleted.length
    if (state.publishing.phase === 'committing') {
      // The server stopped while talking to GitHub.
      state.publishing = null
      if (!nothingLeft) state.lastError = { at: now(), message: 'La publicación se interrumpió. Revisa los cambios y vuelve a publicar.' }
    } else if ((deployedSha && state.publishing.sha === deployedSha) || (mode === 'prod' && nothingLeft)) {
      state.publishing = null // it's live
    }
    saveState()
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

  /* ---------- login rate limit ---------- */
  const fails = new Map() // address → failure times
  let allFails = []
  // Railway's edge puts the visitor's address in X-Real-IP (X-Forwarded-For
  // can carry values the client made up).
  const clientIp = (req) => String(req.headers['x-real-ip'] || req.socket.remoteAddress || '').trim()
  function loginGate(ip) {
    const cutoff = Date.now() - LOGIN_WINDOW_MS
    allFails = allFails.filter((t) => t > cutoff)
    for (const [addr, list] of fails) {
      const recent = list.filter((t) => t > cutoff)
      if (recent.length) fails.set(addr, recent)
      else fails.delete(addr)
    }
    // Per address: a hard stop. Overall: only slower, so nobody can lock the owner out.
    return { blocked: (fails.get(ip)?.length || 0) >= LOGIN_MAX_PER_IP, slow: allFails.length >= LOGIN_SLOW_AFTER }
  }
  function failLogin(ip) {
    if (!fails.has(ip) && fails.size >= LOGIN_MAX_TRACKED) fails.delete(fails.keys().next().value)
    fails.set(ip, [...(fails.get(ip) || []), Date.now()])
    allFails.push(Date.now())
  }

  /* ---------- thumbnails (admin grid) ---------- */
  const thumbs = new Map()
  async function thumbnail(slug, file, width) {
    const buf = await albums.readPhoto(store, slug, file)
    if (!buf) return null
    const id = `${slug}/${file}@${width}:${crypto.createHash('sha1').update(buf).digest('hex')}`
    if (!thumbs.has(id)) {
      const out = await sharp(buf, { failOn: 'none', limitInputPixels: albums.MAX_PIXELS }).rotate()
        .resize({ width, withoutEnlargement: true }).jpeg({ quality: 72 }).toBuffer()
      thumbs.set(id, out)
      if (thumbs.size > 300) thumbs.delete(thumbs.keys().next().value)
    }
    return thumbs.get(id)
  }

  async function snapshot() {
    return {
      mode,
      albums: await albums.listAlbums(store),
      site: await albums.readSite(store),
      changes: await store.changes(),
      publishing: state.publishing,
      lastError: state.lastError || null,
      deployedSha: deployedSha || null,
      canPublish: mode === 'prod' && !!publisher,
    }
  }

  const editable = () => {
    if (state.publishing) throw new albums.UserError('Publicando… espera a que el sitio se actualice (unos 2 minutos).', 409)
  }
  /** A change: one at a time, never during a publish. Resolves with its result and the new snapshot. */
  const mutate = (fn) => exclusive(async () => {
    editable()
    const result = await fn()
    try { await onChange() } catch (err) { console.error('[admin] onChange', err) }
    return { result, snap: await snapshot() }
  })

  /* ---------- publishing ---------- */
  // What to commit for one path. A JSON file someone else changed on the
  // branch since editing began is merged with that version.
  async function contentFor(p, headFiles, readBlob) {
    const mine = await store.read(p)
    if (!mine) throw new Error(`pending file vanished: ${p}`)
    const origin = p.endsWith('.json') ? store.origin?.(p) : undefined
    if (!origin) return { path: p, content: mine }
    const headSha = headFiles.get(p)
    if (headSha === (origin.content ? gitBlobSha(origin.content) : undefined)) return { path: p, content: mine }
    const theirs = headSha ? JSON.parse(await readBlob(headSha)) : undefined
    const base = origin.content ? JSON.parse(origin.content) : undefined
    const merged = merge3(base, JSON.parse(mine), theirs)
    return { path: p, content: Buffer.from(JSON.stringify(merged, null, 2) + '\n') }
  }

  async function startPublish(note) {
    if (mode !== 'prod') throw new albums.UserError('En desarrollo se publica con git push.')
    if (!publisher) throw new albums.UserError('Falta GITHUB_TOKEN en las variables de Railway.', 503)
    editable()
    const { written, deleted } = await store.changes()
    if (!written.length && !deleted.length) throw new albums.UserError('No hay cambios para publicar.')
    for (const p of [...written, ...deleted]) {
      if (!contentPath(p)) throw new Error(`refusing to publish unexpected path ${p}`)
    }
    // From here on every change is refused until the publish is live.
    state.publishing = { phase: 'committing', at: now(), count: written.length + deleted.length }
    state.lastError = null
    saveState()
    runPublish(written, deleted, note) // in the background; /status reports how it goes
  }

  async function runPublish(written, deleted, note) {
    try {
      const { sha, created, files } = await publisher.commit({
        message: commitMessage(written, deleted, note),
        prepare: async ({ files: head, readBlob }) => ({
          files: await Promise.all(written.map((p) => contentFor(p, head, readBlob))),
          deletions: deleted,
        }),
      })
      // The pending copies are now exactly what the branch has (merges included).
      for (const f of files) if (f.path.endsWith('.json')) await store.markCommitted?.(f.path, f.content)
      if (!created && sha === deployedSha) {
        await store.prune?.() // it was live already
        state.publishing = null
      } else {
        state.publishing = { ...state.publishing, phase: 'deploying', sha }
      }
    } catch (err) {
      console.error('[admin] publish failed:', err.message)
      state.publishing = null
      state.lastError = { at: now(), message: publishError(err) }
    }
    saveState()
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
        const ip = clientIp(req)
        const gate = loginGate(ip)
        if (gate.blocked) return send(res, 429, { error: 'Demasiados intentos. Espera 15 minutos.' })
        const body = await readJson(req)
        if (gate.slow) await sleep(LOGIN_SLOW_MS)
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
        return send(res, 200, { deployedSha: deployedSha || null, publishing: state.publishing, lastError: state.lastError || null })
      }
      if (a === 'albums' && b && c === 'photos' && d && m === 'GET') {
        const w = THUMB_WIDTHS.includes(Number(url.searchParams.get('w'))) ? Number(url.searchParams.get('w')) : 480
        const img = await thumbnail(b, d, w)
        if (!img) return send(res, 404, { error: 'Foto no encontrada' })
        res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=600' })
        return res.end(img)
      }

      if (a === 'albums' && b && !c && m === 'POST') {
        const body = await readJson(req)
        return send(res, 200, (await mutate(() => albums.createAlbum(store, b, body.title))).snap)
      }
      if (a === 'albums' && b && !c && m === 'PUT') {
        const body = await readJson(req)
        return send(res, 200, (await mutate(() => albums.saveAlbum(store, b, body))).snap)
      }
      if (a === 'albums' && b && !c && m === 'DELETE') {
        return send(res, 200, (await mutate(() => albums.deleteAlbum(store, b))).snap)
      }
      if (a === 'albums' && b && c === 'photos' && !d && m === 'POST') {
        editable() // say so before receiving the whole photo
        const buf = await readBody(req, UPLOAD_LIMIT, `La foto pesa más de ${UPLOAD_LIMIT / MB} MB.`)
        const { result, snap } = await mutate(() => albums.addPhoto(store, b, buf))
        return send(res, 200, { added: result, ...snap })
      }
      if (a === 'albums' && b && c === 'photos' && d && m === 'DELETE') {
        return send(res, 200, (await mutate(() => albums.deletePhoto(store, b, d))).snap)
      }
      if (a === 'site' && m === 'PUT') {
        const body = await readJson(req)
        return send(res, 200, (await mutate(() => albums.saveSite(store, body))).snap)
      }
      if (a === 'discard' && m === 'POST') {
        const { snap } = await mutate(async () => {
          await store.clear()
          state.lastError = null
          saveState()
        })
        return send(res, 200, { ...snap, lastError: null })
      }
      if (a === 'publish' && !b && m === 'POST') {
        const body = await readJson(req)
        await exclusive(() => startPublish(body.message))
        return send(res, 200, await snapshot())
      }
      if (a === 'publish' && b === 'unlock' && m === 'POST') {
        await exclusive(() => {
          const p = state.publishing
          if (!p) return
          if (p.phase === 'committing' || Date.now() - Date.parse(p.at) < STUCK_PUBLISH_MS) {
            throw new albums.UserError('La publicación sigue en curso; espera unos minutos más.', 409)
          }
          state.publishing = null
          state.lastError = {
            at: now(),
            message: 'El sitio no terminó de actualizarse: el deploy en Railway pudo haber fallado. Revisa Railway → Deployments antes de volver a publicar.',
          }
          saveState()
        })
        return send(res, 200, await snapshot())
      }
      return send(res, 404, { error: 'No encontrado' })
    } catch (err) {
      if (err instanceof albums.UserError) return send(res, err.status, { error: err.message })
      console.error('[admin]', m, url.pathname, err)
      return send(res, 500, { error: 'Error del servidor' })
    }
  }
}
