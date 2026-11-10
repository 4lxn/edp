/**
 * seo.js — per-route <head> data: title, description, canonical, hreflang,
 * Open Graph and JSON-LD. Used at build time by scripts/prerender.mjs (static
 * HTML for crawlers) and on the client to keep the head in sync on navigation.
 */
import { ALBUMS } from './albums.generated.js'
import { FACTS, EMAIL, SITE_URL, SITE_NAME } from './facts.js'
import { T } from './i18n.js'
import { resolve, alternate, PATHS } from './routes.js'
import { variantUrl, variantWidths } from './imgsizes.js'

const META = {
  es: {
    home: ['Palapas y estructuras de madera en Zihuatanejo, Ixtapa y Acapulco · Estructuras del Pacífico',
      'Diseño y construcción de palapas monumentales, pérgolas y decks de madera para hoteles, restaurantes y residencias en la costa de Guerrero.'],
    projects: ['Obras: palapas, decks y pérgolas construidas · Estructuras del Pacífico',
      'Obras construidas por Estructuras del Pacífico en Zihuatanejo, Ixtapa y Acapulco: palapas, decks y pérgolas de madera.'],
    quote: ['Cotizar una palapa, pérgola o deck · Estructuras del Pacífico',
      'Cuéntenos qué quiere construir y dónde. Respondemos por correo. Palapas, pérgolas y decks de madera en la costa de Guerrero.'],
    privacy: ['Aviso de privacidad · Estructuras del Pacífico',
      'Cómo tratamos los datos personales que nos envía a través del formulario de cotización.'],
    palapas: ['Construcción de palapas en la costa de Guerrero · Estructuras del Pacífico',
      'Palapas de madera y palma, circulares o de gran claro, calculadas para el viento costero.'],
    pergolas: ['Pérgolas y decks de madera en Zihuatanejo e Ixtapa · Estructuras del Pacífico',
      'Pérgolas, terrazas y decks de alberca en madera, con herrajes para ambiente salino.'],
    hospitality: ['Palapas para hoteles y restaurantes · Estructuras del Pacífico',
      'Palapas para lobbies, restaurantes, clubes de playa y albercas, coordinadas con su arquitecto.'],
    maintenance: ['Mantenimiento y cambio de palma de palapas en Guerrero · Estructuras del Pacífico',
      'Revisión estructural, cambio de palma y tratamiento de madera.'],
    notFound: ['Página no encontrada · Estructuras del Pacífico', ''],
    project: (a, type, place) => [
      `${a.title}${type ? `: ${type}` : ''}${place ? ` en ${place}` : ''} · Estructuras del Pacífico`,
      `${a.title}${place ? `, ${place}` : ''}. ${type ? `${type}. ` : ''}Obra de Estructuras del Pacífico: fotografías${a.year ? `, ${a.year}` : ''}.`,
    ],
  },
  en: {
    home: ['Palapas and timber structures in Zihuatanejo, Ixtapa and Acapulco · Estructuras del Pacífico',
      'Design and construction of monumental palapas, pergolas and timber decks for hotels, restaurants and residences on Mexico’s Pacific coast.'],
    projects: ['Projects: palapas, decks and pergolas we have built · Estructuras del Pacífico',
      'Work built by Estructuras del Pacífico in Zihuatanejo, Ixtapa and Acapulco: timber palapas, decks and pergolas.'],
    quote: ['Request a quote for a palapa, pergola or deck · Estructuras del Pacífico',
      'Tell us what you want to build and where. We reply by email. Timber palapas, pergolas and decks on Mexico’s Pacific coast.'],
    privacy: ['Privacy notice · Estructuras del Pacífico',
      'How we handle the personal data you send us through the quote form.'],
    palapas: ['Palapa construction on Mexico’s Pacific coast · Estructuras del Pacífico',
      'Timber and palm palapas, round or long-span, engineered for coastal wind.'],
    pergolas: ['Wood pergolas and decks in Zihuatanejo and Ixtapa · Estructuras del Pacífico',
      'Timber pergolas, terraces and pool decks with hardware specified for salt air.'],
    hospitality: ['Palapas for hotels and restaurants · Estructuras del Pacífico',
      'Palapas for lobbies, restaurants, beach clubs and pools, coordinated with your architect.'],
    maintenance: ['Palapa maintenance and rethatching in Guerrero, Mexico · Estructuras del Pacífico',
      'Structural inspection, rethatching and timber treatment.'],
    notFound: ['Page not found · Estructuras del Pacífico', ''],
    project: (a, type, place) => [
      `${a.title}${type ? `: ${type}` : ''}${place ? ` in ${place}` : ''} · Estructuras del Pacífico`,
      `${a.title}${place ? `, ${place}` : ''}. ${type ? `${type}. ` : ''}Work by Estructuras del Pacífico: photographs${a.year ? `, ${a.year}` : ''}.`,
    ],
  },
}

