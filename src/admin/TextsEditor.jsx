import { Fragment, useEffect, useMemo, useState } from 'react'
import { api } from './api'
import { Pair, useUnsavedWarning } from './ui'

/*
 * Editor for src/content/site.json: the business details plus every text of
 * the site in Spanish and English. The structure (keys, list lengths) is
 * fixed — pages read the copy by it — so only the words change here.
 */

// Top-level keys of the copy, grouped in page order. Keys not listed land in "Otros".
const SECTIONS = [
  { title: 'Portada', keys: ['hero'], hint: 'Lo primero que se ve al abrir el sitio.' },
  { title: 'Filosofía', keys: ['statement'] },
  { title: 'Fotos panorámicas', keys: ['breaks'], hint: 'Las dos fotos a todo lo ancho del inicio.' },
  { title: 'Obra selecta', keys: ['gallery'], hint: 'La selección de proyectos del inicio.' },
  { title: 'Contacto', keys: ['contact'] },
  { title: 'Página «Proyectos»', keys: ['projects'] },
  { title: 'Página de cada proyecto', keys: ['album'] },
  {
    title: 'Google (SEO)',
    keys: ['seo'],
    hint: 'Título y descripción de cada página en los resultados de Google. Títulos de hasta ~60 caracteres; descripciones de hasta ~155.',
  },
  { title: 'Menú y encabezado', keys: ['brandMark', 'cta', 'nav', 'menu', 'lang'] },
  { title: 'Pie de página', keys: ['footer'] },
  { title: 'Aviso de privacidad', keys: ['privacy'] },
  { title: 'Página no encontrada', keys: ['notFound'] },
  { title: 'Accesibilidad', keys: ['skip', 'lightbox'], hint: 'Textos que leen en voz alta los lectores de pantalla.' },
]

// Sub-headings inside a section (by path without list positions).
const GROUPS = {
  'contact.form': 'Formulario',
  'seo.home': 'Inicio',
  'seo.projects': 'Proyectos',
  'seo.album': 'Cada proyecto',
  'seo.privacy': 'Aviso de privacidad',
  'seo.notFound': 'Página no encontrada',
  nav: 'Menú principal',
  menu: 'Menú en celular',
  lang: 'Idioma',
  lightbox: 'Visor de fotos',
}
const ITEMS = { breaks: 'Foto', 'privacy.sections': 'Apartado' }

const PATH_LABELS = {
  brandMark: 'Lema junto al logo',
  cta: 'Botón «Cotizar»',
  skip: 'Enlace «saltar al contenido»',
  'hero.imageAlt': 'Descripción de la foto de portada',
  'hero.spec': 'Dato',
  'nav.label': 'Nombre del menú',
  'menu.open': 'Botón abrir',
  'menu.close': 'Botón cerrar',
  'menu.label': 'Nombre del menú',
  'lang.label': 'Nombre del selector',
  'album.open': 'Botón «ampliar foto»',
  'album.photoAlt': 'Descripción de cada foto (si no tiene una propia)',
  'contact.form.subject': 'Asunto de los correos que te llegan',
  'seo.siteName': 'Nombre del sitio',
  'seo.album.titleNoType': 'Título (proyecto sin tipo de obra)',
  'privacy.addressLine': 'Renglón del domicilio',
  'privacy.updated': 'Fecha de actualización',
}
const KEY_LABELS = {
  label: 'Etiqueta', title: 'Título', sub: 'Subtítulo', eyebrow: 'Antetítulo', lede: 'Entrada',
  body: 'Texto', text: 'Texto', sig: 'Firma', caption: 'Pie de foto', alt: 'Descripción de la foto',
  scroll: 'Indicador «bajar»', coords: 'Coordenadas', place: 'Lugar', all: 'Botón «ver todos»',
  view: 'Botón «ver álbum»', comingSoon: 'Aviso de álbum sin fotos', others: 'Título «otros proyectos»',
  back: 'Enlace de regreso', region: 'Región', name: 'Campo «nombre»', email: 'Campo «correo»',
  message: 'Campo «mensaje»', send: 'Botón enviar', sending: 'Mientras se envía', ok: 'Mensaje enviado',
  error: 'Error al enviar', note: 'Nota', copyright: 'Derechos', privacy: 'Enlace al aviso de privacidad',
  close: 'Cerrar', prev: 'Anterior', next: 'Siguiente', home: 'Inicio', projects: 'Proyectos',
  philosophy: 'Filosofía', contact: 'Contacto', heading: 'Encabezado', paragraphs: 'Párrafo',
  intro: 'Introducción', description: 'Descripción',
}
// Technical values that stay as they are.
const HIDDEN = new Set(['seo.ogLocale', 'lang.names'])
const LONG = new Set(['text', 'body', 'intro', 'description', 'lede', 'paragraphs', 'imageAlt', 'alt', 'ok'])

