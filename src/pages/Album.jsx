import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { m } from 'framer-motion'
import { ALBUMS } from '../albums.generated'
import { albumCards, copy, fill, isAlbum, pathFor } from '../i18n'
import { useReveal, usePageMotion } from '../hooks'
import ResponsiveImage from '../components/ResponsiveImage'
import Lightbox from '../components/Lightbox'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'
import NotFound from './NotFound'

export default function Album({ lang }) {
  const { slug } = useParams()
  return isAlbum(slug) ? <AlbumPage key={slug} al={ALBUMS[slug]} lang={lang} /> : <NotFound lang={lang} />
}

function AlbumPage({ al, lang }) {
  const t = copy(lang)
  const page = usePageMotion()
  const [lbIndex, setLbIndex] = useState(null)
  useReveal()

  const total = al.images.length
  const images = al.images.map((im, i) => ({
    src: im.src,
    caption: im.caption[lang],
    alt: im.alt[lang] || im.caption[lang] || fill(t.album.photoAlt, { title: al.title, n: i + 1, total }),
  }))
  const cards = albumCards(lang)
  const number = cards.find((c) => c.slug === al.slug)?.n
  const others = cards.filter((c) => c.slug !== al.slug)
  const type = al.type[lang]
  const d = (ms) => ({ '--d': `${ms}ms` })

  return (
    <m.div {...page}>
      <SiteHeader lang={lang} />

      <main id="contenido">
        {/* Hero — parallax is CSS-only (see .hero-img in styles.css) */}
        <section className="hero album-hero">
          <div className="hero-media">
            <div className="hero-img">
              <ResponsiveImage src={al.hero} alt={type ? `${al.title} — ${type}` : al.title} sizes="100vw" priority />
            </div>
            <div className="hero-veil" />
          </div>

          <div className="hero-grid album-hero-grid">
            {al.location[lang] && (
              <div className="hero-eyebrow hero-in" style={d(100)}>
                <span className="rule" />
                <span>{al.location[lang]}</span>
              </div>
            )}
            <div className="hero-title-wrap">
              <h1 className="hero-title">
                <span className="line line-1 hero-in" style={d(200)}>{al.title}</span>
                {type && <span className="line line-2 hero-in" style={d(320)}>{type}</span>}
              </h1>
            </div>
          </div>

          <div className="hero-corners" aria-hidden="true">
            <span className="c c-tl" /><span className="c c-tr" />
            <span className="c c-bl" /><span className="c c-br" />
          </div>
        </section>

        <div className="album-main">
          <div className="album-wrap">
            <nav className="crumbs" aria-label="Breadcrumb">
              <Link to={pathFor(lang, 'home')}>{t.nav.home}</Link>
              <span aria-hidden="true">/</span>
              <Link to={pathFor(lang, 'projects')}>{t.nav.projects}</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page">{al.title}</span>
            </nav>

            <div className="album-intro">
              <span className="kicker">
                <span className="rule" />
                {t.album.label}
                <span className="kicker-num" aria-hidden="true">{number}</span>
              </span>
              {al.description[lang] && <p className="album-desc">{al.description[lang]}</p>}
            </div>

            {images.length === 1 ? (
              <>
                <button
                  type="button"
                  className="album-thumb album-single"
                  onClick={() => setLbIndex(0)}
                  aria-label={`${fill(t.album.open, { n: 1, total })}: ${images[0].alt}`}
                  data-reveal
                >
                  <ResponsiveImage src={images[0].src} alt={images[0].alt} sizes="(max-width: 1480px) 100vw, 1480px" />
                </button>
                <p className="album-soon">{t.album.comingSoon}</p>
              </>
            ) : (
              <div className="album-grid">
                {images.map((img, i) => (
                  <figure
                    key={img.src}
                    className={'album-fig' + (i === 0 ? ' is-wide' : '')}
                    data-reveal
                    style={{ transitionDelay: `${Math.min(i, 6) * 60}ms` }}
                  >
                    <button
                      type="button"
                      className="album-thumb"
                      onClick={() => setLbIndex(i)}
                      aria-label={`${fill(t.album.open, { n: i + 1, total })}: ${img.alt}`}
                    >
                      <ResponsiveImage
                        src={img.src}
                        alt={img.alt}
                        sizes={i === 0 ? '(max-width: 1480px) 100vw, 1480px' : '(max-width: 900px) 100vw, 50vw'}
                      />
                    </button>
                    {img.caption && <figcaption className="album-cap">{img.caption}</figcaption>}
                  </figure>
                ))}
              </div>
            )}
          </div>

          {others.length > 0 && (
            <section className="album-others" aria-labelledby="otros-proyectos">
              <div className="sect-head" data-reveal>
                <h2 className="kicker" id="otros-proyectos">
                  <span className="rule" />
                  {t.album.others}
                </h2>
              </div>
              <div className="others-grid">
                {others.map((p, i) => (
                  <Link key={p.slug} to={p.href} className="other-card" data-reveal style={{ transitionDelay: `${i * 60}ms` }}>
                    <div className="other-img">
                      <ResponsiveImage src={p.img} alt={p.title} sizes="(max-width: 760px) 100vw, 25vw" widths={[400, 800, 1200]} />
                    </div>
                    {p.type && <div className="other-type">{p.type}</div>}
                    <div className="other-title">{p.title}</div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <SiteFooter lang={lang} />
      <Lightbox images={images} index={lbIndex} setIndex={setLbIndex} lang={lang} />
    </m.div>
  )
}
