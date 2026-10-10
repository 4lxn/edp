import { Link } from 'react-router-dom'
import { m } from 'framer-motion'
import { copy, pathFor } from '../i18n'
import { usePageMotion } from '../hooks'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'

export default function NotFound({ lang }) {
  const t = copy(lang).notFound
  const page = usePageMotion()

  return (
    <m.div {...page}>
      <SiteHeader lang={lang} solid />

      <main id="contenido" className="page-main">
        <div className="page-wrap">
          <div className="sect-head page-in">
            <span className="kicker">
              <span className="rule" />
              {t.label}
            </span>
          </div>
          <h1 className="display page-in">
            <span>{t.title[0]}</span>
            <em>{t.title[1]}</em>
          </h1>
          <p className="gallery-lede page-lede page-in">{t.body}</p>
          <div className="nf-actions page-in">
            <Link className="btn btn-solid" to={pathFor(lang, 'home')}>
              {t.home}<span className="btn-arrow" aria-hidden="true">→</span>
            </Link>
            <Link className="btn btn-ghost" to={pathFor(lang, 'projects')}>
              {t.projects}<span className="btn-arrow" aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter lang={lang} />
    </m.div>
  )
}
