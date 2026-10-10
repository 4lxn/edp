import { Link } from 'react-router-dom'
import { business, copy, pathFor, sectionPath } from '../i18n'
import { Monogram } from './Brand'
import LangSwitch from './LangSwitch'

/** Shared footer: brand, navigation, contact and language on every page. */
export default function SiteFooter({ lang }) {
  const t = copy(lang)
  return (
    <footer className="footer">
      <div className="footer-top">
        <div className="footer-brand">
          <Monogram size={56} color="#B39B78" />
          <div>
            <div className="ft-name">{business.name}</div>
            <div className="ft-mark">{t.brandMark}</div>
            <a className="ft-mail" href={`mailto:${business.email}`}>{business.email}</a>
          </div>
        </div>
        <nav className="footer-nav" aria-label={t.nav.label}>
          <Link to={pathFor(lang, 'projects')}>{t.nav.projects}</Link>
          <Link to={sectionPath(lang, 'filosofia')}>{t.nav.philosophy}</Link>
          <Link to={sectionPath(lang, 'contacto')}>{t.nav.contact}</Link>
          <Link to={pathFor(lang, 'privacy')}>{t.footer.privacy}</Link>
        </nav>
      </div>

      <div className="footer-rule" />

      <div className="footer-bottom">
        <p>{t.footer.note}</p>
        <div className="footer-end">
          <LangSwitch lang={lang} className="ft-lang" />
          <span>{t.footer.copyright}</span>
        </div>
      </div>
    </footer>
  )
}
