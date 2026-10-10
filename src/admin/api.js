// Client for the admin API (server/admin-api.mjs) — same endpoints in
// production and in `npm run dev`.
const BASE = '/admin/api'
const HEADERS = { 'x-edp-admin': '1' }

async function call(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    credentials: 'same-origin',
    headers: { ...HEADERS, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `Error ${res.status}`)
    err.status = res.status
    throw err
  }
  return data
}

const enc = encodeURIComponent

export const api = {
  session: () => call('GET', '/session'),
  login: (password) => call('POST', '/login', { password }),
  logout: () => call('POST', '/logout', {}),
  content: () => call('GET', '/content'),
  status: () => call('GET', '/status'),
  createAlbum: (slug, title) => call('POST', `/albums/${enc(slug)}`, { title }),
  saveAlbum: (slug, meta) => call('PUT', `/albums/${enc(slug)}`, meta),
  deleteAlbum: (slug) => call('DELETE', `/albums/${enc(slug)}`),
  deletePhoto: (slug, file) => call('DELETE', `/albums/${enc(slug)}/photos/${enc(file)}`),
  saveSite: (site) => call('PUT', '/site', site),
  discard: () => call('POST', '/discard', {}),
  publish: (message) => call('POST', '/publish', { message }),
  unlock: () => call('POST', '/publish/unlock', {}),

  thumb: (slug, file, w = 480) => `${BASE}/albums/${enc(slug)}/photos/${enc(file)}?w=${w}`,

  /** Uploads one photo; `onProgress(0..1)` follows the upload. Resolves with the new content snapshot. */
  uploadPhoto(slug, file, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${BASE}/albums/${enc(slug)}/photos`)
      xhr.withCredentials = true
      xhr.setRequestHeader('x-edp-admin', '1')
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
      xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total)
      xhr.onload = () => {
        let data = {}
        try { data = JSON.parse(xhr.responseText) } catch { /* not JSON */ }
        if (xhr.status >= 200 && xhr.status < 300) resolve(data)
        else reject(Object.assign(new Error(data.error || `Error ${xhr.status}`), { status: xhr.status }))
      }
      xhr.onerror = () => reject(new Error('Sin conexión. Intenta de nuevo.'))
      xhr.send(file)
    })
  },
}

/** "Casa Luna" → "casa-luna" */
export const slugify = (s) => String(s || '').toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
