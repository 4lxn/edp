import { Link, useLocation } from 'react-router-dom'
import { Monogram } from '../Brand'
import { useLang, useAnyInView } from '../hooks'
import { LangSwitch } from './Header'
import { EMAIL } from '../facts'
import { resolve } from '../routes'

export default function Footer() {
  const { t, to } = useLang()
  return (
    <footer className="ftr" data-hide-sticky>
      <div className="wrap">
        <div className="ftr-top">
          <Link className="brand" to={to('home')}>
            <Monogram size={28} color="var(--bronze)" />
            <span className="brand-name">{t.brand}</span>
          </Link>
          <div className="ftr-cta">
            <p className="h3">{t.footer.closing}</p>
            <div className="ftr-actions">
              <Link className="btn btn-light" to={to('quote')}>{t.cta}</Link>
              <a className="link" href={`mailto:${EMAIL}`}>{EMAIL}</a>
            </div>
          </div>
        </div>
        <nav className="ftr-nav" aria-label={t.brand}>
          <Link to={to('projects')}>{t.nav.projects}</Link>
          <Link to={{ pathname: to('home'), hash: '#servicios' }}>{t.nav.services}</Link>
          <Link to={{ pathname: to('home'), hash: '#estudio' }}>{t.nav.studio}</Link>
          <Link to={to('quote')}>{t.nav.quote}</Link>
          <Link to={to('privacy')}>{t.nav.privacy}</Link>
          <LangSwitch />
        </nav>
        <p className="ftr-legal">{t.brand} · {t.footer.address} · {t.footer.rights(__BUILD_YEAR__)}
          <span> · {t.footer.credit} <a href="https://xlxn.dev" target="_blank" rel="noopener" style={{ color: 'var(--bronze)' }}>xlxn.dev</a></span>
        </p>
      </div>
    </footer>
  )
}

/** Mobile-only bottom bar: one button. Hidden over the hero, the form and the footer. */
export function StickyCta() {
  const { pathname } = useLocation()
  const { t, to } = useLang()
  const blocked = useAnyInView('[data-hero], [data-hide-sticky]', pathname, { fallback: true })
  const r = resolve(pathname)
  if (r && r.key === 'quote') return null
  return (
    <div className={'sticky' + (blocked ? '' : ' is-on')} aria-hidden={blocked}>
      <Link className="btn btn-block" to={to('quote')} tabIndex={blocked ? -1 : 0}>{t.cta}</Link>
    </div>
  )
}
