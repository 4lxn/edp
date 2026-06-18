import { Link } from 'react-router-dom'
import { m } from 'framer-motion'
import { COPY } from './copy'
import { Monogram } from './Brand'
import { useScrolledPast, useReveal, usePageMotion } from './hooks'

export default function Projects() {
  const t = COPY.es
  const condensed = useScrolledPast(80)
  const page = usePageMotion()
  useReveal()
  const projects = t.allProjects

  return (
    <m.div {...page}>
      {/* Header */}
      <header className={'site-header ' + (condensed ? 'is-condensed' : '')}>
        <div className="hdr-inner">
          <Link className="brand" to="/">
            <Monogram kind="trussed" size={condensed ? 24 : 30} />
            <span className="brand-words">
              <span className="brand-name">Estructuras del Pacífico</span>
              <span className="brand-mark">Maestría en madera</span>
            </span>
          </Link>
          <nav className="hdr-nav">
            <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span className="num">←</span>
              <span>Inicio</span>
            </Link>
          </nav>
          <a className="btn btn-ghost" href={`mailto:${t.contactEmail}`}>
            {t.cta}
            <span className="btn-arrow">→</span>
          </a>
        </div>
      </header>

      {/* Page */}
      <main style={{ padding: 'clamp(120px, 18vh, 220px) var(--grid-pad) clamp(80px, 12vh, 160px)' }}>
        <div style={{ maxWidth: 1480, margin: '0 auto' }}>
          <div className="sect-head" data-reveal>
            <span className="kicker">
              <span className="rule" />
              {t.projectsLabel}
            </span>
          </div>
          <h1 className="display" data-reveal>
            <span>{t.projectsTitle[0]}</span>
            <em>{t.projectsTitle[1]}</em>
          </h1>
          <p className="gallery-lede" data-reveal style={{ marginBottom: 'clamp(48px, 6vw, 88px)' }}>
            {t.projectsLede}
          </p>

          <div className="proj-grid">
            {projects.map((g, i) => (
              <article key={g.slug} className="g-card" data-reveal style={{ transitionDelay: `${i * 60}ms` }}>
                <Link className="g-frame" to={`/album/${g.slug}`}>
                  <div className="g-img" style={{ backgroundImage: `url(${g.img})` }} />
                  <div className="g-overlay">
                    <span className="g-view">Ver álbum <span className="arr">→</span></span>
                  </div>
                </Link>
                <div className="g-meta">
                  <div className="g-row">
                    <span className="g-num">{g.n}</span>
                    <span className="g-type">{g.type}</span>
                  </div>
                  <h3 className="g-title">{g.title}</h3>
                  <div className="g-row g-foot"><span>{g.meta}</span></div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-rule" style={{ marginTop: 0 }} />
        <div className="footer-bottom" style={{ maxWidth: 1480, margin: '0 auto', padding: '32px 0' }}>
          <p>{t.footerNote}</p>
          <ul style={{ listStyle: 'none', display: 'flex', gap: 24 }}>
            {t.footerLegal.map((l) => <li key={l}>{l}</li>)}
          </ul>
        </div>
      </footer>
    </m.div>
  )
}
