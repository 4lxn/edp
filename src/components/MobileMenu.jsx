import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { business, copy, pathFor, sectionPath } from '../i18n'
import { useFocusTrap, useScrollLock } from '../hooks'
import { Monogram } from './Brand'
import LangSwitch from './LangSwitch'

/** Full-screen navigation for phones (≤ 900 px). Always in the DOM, hidden when closed. */
export default function MobileMenu({ lang, open, onClose }) {
  const t = copy(lang)
  const ref = useRef(null)
  useScrollLock(open)
  useFocusTrap(ref, open, onClose)

  return (
    <div
      ref={ref}
      id="mobile-menu"
      className={'mm' + (open ? ' is-open' : '')}
      role="dialog"
      aria-modal="true"
      aria-label={t.menu.label}
      aria-hidden={!open}
    >
      <div className="mm-top">
        <Monogram size={28} color="var(--bronze)" />
        <button type="button" className="mm-close" onClick={onClose} aria-label={t.menu.close}>
          <span aria-hidden="true">✕</span>
        </button>
      </div>

      <nav className="mm-nav" aria-label={t.nav.label}>
        <Link to={pathFor(lang, 'projects')} onClick={onClose}>{t.nav.projects}</Link>
        <Link to={sectionPath(lang, 'filosofia')} onClick={onClose}>{t.nav.philosophy}</Link>
        <Link to={sectionPath(lang, 'contacto')} onClick={onClose}>{t.nav.contact}</Link>
      </nav>

      <div className="mm-foot">
        <Link className="btn btn-solid mm-cta" to={sectionPath(lang, 'contacto')} onClick={onClose}>
          {t.cta}<span className="btn-arrow" aria-hidden="true">→</span>
        </Link>
        <a className="mm-mail" href={`mailto:${business.email}`}>{business.email}</a>
        <LangSwitch lang={lang} className="mm-lang" onNavigate={onClose} />
      </div>
    </div>
  )
}