const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const tokens = (s) => [...new Set(String(s).match(/\{\w+\}/g) || [])]
const getIn = (obj, path) => path.reduce((o, k) => o?.[k], obj)
function setIn(obj, [k, ...rest], value) {
  const copy = Array.isArray(obj) ? [...obj] : { ...obj }
  copy[k] = rest.length ? setIn(obj[k], rest, value) : value
  return copy
}

/** Every editable text of the given top-level keys: { path, shape, label, group }. */
function fieldsOf(es, keys) {
  const out = []
  const walk = (val, path, group) => {
    const shape = path.filter((k) => typeof k === 'string').join('.')
    if (HIDDEN.has(shape)) return
    const key = path.filter((k) => typeof k === 'string').at(-1)
    const label = PATH_LABELS[shape] || KEY_LABELS[key] || key
    if (typeof val === 'string') {
      // A text that is only a marker (e.g. "{address}") is filled by the page.
      if (!/^\{\w+\}$/.test(val)) out.push({ path, shape, key, label, group })
    } else if (Array.isArray(val) && val.every((v) => typeof v === 'string')) {
      val.forEach((v, i) => {
        if (/^\{\w+\}$/.test(v)) return
        const n = key === 'title' ? `${label} (renglón ${i + 1})` : `${label} ${i + 1}`
        out.push({ path: [...path, i], shape, key, label: n, group })
      })
    } else if (Array.isArray(val)) {
      val.forEach((v, i) => walk(v, [...path, i], `${ITEMS[shape] || 'Elemento'} ${i + 1}`))
    } else if (val && typeof val === 'object') {
      for (const k of Object.keys(val)) {
        const sub = shape ? `${shape}.${k}` : k
        walk(val[k], [...path, k], GROUPS[sub] || group)
      }
    }
  }
  for (const k of keys) if (k in es) walk(es[k], [k], GROUPS[k] || '')
  return out
}

function sectionsOf(es) {
  const known = new Set(SECTIONS.flatMap((s) => s.keys))
  const rest = Object.keys(es).filter((k) => !known.has(k))
  const all = rest.length ? [...SECTIONS, { title: 'Otros', keys: rest }] : SECTIONS
  return all.map((s) => ({ ...s, fields: fieldsOf(es, s.keys) })).filter((s) => s.fields.length)
}

