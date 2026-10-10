import { Link } from 'react-router-dom'
import { m } from 'framer-motion'
import { albumCards, copy } from '../i18n'
import { useReveal, usePageMotion } from '../hooks'
import ResponsiveImage from '../components/ResponsiveImage'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'

export default function Projects({ lang }) {
  const t = copy(lang)
  const page = usePageMotion()
  useReveal()
  const projects = albumCards(lang)

  return (
    <m.div {...page}>
      <SiteHeader lang={lang} solid />

      <main id="contenido" className="page-main">
        <div className="page-wrap">
          <div className="sect-head page-in">
            <span className="kicker">
              <span className="rule" />
              {t.projects.label}
            </span>
          </div>
          <h1 className="display page-in">
            <span>{t.projects.title[0]}</span>
            <em>{t.projects.title[1]}</em>
          </h1>
          <p className="gallery-lede page-lede page-in">{t.projects.lede}</p>

          <div className="proj-grid">
            {projects.map((g, i) => (
              <article key={g.slug} className="g-card" data-reveal style={{ transitionDelay: `${i * 60}ms` }}>
                <Link className="g-frame" to={g.href} aria-label={`${t.gallery.view}: ${g.title}`}>
                  <div className="g-img">
                    <ResponsiveImage
                      src={g.img}
                      alt={g.type ? `${g.title} — ${g.type}` : g.title}
                      sizes="(max-width: 760px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      widths={[400, 800, 1200, 1600]}
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
                  <h2 className="g-title">{g.title}</h2>
                  {g.location && <div className="g-row g-foot"><span>{g.location}</span></div>}
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>

      <SiteFooter lang={lang} />
    </m.div>
  )
}
