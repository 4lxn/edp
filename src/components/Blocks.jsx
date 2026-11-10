import { Link } from 'react-router-dom'
import { ALBUMS } from '../albums.generated'
import { FACTS } from '../facts'
import { present } from '../i18n'
import { placeName } from '../seo'
import { useLang } from '../hooks'
import Picture from './Picture'

export const Arrow = () => <span className="arrow" aria-hidden="true">→</span>

/** "Tipo · Lugar · Año" — only the parts that exist. */
export function metaLine(album, lang) {
  return [album.type[lang], placeName(album.location[lang]), album.year].filter(Boolean).join(' · ')
}

export function pressOn(slug) {
  const p = FACTS.press
  return p && p.enabled && (!slug || p.project === slug) ? p : null
}

/** One project as a single link: photo, name, meta line, one measured fact. */
export function ProjectCard({ slug, ratio = 3 / 2, sizes, className = '', eager }) {
  const { lang, t, projectTo } = useLang()
  const a = ALBUMS[slug]
  const meta = metaLine(a, lang)
  const press = pressOn(slug)
  return (
    <Link className={'card ' + className} to={projectTo(slug)} data-reveal>
      <Picture
        img={a.images[a.hero]} ratio={ratio} sizes={sizes} eager={eager}
        alt={t.project.photoAlt(a.title, placeName(a.location[lang]), 1)}
      />
      <span className="card-text">
        <span className="h3 card-title">{a.title} <Arrow /></span>
        {meta && <span className="meta">{meta}</span>}
        {a.fact && <span className="meta card-fact">{a.fact[lang]}</span>}
        {press && <span className="meta card-fact">{t.press.tag(press.outlet)}</span>}
      </span>
    </Link>
  )
}

/** Charcoal band with one heading, one line and the quote button. */
export function CtaBand({ title, body, button, to }) {
  const { t, to: path } = useLang()
  return (
    <section className="band dark" data-hide-sticky>
      <div className="wrap band-in" data-reveal>
        <div>
          <h2 className="h2">{title}</h2>
          {body && <p className="lede">{body}</p>}
        </div>
        <Link className="btn btn-light" to={to || path('quote')}>{button || t.cta}</Link>
      </div>
    </section>
  )
}

/** Recognition row. Renders nothing unless the press flag in facts.js is on. */
export function PressLine({ slug }) {
  const { t, lang } = useLang()
  const p = pressOn(slug)
  if (!p) return null
  return (
    <div className="press">
      <div className="wrap press-in">
        <span className="label">{t.press.label}</span>
        <p className="press-text">
          {t.press.line(p)} <em>{p.outlet}</em>
          {p.issue ? ` ${t.press.issue(p.issue[lang] || p.issue)}` : ''}.
        </p>
        {p.url && (
          <a className="link" href={p.url} target="_blank" rel="noopener noreferrer">
            {t.press.link} <span aria-hidden="true">↗</span>
          </a>
        )}
      </div>
    </div>
  )
}

/** Numbered process steps; steps that depend on unknown facts are absent. */
export function Process({ heading: H = 'h2' }) {
  const { t, to } = useLang()
  const steps = present(t.process.steps)
  return (
    <section className="sect process">
      <div className="wrap">
        <H className="h2" data-reveal>{t.process.title}</H>
        <ol className={'steps steps-' + steps.length}>
          {steps.map((s, i) => (
            <li key={s.name} data-reveal style={{ '--d': i }}>
              <span className="step-n" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="h3">{s.name}</h3>
              <p>{s.body}</p>
              {s.note && <p className="meta">{s.note}</p>}
            </li>
          ))}
        </ol>
        <div className="process-end" data-reveal>
          <p className="lede">{t.process.closing}</p>
          <Link className="btn" to={to('quote')}>{t.cta}</Link>
        </div>
      </div>
    </section>
  )
}
