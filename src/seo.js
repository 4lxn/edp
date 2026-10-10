/**
 * Per-page <head>: title, description, canonical, hreflang alternates, Open
 * Graph / Twitter cards and schema.org JSON-LD — plus sitemap.xml and
 * robots.txt. Framework-free so the prerender (Node) and the browser
 * (HeadManager) share it.
 */
import { ALBUMS } from './albums.generated'
import { allPaths, business, copy, fill, HREFLANG, LANGS, matchRoute, pathFor } from './i18n'
import { imgUrl, srcSet } from './images'

export const SITE_URL = 'https://estructurasdelpacifico.com'
export const HERO_IMAGE = '/assets/portada-palapa-mar.jpeg'

const abs = (path) => SITE_URL + path
const ogImage = (src) => abs(imgUrl(src, 'og', 'jpeg'))
// "Zihuatanejo, Gro. · MX" → "Zihuatanejo, Gro." for use inside sentences
const placeText = (loc) => String(loc || '').replace(/\s*·\s*MX$/, '').replace(/\s*·\s*/g, ', ')

const ORG = () => ({ '@type': 'Organization', name: business.name, url: `${SITE_URL}/` })

function businessLd(lang) {
  const t = copy(lang)
  return {
    '@context': 'https://schema.org',
    '@type': 'HomeAndConstructionBusiness',
    '@id': `${SITE_URL}/#business`,
    name: business.name,
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/icon-512.png`,
    image: ogImage(HERO_IMAGE),
    description: t.seo.home.description,
    slogan: t.hero.sub,
    email: business.email,
    ...(business.phone ? { telephone: business.phone } : {}),
    areaServed: { '@type': 'Country', name: 'México' },
    knowsLanguage: LANGS,
    ...(business.social?.length ? { sameAs: business.social } : {}),
  }
}

const websiteLd = (lang) => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  url: abs(pathFor(lang, 'home')),
  name: business.name,
  inLanguage: HREFLANG[lang],
  publisher: ORG(),
})

const breadcrumbLd = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, path], i) => ({
    '@type': 'ListItem', position: i + 1, name, item: abs(path),
  })),
})

const galleryLd = (lang, al, description) => ({
  '@context': 'https://schema.org',
  '@type': 'ImageGallery',
  name: al.title,
  description,
  url: abs(pathFor(lang, 'album', al.slug)),
  inLanguage: HREFLANG[lang],
  ...(al.location[lang] ? { contentLocation: { '@type': 'Place', name: placeText(al.location[lang]) } } : {}),
  creator: ORG(),
  image: al.images.slice(0, 12).map((im) => abs(imgUrl(im.src, 1600, 'jpeg'))),
})

/** Everything the <head> of `pathname` needs. */
export function buildHead(pathname) {
  const { lang, page, slug } = matchRoute(pathname)
  const t = copy(lang)
  const s = t.seo
  const head = {
    lang,
    htmlLang: HREFLANG[lang],
    title: '',
    description: '',
    canonical: null,
    alternates: [],
    robots: 'index, follow, max-image-preview:large',
    siteName: s.siteName,
    ogLocale: s.ogLocale,
    ogLocaleAlt: LANGS.filter((l) => l !== lang).map((l) => copy(l).seo.ogLocale),
    ogImage: ogImage(HERO_IMAGE),
    ogImageAlt: t.hero.imageAlt,
    preload: null,
    jsonLd: [],
    status: 200,
  }

  if (page === 'notFound') {
    return { ...head, title: s.notFound.title, description: s.notFound.description, robots: 'noindex', status: 404 }
  }

  head.canonical = abs(pathFor(lang, page, slug))
  head.alternates = [
    ...LANGS.map((l) => ({ hreflang: HREFLANG[l], href: abs(pathFor(l, page, slug)) })),
    { hreflang: 'x-default', href: abs(pathFor('es', page, slug)) },
  ]
  const home = [t.nav.home, pathFor(lang, 'home')]
  const projects = [t.nav.projects, pathFor(lang, 'projects')]

  if (page === 'home') {
    Object.assign(head, { title: s.home.title, description: s.home.description, preload: HERO_IMAGE })
    head.jsonLd.push(businessLd(lang), websiteLd(lang))
  } else if (page === 'projects') {
    Object.assign(head, { title: s.projects.title, description: s.projects.description })
    head.jsonLd.push(breadcrumbLd([home, projects]))
  } else if (page === 'album') {
    const al = ALBUMS[slug]
    const vars = { title: al.title, type: al.type[lang], location: placeText(al.location[lang]) || 'México' }
    Object.assign(head, {
      title: fill(al.type[lang] ? s.album.title : s.album.titleNoType, vars),
      description: al.description[lang] || fill(s.album.description, vars),
      ogImage: ogImage(al.hero),
      ogImageAlt: al.title,
      preload: al.hero,
    })
    head.jsonLd.push(
      breadcrumbLd([home, projects, [al.title, pathFor(lang, 'album', slug)]]),
      galleryLd(lang, al, head.description),
    )
  } else if (page === 'privacy') {
    Object.assign(head, { title: s.privacy.title, description: s.privacy.description })
  }
  return head
}

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** The head as HTML (prerender). */
export function headHtml(h) {
  const tags = [
    `<title>${esc(h.title)}</title>`,
    `<meta name="description" content="${esc(h.description)}">`,
    `<meta name="robots" content="${h.robots}">`,
  ]
  if (h.canonical) tags.push(`<link rel="canonical" href="${h.canonical}">`)
  for (const a of h.alternates) tags.push(`<link rel="alternate" hreflang="${a.hreflang}" href="${a.href}">`)
  if (h.preload) {
    tags.push(`<link rel="preload" as="image" type="image/avif" imagesrcset="${srcSet(h.preload, 'avif')}" imagesizes="100vw" fetchpriority="high">`)
  }
  tags.push(
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${esc(h.siteName)}">`,
    `<meta property="og:title" content="${esc(h.title)}">`,
    `<meta property="og:description" content="${esc(h.description)}">`,
    ...(h.canonical ? [`<meta property="og:url" content="${h.canonical}">`] : []),
    `<meta property="og:image" content="${h.ogImage}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:alt" content="${esc(h.ogImageAlt)}">`,
    `<meta property="og:locale" content="${h.ogLocale}">`,
    ...h.ogLocaleAlt.map((l) => `<meta property="og:locale:alternate" content="${l}">`),
    `<meta name="twitter:card" content="summary_large_image">`,
  )
  for (const ld of h.jsonLd) {
    tags.push(`<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`)
  }
  return tags.join('\n    ')
}

/** sitemap.xml with hreflang alternates and album photos (Google Images). */
export function sitemapXml(lastmod) {
  const urls = allPaths().map((path) => {
    const h = buildHead(path)
    const { page, slug } = matchRoute(path)
    const alts = h.alternates
      .map((a) => `\n    <xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${a.href}"/>`).join('')
    const photos = page === 'album'
      ? ALBUMS[slug].images.map((im) => abs(imgUrl(im.src, 1600, 'jpeg')))
      : page === 'home' ? [abs(imgUrl(HERO_IMAGE, 1600, 'jpeg'))] : []
    const imgs = photos.map((u) => `\n    <image:image><image:loc>${u}</image:loc></image:image>`).join('')
    return `  <url>\n    <loc>${h.canonical}</loc>\n    <lastmod>${lastmod}</lastmod>${alts}${imgs}\n  </url>`
  })
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join('\n')}
</urlset>
`
}

export const robotsTxt = () => `User-agent: *
Allow: /
Disallow: /admin

Sitemap: ${SITE_URL}/sitemap.xml
`
