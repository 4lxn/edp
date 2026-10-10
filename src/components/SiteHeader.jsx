import { useCallback, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { business, copy, pathFor, sectionPath } from '../i18n'
import { useScrolledPast } from '../hooks'
import { Monogram } from './Brand'
import LangSwitch from './LangSwitch'
import MobileMenu from './MobileMenu'

/**
 * Shared header. Transparent over a photo hero; `solid` (pages without a hero)
 * starts in the condensed greige style. On phones the links move into
 * <MobileMenu>.
 */
export default function SiteHeader({ lang, solid = false }) {
  const t = copy(lang)
  const scrolled = useScrolledPast(80)
  const condensed = solid || scrolled
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])

  return (
    <>
      <a className="skip-link" href="#contenido">{t.skip}</a>
      <header className={'site-header' + (condensed ? ' is-condensed' : '')}>
        <div className="hdr-inner">
          {/* Named by its visible text (brand + tagline), so voice control
              users can say what they see. */}
          <Link className="brand" to={pathFor(lang, 'home')}>
            <Monogram size={condensed ? 24 : 30} />
            <span className="brand-words">
              <span className="brand-name">{business.name}</span>
              <span className="brand-mark">{t.brandMark}</span>
            </span>
          </Link>

          <nav className="hdr-nav" aria-label={t.nav.label}>
            <NavLink to={pathFor(lang, 'projects')}>{t.nav.projects}</NavLink>
            <Link to={sectionPath(lang, 'filosofia')}>{t.nav.philosophy}</Link>
            <Link to={sectionPath(lang, 'contacto')}>{t.nav.contact}</Link>
          </nav>

          <div className="hdr-actions">
            <LangSwitch lang={lang} className="hdr-lang" />
            <Link className="btn btn-ghost hdr-cta" to={sectionPath(lang, 'contacto')}>
              {t.cta}<span className="btn-arrow" aria-hidden="true">→</span>
            </Link>
            <button
              type="button"
              className="hdr-burger"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={t.menu.open}
              onClick={() => setOpen(true)}
            >
              <span /><span />
            </button>
          </div>
        </div>
      </header>
      <MobileMenu lang={lang} open={open} onClose={close} />
    </>
  )
}
