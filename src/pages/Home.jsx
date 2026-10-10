import { Link } from 'react-router-dom'
import { m } from 'framer-motion'
import { albumCards, business, copy, pathFor, sectionPath } from '../i18n'
import { HERO_IMAGE } from '../seo'
import { useReveal, usePageMotion } from '../hooks'
import { Monogram } from '../components/Brand'
import ResponsiveImage from '../components/ResponsiveImage'
import ContactForm from '../components/ContactForm'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'

const ROMAN = ['I', 'II', 'III']

/* ---------- Hero ---------- */
// Entrance choreography (media fade → eyebrow → title lines → foot → scroll →
// spec) is pure CSS (.hero-in + --d delay), so the pre-rendered headline paints
// without waiting for JavaScript. Parallax is CSS scroll-driven (styles.css).
function Hero({ t, lang }) {
  const d = (ms) => ({ '--d': `${ms}ms` })
  return (
    <section className="hero" id="top">
      <div className="hero-media">
        <div className="hero-img">
          <ResponsiveImage src={HERO_IMAGE} alt={t.hero.imageAlt} sizes="100vw" priority />
        </div>
        <div className="hero-veil" />
      </div>

      <div className="hero-grid">
        <div className="hero-eyebrow hero-in" style={d(150)}>
          <span className="rule" />
          <span>{t.hero.eyebrow}</span>
        </div>

        <div className="hero-title-wrap">
          <h1 className="hero-title">
            <span className="line line-1 hero-in" style={d(270)}>{t.hero.title[0]}</span>
            <span className="line line-2 hero-in" style={d(410)}>{t.hero.title[1]}</span>
          </h1>
        </div>

        <div className="hero-foot hero-in" style={d(550)}>
          <p className="hero-sub">{t.hero.sub}</p>
          <div className="hero-meta">
            <span>{t.hero.coords}</span>
            <span aria-hidden="true">·</span>
            <span>{t.hero.place}</span>
          </div>
        </div>

        <Link className="hero-scroll hero-in" style={d(670)} to={sectionPath(lang, 'filosofia')}>
          <span className="scroll-line" />
          <span>{t.hero.scroll}</span>
        </Link>

        <ul className="hero-spec hero-in" style={d(790)}>
          {t.hero.spec.map((s, i) => (
            <li key={s}><em>{ROMAN[i]}</em><span>{s}</span></li>
          ))}
        </ul>
      </div>

      <div className="hero-corners" aria-hidden="true">
        <span className="c c-tl" /><span className="c c-tr" />
        <span className="c c-bl" /><span className="c c-br" />
      </div>
    </section>
  )
}

/* ---------- Statement ---------- */
function Statement({ t }) {
  return (
    <section className="statement" id="filosofia">
      <div className="sect-head" data-reveal>
        <h2 className="kicker">
          <span className="rule" />
          {t.statement.label}
          <span className="kicker-num" aria-hidden="true">II</span>
        </h2>
      </div>
      <div className="statement-body">
        <p className="statement-text" data-reveal>
          {t.statement.text.split(' ').map((w, i) => (
            <span key={`${w}-${i}`} className="word" style={{ transitionDelay: `${i * 14}ms` }}>
              {w + ' '}
            </span>
          ))}
        </p>
        <div className="statement-sig" data-reveal>{t.statement.sig}</div>
      </div>
    </section>
  )
}

