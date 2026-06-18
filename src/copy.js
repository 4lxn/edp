import { ALBUMS, GALLERY } from './albums.generated'

const B = import.meta.env.BASE_URL
const a = (path) => `${B}assets/${path}`

// Map a generated GALLERY entry → a project card for a given language.
const projectCard = (g, lang) => ({
  n: g.n,
  slug: g.slug,
  title: g.title,
  type: g.type[lang],
  meta: g.location[lang],
  img: g.img,
})

// Destacados (inicio) vs catálogo completo (/proyectos), derivados del flag `featured`.
const featuredFor = (lang) => GALLERY.filter(g => g.featured).map(g => projectCard(g, lang))
const allProjectsFor = (lang) => GALLERY.map(g => projectCard(g, lang))

export const COPY = {
  es: {
    nav: ["Proyectos", "Filosofía", "Contacto"],
    cta: "Cotizar Proyecto",
    heroEyebrow: "Estudio · Costa Pacífica · MX",
    heroTitle: ["Maestría en madera", "y arquitectura tropical"],
    heroSub: "High-end tropical palapas & master woodcraft",
    heroScroll: "Descubrir el oficio",
    statementLabel: "Filosofía",
    statement:
      "Construimos en diálogo con el paisaje. Cada palapa, cada deck, cada pérgola nace de una lectura paciente del sitio — del viento, del sol que cruza, de la madera que dura un siglo. No imponemos forma; revelamos estructura.",
    statementSig: "— Taller Estructuras del Pacífico",
    galleryLabel: "Selección de obra",
    galleryTitle: ["Obra", "selecta"],
    galleryLede:
      "Una selección de obras representativas. Cada una construida en sitio, con ensambles de madera.",
    galleryAll: "Ver todos los proyectos",
    galleryItems: featuredFor('es'),
    projectsLabel: "Portafolio",
    projectsTitle: ["Todos los", "proyectos"],
    projectsLede: "El catálogo completo de obras.",
    allProjects: allProjectsFor('es'),
    contactLabel: "Iniciar conversación",
    contactTitle: ["Cada proyecto", "comienza con una", "visita al lugar"],
    contactBody:
      "Aceptamos un número limitado de comisiones cada año. Si su proyecto requiere precisión y permanencia, comencemos por escuchar el sitio.",
    contactCta: "Solicitar visita técnica",
    contactEmail: "contacto@estructurasdelpacifico.com",
    contactMeta: ["contacto@estructurasdelpacifico.com", "Costa del Pacífico · MX"],
    footerNote: "Estructuras del Pacífico · Arquitectura tropical en madera · Costa del Pacífico · MX",
    footerLegal: ["© MMXXVI", "Aviso de privacidad"],
  },
  en: {
    nav: ["Projects", "Philosophy", "Contact"],
    cta: "Request a quote",
    heroEyebrow: "Studio · Pacific Coast · MX",
    heroTitle: ["Mastery in timber", "and tropical structure"],
    heroSub: "High-end tropical palapas & master woodcraft",
    heroScroll: "Discover the craft",
    statementLabel: "Philosophy",
    statement:
      "We build in conversation with the landscape. Every palapa, every deck, every pergola begins with a patient reading of the site — wind, sun path, the timber that will last a century. We do not impose form; we reveal structure.",
    statementSig: "— Taller Estructuras del Pacífico",
    galleryLabel: "Selected work",
    galleryTitle: ["Selected", "work"],
    galleryLede:
      "A selection of representative works. Each built on site, with timber joinery.",
    galleryAll: "See all projects",
    galleryItems: featuredFor('en'),
    projectsLabel: "Portfolio",
    projectsTitle: ["All", "projects"],
    projectsLede: "The complete catalogue of works.",
    allProjects: allProjectsFor('en'),
    contactLabel: "Begin a conversation",
    contactTitle: ["Every project", "begins with a", "visit to the site"],
    contactBody:
      "We take on a limited number of commissions each year. If your project demands precision and permanence, let us begin by listening to the place.",
    contactCta: "Request a site visit",
    contactEmail: "contacto@estructurasdelpacifico.com",
    contactMeta: ["contacto@estructurasdelpacifico.com", "Pacific Coast · MX"],
    footerNote: "Estructuras del Pacífico · Tropical timber architecture · Pacific Coast · MX",
    footerLegal: ["© MMXXVI", "Privacy"],
  },
}

// Derive PROJECT_ALBUMS (flat, Spanish strings) from generated ALBUMS data.
// To change languages later, swap the [lang] index per consumer.
export const PROJECT_ALBUMS = Object.fromEntries(
  Object.entries(ALBUMS).map(([slug, al]) => [slug, {
    title: al.title,
    type: al.type.es,
    meta: al.location.es,
    hero: al.hero,
    images: al.images.map(img => ({
      src: img.src,
      caption: img.caption.es,
    })),
  }])
)
