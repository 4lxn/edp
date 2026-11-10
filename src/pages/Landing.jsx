import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ALBUMS, ALBUM_ORDER, SITE } from '../albums.generated'
import { FACTS, say } from '../facts'
import { SERVICE_KEYS } from '../routes'
import { useLang } from '../hooks'
import Picture from '../components/Picture'
import { ProjectCard, PressLine, Process, Arrow } from '../components/Blocks'
import { QuoteSection } from '../components/QuoteForm'

function Hero() {
  const { t, to } = useLang()
  const img = SITE.hero
  return (
    <section className="hero" data-hero>
      {img && (
        <div className="hero-media">
          <Picture
            img={img} alt={t.hero.alt} eager cap={false} sizes="100vw" className="hero-pic"
            style={{ aspectRatio: 'auto', '--focus': img.focus || '50% 50%', '--focus-m': img.focusMobile || img.focus || '50% 50%' }}
          />
        </div>
      )}
      <div className="hero-shade" aria-hidden="true" />
      <div className="wrap hero-text">
        <p className="label">{t.hero.label}</p>
        <h1 className="h1">{t.hero.title}</h1>
        <p className="lede">{t.hero.lede}</p>
        <div className="actions">
          <Link className="btn btn-light" to={to('quote')}>{t.cta}</Link>
          <Link className="link" to={to('projects')}>{t.hero.secondary}</Link>
        </div>
      </div>
    </section>
  )
}