/* ---------- Gallery (featured) ---------- */
// Parallax is CSS-only (see .g-img in styles.css): a view()-timeline
// animation drifts each image as its card crosses the viewport.
function Gallery({ t, lang }) {
  const items = albumCards(lang, { featuredOnly: true })
  return (
    <section className="gallery" id="obra">
      <header className="gallery-head">
        <div className="sect-head" data-reveal>
          <span className="kicker">
            <span className="rule" />
            {t.gallery.label}
            <span className="kicker-num" aria-hidden="true">III</span>
          </span>
        </div>
        <h2 className="display" data-reveal>
          <span>{t.gallery.title[0]}</span>
          <em>{t.gallery.title[1]}</em>
        </h2>
        <p className="gallery-lede" data-reveal>{t.gallery.lede}</p>
      </header>

      <div className="gallery-grid">
        {items.map((g, i) => (
          <article
            key={g.slug}
            className={'g-card g-card-' + (i + 1)}
            data-reveal
            style={{ transitionDelay: `${i * 80}ms` }}
          >
            <Link className="g-frame" to={g.href} aria-label={`${t.gallery.view}: ${g.title}`}>
              <div className="g-img">
                <ResponsiveImage
                  src={g.img}
                  alt={g.type ? `${g.title} — ${g.type}` : g.title}
                  sizes="(max-width: 980px) 100vw, 60vw"
                />
              </div>
              <div className="g-overlay" aria-hidden="true">
                <span className="g-view">{t.gallery.view} <span className="arr">→</span></span>
              </div>
            </Link>
            <div className="g-meta">
              <div className="g-row">
                <span className="g-num">{g.n}</span>
                {g.type && <span className="g-type">{g.type}</span>}
              </div>
              <h3 className="g-title">{g.title}</h3>
              {g.location && <div className="g-row g-foot"><span>{g.location}</span></div>}
            </div>
          </article>
        ))}
      </div>

      <div className="gallery-foot" data-reveal>
        <Link className="btn btn-ghost" to={pathFor(lang, 'projects')}>
          {t.gallery.all}<span className="btn-arrow" aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  )
}

/* ---------- Image break ---------- */
// Parallax is CSS-only (see .break-img in styles.css).
function ImageBreak({ src, caption, alt }) {
  return (
    <figure className="break">
      <div className="break-img">
        <ResponsiveImage src={src} alt={alt} sizes="100vw" />
      </div>
      <figcaption className="break-cap" data-reveal>
        <span className="break-num" aria-hidden="true">—</span>
        <span className="break-rule" aria-hidden="true" />
        <span>{caption}</span>
      </figcaption>
    </figure>
  )
}

/* ---------- Contact ---------- */
function Contact({ t, lang }) {
  return (
    <section className="contact" id="contacto">
      <div className="sect-head" data-reveal>
        <span className="kicker">
          <span className="rule" />
          {t.contact.label}
          <span className="kicker-num" aria-hidden="true">IV</span>
        </span>
      </div>

      <div className="contact-grid">
        <h2 className="contact-title" data-reveal>
          {t.contact.title.map((line, i) => (
            <span key={line} className="line" style={{ transitionDelay: `${i * 80}ms` }}>{line}</span>
          ))}
        </h2>

        <div className="contact-side" data-reveal>
          <p className="contact-body">{t.contact.body}</p>
          <ContactForm lang={lang} />
          <ul className="contact-meta">
            <li><a href={`mailto:${business.email}`}>{business.email}</a></li>
            {business.phone && <li><a href={`tel:${business.phone.replace(/[^\d+]/g, '')}`}>{business.phone}</a></li>}
            <li>{t.contact.region}</li>
          </ul>
        </div>

        <div className="contact-mark" data-reveal aria-hidden="true">
          <Monogram size={120} color="#B39B78" />
        </div>
      </div>
    </section>
  )
}

/* ---------- Page ---------- */
export default function Home({ lang }) {
  const t = copy(lang)
  const page = usePageMotion()
  useReveal()

  return (
    <m.div {...page}>
      <SiteHeader lang={lang} />
      <main id="contenido">
        <Hero t={t} lang={lang} />
        <Statement t={t} />
        <ImageBreak src="/assets/infinity-pool.jpeg" caption={t.breaks[0].caption} alt={t.breaks[0].alt} />
        <Gallery t={t} lang={lang} />
        <ImageBreak src="/assets/deck-ocean.jpeg" caption={t.breaks[1].caption} alt={t.breaks[1].alt} />
        <Contact t={t} lang={lang} />
      </main>
      <SiteFooter lang={lang} />
    </m.div>
  )
}
