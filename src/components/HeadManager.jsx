import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { buildHead } from '../seo'

/** Create-or-update one head element; `value == null` removes it. */
function upsert(selector, build, attr, value) {
  let el = document.head.querySelector(selector)
  if (value == null) { el?.remove(); return }
  if (!el) { el = build(); document.head.appendChild(el) }
  el.setAttribute(attr, value)
}

const meta = (key, name, content) => upsert(`meta[${key}="${name}"]`, () => {
  const el = document.createElement('meta')
  el.setAttribute(key, name)
  return el
}, 'content', content)

const canonical = (href) => upsert('link[rel="canonical"]', () => {
  const el = document.createElement('link')
  el.rel = 'canonical'
  return el
}, 'href', href)

/**
 * Keeps <title>, <html lang>, description, canonical, hreflang and the main
 * share tags in sync on client-side navigation. (Crawlers get the same tags
 * pre-rendered into each page's HTML — see scripts/prerender.mjs.)
 */
export default function HeadManager() {
  const { pathname } = useLocation()

  useEffect(() => {
    const h = buildHead(pathname)
    document.title = h.title
    document.documentElement.lang = h.htmlLang
    meta('name', 'description', h.description)
    meta('name', 'robots', h.robots)
    meta('property', 'og:title', h.title)
    meta('property', 'og:description', h.description)
    meta('property', 'og:url', h.canonical)
    meta('property', 'og:image', h.ogImage)
    meta('property', 'og:locale', h.ogLocale)
    canonical(h.canonical)

    document.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((el) => el.remove())
    for (const a of h.alternates) {
      const el = document.createElement('link')
      el.rel = 'alternate'
      el.hreflang = a.hreflang
      el.href = a.href
      document.head.appendChild(el)
    }
  }, [pathname])

  return null
}
