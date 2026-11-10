/**
 * routes.js — the URL map. Spanish lives at the root, English under /en/.
 * Every path ends with "/" because GitHub Pages serves dist/<route>/index.html.
 * Used by the router, the language switch, the SEO head and the prerenderer.
 */
import { ALBUMS, ALBUM_ORDER } from './albums.generated.js'
import { FACTS } from './facts.js'

export const PATHS = {
  home: { es: '/', en: '/en/' },
  projects: { es: '/proyectos/', en: '/en/projects/' },
  quote: { es: '/cotizar/', en: '/en/quote/' },
  privacy: { es: '/privacidad/', en: '/en/privacy/' },
  palapas: { es: '/palapas/', en: '/en/palapas/' },
  pergolas: { es: '/pergolas-y-decks/', en: '/en/pergolas-decks/' },
  hospitality: { es: '/hoteles-y-restaurantes/', en: '/en/hospitality/' },
  maintenance: { es: '/mantenimiento/', en: '/en/maintenance/' },
}

/** Service pages that exist. Maintenance appears only once it is confirmed. */
export const SERVICE_KEYS = ['palapas', 'pergolas', 'hospitality']
  .concat(FACTS.offersMaintenance ? ['maintenance'] : [])

const PAGE_KEYS = ['home', 'projects', 'quote', 'privacy', ...SERVICE_KEYS]
export const LANGS = ['es', 'en']

export const to = (key, lang) => PATHS[key][lang]
export const projectPath = (slug, lang) => PATHS.projects[lang] + slug + '/'
export const langOf = (pathname) =>
  pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'es'

const norm = (p) => (p.endsWith('/') ? p : p + '/')

/** pathname → { key, lang, slug? } or null when nothing matches. */
export function resolve(pathname) {
  const p = norm(pathname)
  const lang = langOf(p)
  for (const key of PAGE_KEYS) if (PATHS[key][lang] === p) return { key, lang }
  const base = PATHS.projects[lang]
  if (p.startsWith(base)) {
    const slug = p.slice(base.length).replace(/\/$/, '')
    if (ALBUMS[slug]) return { key: 'project', lang, slug }
  }
  return null
}

/** Same page in the other language (falls back to that language's home). */
export function alternate(pathname, lang) {
  const r = resolve(pathname)
  if (!r) return PATHS.home[lang]
  return r.key === 'project' ? projectPath(r.slug, lang) : PATHS[r.key][lang]
}

/** Every indexable route, for the prerenderer and the sitemap. */
export function allRoutes() {
  const out = []
  for (const lang of LANGS) {
    for (const key of PAGE_KEYS) out.push({ path: PATHS[key][lang], key, lang })
    for (const slug of ALBUM_ORDER) out.push({ path: projectPath(slug, lang), key: 'project', lang, slug })
  }
  return out
}