/** Fields whose {markers} were deleted in the draft (the page needs them). */
function lostTokens(site, draft, sections) {
  const lost = []
  for (const s of sections) {
    for (const f of s.fields) {
      for (const lang of ['es', 'en']) {
        const missing = tokens(getIn(site[lang], f.path)).filter((t) => !String(getIn(draft[lang], f.path)).includes(t))
        if (missing.length) lost.push(`${s.title} › ${f.label} (${lang.toUpperCase()}): ${missing.join(' ')}`)
      }
    }
  }
  return lost
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const BUSINESS = { name: '', email: '', phone: '', whatsapp: '', social: [], legalName: '', address: '' }
const toDraft = (site) => {
  const d = structuredClone(site)
  return { ...d, business: { ...BUSINESS, ...d.business } }
}

export default function TextsEditor({ site, run, locked, mode }) {
  const [draft, setDraft] = useState(() => toDraft(site))
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const later = mode === 'prod' ? ' · falta publicar' : ''
  const sections = useMemo(() => sectionsOf(site.es), [site])

  useUnsavedWarning(dirty)
  useEffect(() => { if (!dirty) setDraft(toDraft(site)) }, [site]) // eslint-disable-line react-hooks/exhaustive-deps

  const setText = (lang, path, value) => { setDraft((d) => ({ ...d, [lang]: setIn(d[lang], path, value) })); setDirty(true) }
  const setBusiness = (edits) => { setDraft((d) => ({ ...d, business: { ...d.business, ...edits } })); setDirty(true) }

  const social = draft.business.social || []
  const badSocial = social.filter((u) => u.trim() && !/^https:\/\/\S+$/.test(u.trim()))
  const badEmail = !EMAIL.test(draft.business.email.trim())
  // Texts that had words can't be left empty (the server refuses it too).
  const empty = new Set()
  for (const s of sections) {
    for (const f of s.fields) {
      for (const lang of ['es', 'en']) {
        const was = String(getIn(site[lang], f.path) ?? '').trim()
        if (was && !String(getIn(draft[lang], f.path) ?? '').trim()) empty.add(`${lang}:${f.path.join('.')}`)
      }
    }
  }
  const invalid = badEmail || badSocial.length > 0 || empty.size > 0

  const save = async () => {
    if (invalid) return
    const lost = lostTokens(site, draft, sections)
    if (lost.length && !confirm(
      `Estos textos perdieron marcadores que el sitio reemplaza solo:\n\n${lost.slice(0, 6).join('\n')}`
      + `${lost.length > 6 ? `\n… y ${lost.length - 6} más` : ''}\n\n¿Guardar de todos modos?`,
    )) return
    const body = { ...draft, business: { ...draft.business, social: social.map((u) => u.trim()).filter(Boolean) } }
    // The form is disabled while saving, so nothing typed meanwhile is lost.
    setSaving(true)
    try {
      const data = await run(() => api.saveSite(body), 'Textos guardados' + later)
      if (data?.site) setDraft(toDraft(data.site))
      setDirty(false)
    } catch { /* toast shown */ }
    setSaving(false)
  }

  // Saved and draft texts both count, so a field doesn't vanish while you
  // retype the very words you searched for.
  const q = norm(query.trim())
  const visible = (f) => !q || norm([f.group, f.label, ...[site, draft].flatMap((s) => [getIn(s.es, f.path), getIn(s.en, f.path)])].join(' ')).includes(q)

  const renderFields = (fields) => {
    let group = ''
    return fields.map((f) => {
      const es = getIn(draft.es, f.path)
      const en = getIn(draft.en, f.path)
      const marks = tokens(getIn(site.es, f.path))
      const head = f.group && f.group !== group ? <h4 className="adm-group">{f.group}</h4> : null
      group = f.group
      const isSeo = f.shape.startsWith('seo.') && !marks.length
      return (
        <Fragment key={f.path.join('.')}>
          {head}
          <Pair
            label={f.label}
            value={{ es, en }}
            onChange={(lang, v) => setText(lang, f.path, v)}
            long={LONG.has(f.key) || String(getIn(site.es, f.path)).length > 90}
            invalid={['es', 'en'].filter((l) => empty.has(`${l}:${f.path.join('.')}`))}
            max={isSeo && f.key === 'title' ? 60 : isSeo && f.key === 'description' ? 155 : 0}
            hint={marks.length ? `Conserva ${marks.join(' ')}: el sitio los reemplaza solo.` : undefined}
          />
        </Fragment>
      )
    })
  }

  return (
    <div className="adm-texts">
      <div className="adm-search">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar un texto… (ej. «palapa»)"
          aria-label="Buscar un texto"
        />
      </div>

      <fieldset className="adm-texts-body" disabled={locked || saving}>
        <legend className="sr-only">Textos del sitio</legend>
        {locked && <p className="adm-msg">Publicando… podrás editar en cuanto termine.</p>}

        {!q && (
          <section className="adm-sec is-static">
            <h3>Datos del negocio</h3>
            <div className="adm-sec-body">
              <label className="adm-f">
                <span>Nombre</span>
                <input value={draft.business.name} onChange={(e) => setBusiness({ name: e.target.value })} maxLength={120} />
              </label>
              <label className="adm-f">
                <span>Correo de contacto</span>
                <input
                  type="email"
                  value={draft.business.email}
                  onChange={(e) => setBusiness({ email: e.target.value })}
                  aria-invalid={badEmail || undefined}
                />
                <small className={badEmail ? 'adm-err' : 'adm-muted'}>
                  {badEmail
                    ? 'Escribe un correo válido.'
                    : 'Aquí llegan los mensajes del formulario. Si lo cambias, el primer mensaje traerá un correo de activación de FormSubmit.'}
                </small>
              </label>
              <label className="adm-f">
                <span>Teléfono</span>
                <input type="tel" value={draft.business.phone} onChange={(e) => setBusiness({ phone: e.target.value })} placeholder="Ej. +52 755 123 4567" />
                <small className="adm-muted">Se muestra en Contacto. Déjalo vacío para ocultarlo.</small>
              </label>
              <label className="adm-f">
                <span>WhatsApp</span>
                <input type="tel" value={draft.business.whatsapp} onChange={(e) => setBusiness({ whatsapp: e.target.value })} placeholder="Ej. +52 755 123 4567" />
                <small className="adm-muted">Con lada del país. Si lo llenas, aparece un enlace de WhatsApp en Contacto.</small>
              </label>
              <div className="adm-f">
                <span>Redes sociales</span>
                {social.map((u, i) => (
                  <div key={i} className="adm-row">
                    <input
                      value={u}
                      onChange={(e) => setBusiness({ social: social.map((x, j) => (j === i ? e.target.value : x)) })}
                      placeholder="https://www.instagram.com/…"
                      aria-label={`Red social ${i + 1}`}
                      aria-invalid={badSocial.includes(u) || undefined}
                    />
                    <button
                      type="button"
                      className="adm-btn"
                      onClick={() => setBusiness({ social: social.filter((_, j) => j !== i) })}
                      aria-label={`Quitar red social ${i + 1}`}
                    >✕</button>
                  </div>
                ))}
                <button type="button" className="adm-btn adm-btn-ghost" onClick={() => setBusiness({ social: [...social, ''] })}>
                  + Agregar red social
                </button>
                <small className={badSocial.length ? 'adm-err' : 'adm-muted'}>
                  {badSocial.length
                    ? 'Cada enlace debe empezar con https://'
                    : 'Enlaces completos a tus perfiles; ayudan a Google a reconocer el negocio.'}
                </small>
              </div>
              <label className="adm-f">
                <span>Responsable de los datos personales</span>
                <input value={draft.business.legalName} onChange={(e) => setBusiness({ legalName: e.target.value })} placeholder={draft.business.name} />
                <small className="adm-muted">Nombre o razón social que aparece en el aviso de privacidad.</small>
              </label>
              <label className="adm-f">
                <span>Domicilio</span>
                <input value={draft.business.address} onChange={(e) => setBusiness({ address: e.target.value })} />
                <small className="adm-muted">Para el aviso de privacidad. Déjalo vacío para no mostrarlo.</small>
              </label>
            </div>
          </section>
        )}

        {sections.map((s) => {
          const fields = s.fields.filter(visible)
          if (!fields.length) return null
          if (q) {
            return (
              <section key={s.title} className="adm-sec is-static">
                <h3>{s.title}</h3>
                <div className="adm-sec-body">{renderFields(fields)}</div>
              </section>
            )
          }
          return (
            <details key={s.title} className="adm-sec">
              <summary>
                <span>{s.title}</span>
                <span className="adm-muted">{fields.length} textos</span>
              </summary>
              <div className="adm-sec-body">
                {s.hint && <p className="adm-muted">{s.hint}</p>}
                {renderFields(fields)}
              </div>
            </details>
          )
        })}
        {q && !sections.some((s) => s.fields.some(visible)) && (
          <p className="adm-empty">Ningún texto contiene «{query}».</p>
        )}
      </fieldset>

      {dirty && (
        <div className="adm-savebar" role="region" aria-label="Cambios sin guardar">
          <span>
            {saving ? 'Guardando…'
              : badEmail || badSocial.length ? 'Revisa los datos marcados'
              : empty.size ? `${empty.size} ${empty.size === 1 ? 'texto quedó vacío' : 'textos quedaron vacíos'}: escribe algo o deshaz`
              : 'Cambios sin guardar'}
          </span>
          <button className="adm-btn" onClick={() => { setDraft(toDraft(site)); setDirty(false) }} disabled={saving}>Deshacer</button>
          <button className="adm-btn adm-btn-primary" onClick={save} disabled={locked || saving || invalid}>Guardar</button>
        </div>
      )}
    </div>
  )
}
