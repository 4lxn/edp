// Client for the dev-only album admin API (see scripts/vite-plugin-admin.mjs).
const BASE = '/__albums/api'
const KEY = 'edp-admin-token'

// The token comes from the /admin?token=… link printed by `npm run dev`; it is
// kept for the browser tab so reloads keep working.
function token() {
  const fromUrl = new URLSearchParams(window.location.search).get('token')
  if (fromUrl) {
    try { sessionStorage.setItem(KEY, fromUrl) } catch { /* private mode */ }
    return fromUrl
  }
  try { return sessionStorage.getItem(KEY) || '' } catch { return '' }
}

async function req(method, url, body) {
  const res = await fetch(BASE + url, {
    method,
    headers: {
      'x-admin-token': token(),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

export const listAlbums = () => req('GET', '/albums')
export const saveAlbum = (slug, meta) => req('POST', `/album/${slug}`, meta)
export const deleteAlbum = (slug) => req('DELETE', `/album/${slug}`)
export const uploadImage = (slug, filename, dataBase64) =>
  req('POST', `/upload/${slug}`, { filename, dataBase64 })
export const deleteImage = (slug, file) =>
  req('POST', `/delete-image/${slug}`, { file })

// Read a File as a base64 data URL.
export const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = reject
    r.readAsDataURL(file)
  })
