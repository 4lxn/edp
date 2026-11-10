/**
 * facts.js — every business fact the site may state, in one place.
 *
 * RULE: a value stays `null` until the owner confirms it. The UI hides the
 * sentence, row or whole section that depends on a null fact, so nothing
 * unverified (and no "[PLACEHOLDER]") ever renders. Fill a value → it appears.
 *
 * Text values that are shown to visitors take { es, en } (or a plain string
 * used for both languages). Numbers are plain numbers.
 */
export const FACTS = {
  /* ── Facts row (landing). Shown when at least 3 of these 4 are filled ── */
  yearsBuilding: null,        // number — years building on the coast
  structuresBuilt: null,      // number — works completed
  largestSpanM: null,         // number — largest clear span / diameter, metres
  oldestInServiceYears: null, // number — oldest structure still in service, years

  /* ── Studio ── */
  foundingYear: null,         // number — enables "Desde 1998, …"
  studioHeadline: null,       // { es, en } — e.g. "Un oficio de familia en la costa de Guerrero."
  founderName: null,          // string
  founderRole: null,          // { es, en }
  founderPortrait: null,      // 'albums/<slug>/<file>' or 'assets/<file>' — portrait on site
  serviceArea: null,          // { es, en } — e.g. "Guerrero, Michoacán y Oaxaca"
  clients: null,              // [names] — only with permission to publish
  architects: null,           // [names] — only with permission to publish
  testimonial: null,          // { quote: { es, en }, name, role: { es, en } }

  /* ── Materials (services copy falls back to generic "madera" / "palma") ── */
  timber: null,               // { es, en } — e.g. "parota"
  palm: null,                 // { es, en } — e.g. "palma real"

  /* ── Process ── */
  freeSiteVisit: null,        // true → shows "Sin costo en la región"
  proposalDays: null,         // number — "presupuesto por escrito en N días"
  warranty: null,             // { es, en } — e.g. "2 años"
  responseTime: null,         // { es, en } — e.g. "un máximo de 2 días hábiles"

  /* ── Maintenance: the whole service (row, page, form option, process step)
        is hidden until the owner confirms it is offered ── */
  offersMaintenance: null,    // true | null
  maintenanceInterval: null,  // { es, en } — e.g. "2 años"
  servicesThirdParty: null,   // true → "Atendemos también palapas que no construimos."

  /* ── Claims to confirm (each `true` reveals the sentence/section) ── */
  hospitalityScheduling: null, // "ajustamos el calendario a la operación del hotel…"
  audienceClaims: null,        // landing "Para quién" (own crew, off-season work, on-date delivery…)
  onSiteCrewClaim: null,       // one workshop/crew designs, prepares and raises every structure
                               //   ("En obra" line and the studio paragraph)
  engineeredForCoast: null,    // "calculadas para el viento y la humedad de la costa"

  /* ── Privacy notice ── */
  legalEntity: null,          // string — razón social responsable de los datos
  legalAddress: null,         // string — domicilio

  /* ── Press: Architectural Digest. UNCONFIRMED → OFF.
        Turn on only after the owner confirms EDP built the palapa at Casa
        Garrobo (see _inbox/marketing/plan.md §6). Text only, no AD logo/photos. ── */
  press: {
    enabled: false,
    outlet: 'Architectural Digest México',
    project: 'punta-garrobo',   // album slug the mention belongs to
    house: 'Casa Garrobo',
    architect: 'Zozaya Arquitectos',
    issue: null,                // { es, en } — e.g. "febrero 2017"
    url: null,                  // optional reference link
  },
}

/** Picks the language of a { es, en } fact (or returns a plain value as-is). */
export const say = (v, lang) =>
  v == null ? null : typeof v === 'object' && !Array.isArray(v) ? (v[lang] ?? v.es ?? v.en ?? null) : v

export const EMAIL = 'contacto@estructurasdelpacifico.com'
export const SITE_URL = 'https://estructurasdelpacifico.com'
export const SITE_NAME = 'Estructuras del Pacífico'
