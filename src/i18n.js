/**
 * Languages and URLs. Spanish lives at the root, English under /en:
 *
 *   page       es                         en
 *   home       /                          /en
 *   projects   /proyectos                 /en/projects
 *   album      /proyectos/<slug>          /en/projects/<slug>
 *   privacy    /aviso-de-privacidad       /en/privacy
 *
 * Every page has an equivalent in the other language (hreflang, ES/EN switch).
 */
import content from './content/site.json'
import { ALBUMS } from './albums.generated'

export const LANGS = ['es', 'en']
export const DEFAULT_LANG = 'es'
export const HREFLANG = { es: 'es-MX', en: 'en' }
export const PAGES = ['home', 'projects', 'album', 'privacy']

const SEGMENT = {
  es: { projects: 'proyectos', privacy: 'aviso-de-privacidad' },
  en: { projects: 'projects', privacy: 'privacy' },
}

export const business = content.business

/** True only for real album slugs (not "constructor", "__proto__", …). */
export const isAlbum = (slug) => Object.prototype.hasOwnProperty.call(ALBUMS, slug)

/** All copy for one language. */
export const copy = (lang) => content[lang] || content[DEFAULT_LANG]

/** Replace {placeholders} in a string. */
export const fill = (str, vars) => String(str).replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''))

/** URL of a page in a language, e.g. pathFor('en', 'album', 'acapulco'). */
export function pathFor(lang, page, slug) {
  const prefix = lang === 'en' ? '/en' : ''
  const seg = SEGMENT[lang] || SEGMENT.es
  if (page === 'projects') return `${prefix}/${seg.projects}`
  if (page === 'album') return `${prefix}/${seg.projects}/${slug}`
  if (page === 'privacy') return `${prefix}/${seg.privacy}`
  return prefix || '/'
}

/** Anchor link to a homepage section, e.g. sectionPath('es', 'contacto') → "/#contacto". */
export const sectionPath = (lang, id) => `${lang === 'en' ? '/en' : '/'}#${id}`

export const langFromPath = (pathname) =>
  pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'es'

/** Resolve a pathname → { lang, page, slug? }; page is 'notFound' when unknown. */
export function matchRoute(pathname) {
  const lang = langFromPath(pathname)
  const rest = (lang === 'en' ? pathname.slice(3) : pathname).replace(/^\/+|\/+$/g, '')
  const parts = rest ? rest.split('/') : []
  const seg = SEGMENT[lang]

  if (parts.length === 0) return { lang, page: 'home' }
  if (parts[0] === seg.projects && parts.length === 1) return { lang, page: 'projects' }
  if (parts[0] === seg.projects && parts.length === 2 && isAlbum(parts[1])) {
    return { lang, page: 'album', slug: parts[1] }
  }
  if (parts[0] === seg.privacy && parts.length === 1) return { lang, page: 'privacy' }
  return { lang, page: 'notFound' }
}

/** The same page in another language (falls back to that language's home). */
export function alternatePath(pathname, targetLang) {
  const r = matchRoute(pathname)
  return r.page === 'notFound' ? pathFor(targetLang, 'home') : pathFor(targetLang, r.page, r.slug)
}

/** Every pre-renderable URL, both languages (used by the prerender + sitemap). */
export function allPaths() {
  const out = []
  for (const lang of LANGS) {
    out.push(pathFor(lang, 'home'), pathFor(lang, 'projects'), pathFor(lang, 'privacy'))
    for (const slug of Object.keys(ALBUMS)) out.push(pathFor(lang, 'album', slug))
  }
  return out
}

/** Albums as localized cards, in display order (numbered across all albums). */
export function albumCards(lang, { featuredOnly = false } = {}) {
  return Object.values(ALBUMS)
    .sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug))
    .map((al, i) => ({
      n: String(i + 1).padStart(2, '0'),
      slug: al.slug,
      featured: al.featured,
      title: al.title,
      type: al.type[lang],
      location: al.location[lang],
      img: al.hero,
      href: pathFor(lang, 'album', al.slug),
    }))
    .filter((card) => !featuredOnly || card.featured)
}