/** Four numbers. Needs at least three confirmed facts, otherwise it is absent. */
function Facts() {
  const { t } = useLang()
  const items = ['yearsBuilding', 'structuresBuilt', 'largestSpanM', 'oldestInServiceYears']
    .filter((k) => FACTS[k] != null)
  if (items.length < 3) return null
  return (
    <section className="facts">
      <dl className={'wrap facts-in facts-' + items.length}>
        {items.map((k) => (
          <div key={k} data-reveal>
            <dt className="label">{t.facts[k]}</dt>
            <dd className="num">{FACTS[k]}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function Selected() {
  const { t, to } = useLang()
  const featured = ALBUM_ORDER.filter((s) => ALBUMS[s].featured).slice(0, 4)
  const picks = featured.length ? featured : ALBUM_ORDER.slice(0, 4)
  const [a, b, c, d] = picks
  return (
    <section className="sect selected">
      <div className="wrap">
        <div className="sect-head" data-reveal>
          <h2 className="h2">{t.selected.title}</h2>
          <Link className="link" to={to('projects')}>{t.selected.all(ALBUM_ORDER.length)}</Link>
        </div>
        <div className="sel">
          {a && <ProjectCard slug={a} ratio={16 / 9} className="sel-a" sizes="(min-width: 1440px) 1264px, 90vw" />}
          {b && <ProjectCard slug={b} ratio={4 / 5} className="sel-b" sizes="(min-width: 900px) 38vw, 90vw" />}
          {c && <ProjectCard slug={c} ratio={3 / 2} className="sel-c" sizes="(min-width: 900px) 46vw, 90vw" />}
          {d && <ProjectCard slug={d} ratio={3 / 2} className="sel-d" sizes="(min-width: 900px) 60vw, 90vw" />}
        </div>
      </div>
    </section>
  )
}

function Services() {
  const { t, to } = useLang()
  const [active, setActive] = useState(SERVICE_KEYS[0])
  return (
    <section className="sect services" id="servicios">
      <div className="wrap">
        <h2 className="h2" data-reveal>{t.services.title}</h2>
        <div className="svc">
          <ol className="svc-list">
            {SERVICE_KEYS.map((k, i) => {
              const s = t.services.items[k]
              return (
                <li key={k} data-reveal onMouseEnter={() => setActive(k)} onFocus={() => setActive(k)}>
                  <Picture img={SITE.services[k]} ratio={3 / 2} alt={s.alt} sizes="90vw" className="svc-pic-m" />
                  <span className="step-n" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <h3 className="h3">{s.name}</h3>
                    <p>{s.short}</p>
                    <Link className="link" to={to(k)} aria-label={`${t.services.more}: ${s.name}`}>
                      {t.services.more} <Arrow />
                    </Link>
                  </div>
                </li>
              )
            })}
          </ol>
          <div className="svc-stage" aria-hidden="true">
            {SERVICE_KEYS.map((k) => (
              <Picture key={k} img={SITE.services[k]} ratio={4 / 5} alt="" sizes="34vw"
                className={'svc-pic' + (k === active ? ' is-on' : '')} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/** A muted loop that only plays while on screen and never under reduced motion. */
function Clip({ item }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) return
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      (navigator.connection && navigator.connection.saveData)
    if (still) return
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.preload = 'auto'; el.play().catch(() => {}) } else el.pause()
    }, { threshold: 0.25 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <video ref={ref} className="film-item" muted loop playsInline preload="none"
      poster={item.poster} width={item.w} height={item.h} aria-label={item.alt || ''}>
      <source src={item.src} type="video/mp4" />
    </video>
  )
}

/** "En obra": process clips and construction stills. Absent when there is no material. */
function Film() {
  const { t, lang } = useLang()
  const items = SITE.film || []
  if (!items.length) return null
  return (
    <section className="film dark">
      <div className="wrap film-in">
        <div className="film-text" data-reveal>
          <h2 className="h2">{t.film.title}</h2>
          {t.film.body && <p className="lede">{t.film.body}</p>}
        </div>
        <div className="film-row" tabIndex={0} role="group" aria-label={t.film.title}>
          {items.map((it) => it.video
            ? <Clip key={it.src} item={{ ...it, alt: say(it.alt, lang) }} />
            : <Picture key={it.src} img={it} ratio={9 / 16} alt={say(it.alt, lang) || ''} sizes="(min-width: 900px) 20vw, 78vw" className="film-item" />)}
        </div>
      </div>
    </section>
  )
}

function Studio() {
  const { t, lang } = useLang()
  const s = t.studio
  const portrait = FACTS.founderPortrait && SITE.portrait
  const q = FACTS.testimonial
  const names = (list) => (Array.isArray(list) && list.length ? list.join(' · ') : null)
  return (
    <section className="sect studio" id="estudio">
      <div className={'wrap studio-in' + (portrait ? ' has-portrait' : '')}>
        {portrait && (
          <Picture img={SITE.portrait} ratio={4 / 5} sizes="(min-width: 900px) 38vw, 90vw"
            alt={s.portraitAlt(FACTS.founderName || t.brand)} className="studio-pic" />
        )}
        <div className="studio-head" data-reveal>
          <p className="label">{s.label}</p>
          <h2 className="h2">{s.title}</h2>
        </div>
        <div className="studio-body" data-reveal>
          {s.body.map((p) => <p key={p}>{p}</p>)}
          {FACTS.founderName && (
            <p className="sign">
              {FACTS.founderName}{FACTS.founderRole ? `, ${say(FACTS.founderRole, lang)}` : ''}
            </p>
          )}
        </div>
      </div>
      {q && (
        <figure className="wrap testimonial" data-reveal>
          <blockquote>{say(q.quote, lang)}</blockquote>
          <figcaption className="meta">{[q.name, say(q.role, lang)].filter(Boolean).join(', ')}</figcaption>
        </figure>
      )}
      {(names(FACTS.clients) || names(FACTS.architects)) && (
        <div className="wrap clients" data-reveal>
          {names(FACTS.clients) && <p><span className="label">{s.builtFor}</span> {names(FACTS.clients)}</p>}
          {names(FACTS.architects) && <p><span className="label">{s.builtWith}</span> {names(FACTS.architects)}</p>}
        </div>
      )}
    </section>
  )
}

/** "Para quién": three buyer-specific claims. Hidden until the owner confirms them. */
function Audience() {
  const { t, to } = useLang()
  if (!FACTS.audienceClaims) return null
  return (
    <section className="sect audience">
      <div className="wrap">
        <h2 className="h2" data-reveal>{t.audience.title}</h2>
        <ul className="steps steps-3">
          {t.audience.items.map((it, i) => (
            <li key={it.key} data-reveal style={{ '--d': i }}>
              <h3 className="h3">{it.name}</h3>
              <p>{it.body}</p>
              <Link className="link" to={`${to('quote')}?perfil=${it.key}`} aria-label={`${t.audience.link}: ${it.name}`}>
                {t.audience.link} <Arrow />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default function Landing() {
  return (
    <>
      <Hero />
      <PressLine />
      <Facts />
      <Selected />
      <Services />
      <Film />
      <Process />
      <Studio />
      <Audience />
      <QuoteSection id="cotizar" />
    </>
  )
}