/** "Zihuatanejo, Gro. · MX" → "Zihuatanejo, Guerrero" for titles. */
export const placeName = (loc) =>
  (loc || '').replace(/\s*·\s*MX$/i, '').replace(/\bGro\.?/, 'Guerrero').trim()

const abs = (p) => SITE_URL + p
const jpg = (img, max = 1440) => {
  const ws = variantWidths(img.w)
  return variantUrl(img.src, ws.filter((w) => w <= max).pop() || ws[0], 'jpg')
}

export function headFor(pathname) {
  const r = resolve(pathname)
  const lang = r ? r.lang : pathname.startsWith('/en') ? 'en' : 'es'
  const m = META[lang]
  if (!r) {
    return { lang, title: m.notFound[0], description: '', noindex: true, jsonLd: [] }
  }

  let title, description, image = abs('/r/og.jpg')
  const jsonLd = []
  const business = {
    '@type': 'HomeAndConstructionBusiness',
    '@id': abs('/#business'),
    name: SITE_NAME,
    url: abs('/'),
    email: EMAIL,
    logo: abs('/favicon.svg'),
    image: abs('/r/og.jpg'),
    areaServed: ['Zihuatanejo', 'Ixtapa', 'Acapulco', 'Guerrero'],
    ...(FACTS.foundingYear ? { foundingDate: String(FACTS.foundingYear) } : {}),
  }

  if (r.key === 'project') {
    const a = ALBUMS[r.slug]
    const place = placeName(a.location[lang])
    ;[title, description] = m.project(a, a.type[lang], place)
    image = abs(jpg(a.images[a.hero]))
    jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      name: a.title,
      url: abs(pathname),
      image,
      inLanguage: lang,
      ...(place ? { contentLocation: { '@type': 'Place', name: place } } : {}),
      ...(a.year ? { dateCreated: String(a.year) } : {}),
      creator: { '@id': abs('/#business') },
    })
    jsonLd.push(crumbs(lang, [[T[lang].index.title, PATHS.projects[lang]], [a.title, pathname]]))
  } else {
    ;[title, description] = m[r.key]
    if (r.key === 'home') jsonLd.push({ '@context': 'https://schema.org', ...business })
    else if (r.key !== 'privacy') {
      const name = r.key === 'projects' ? T[lang].index.title
        : r.key === 'quote' ? T[lang].quote.title
        : T[lang].services.items[r.key].name
      jsonLd.push(crumbs(lang, [[name, pathname]]))
    }
  }

  return {
    lang,
    title,
    description,
    canonical: abs(pathname),
    alternates: { es: abs(alternate(pathname, 'es')), en: abs(alternate(pathname, 'en')) },
    image,
    locale: lang === 'es' ? 'es_MX' : 'en_US',
    jsonLd,
  }
}

function crumbs(lang, items) {
  const all = [[SITE_NAME, PATHS.home[lang]], ...items]
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: all.map(([name, p], i) => ({
      '@type': 'ListItem', position: i + 1, name, item: abs(p),
    })),
  }
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

/** Head markup injected into the prerendered HTML. */
export function headHtml(h) {
  const out = [`<title>${esc(h.title)}</title>`]
  if (h.description) out.push(`<meta name="description" content="${esc(h.description)}" />`)
  if (h.noindex) out.push('<meta name="robots" content="noindex" />')
  if (h.canonical) {
    out.push(`<link rel="canonical" href="${h.canonical}" />`)
    out.push(`<link rel="alternate" hreflang="es" href="${h.alternates.es}" />`)
    out.push(`<link rel="alternate" hreflang="en" href="${h.alternates.en}" />`)
    out.push(`<link rel="alternate" hreflang="x-default" href="${h.alternates.es}" />`)
    out.push('<meta property="og:type" content="website" />')
    out.push(`<meta property="og:site_name" content="${esc(SITE_NAME)}" />`)
    out.push(`<meta property="og:title" content="${esc(h.title)}" />`)
    out.push(`<meta property="og:description" content="${esc(h.description)}" />`)
    out.push(`<meta property="og:url" content="${h.canonical}" />`)
    out.push(`<meta property="og:image" content="${h.image}" />`)
    out.push(`<meta property="og:locale" content="${h.locale}" />`)
    out.push('<meta name="twitter:card" content="summary_large_image" />')
  }
  for (const ld of h.jsonLd) {
    out.push(`<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`)
  }
  return out.join('\n    ')
}
