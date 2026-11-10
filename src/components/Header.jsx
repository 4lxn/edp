import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Monogram } from '../Brand'
import { useLang, useAnyInView } from '../hooks'
import { alternate, resolve } from '../routes'
import { EMAIL } from '../facts'

export function LangSwitch({ className = '' }) {
  const { pathname } = useLocation()
  const { lang, t } = useLang()
  return (
    <span className={'lang ' + className} role="group" aria-label={t.langLabel}>
      {['es', 'en'].map((l, i) => (
        <span key={l}>
          {i > 0 && <span aria-hidden="true" className="lang-sep">/</span>}
          <Link
            to={alternate(pathname, l)}
            hrefLang={l}
            lang={l}
            aria-current={l === lang ? 'true' : undefined}
            aria-label={`${l.toUpperCase()} · ${l === 'es' ? 'Español' : 'English'}`}
          >
            {l.toUpperCase()}
          </Link>
        </span>
      ))}
    </span>
  )
}

export default function Header() {
  const { pathname } = useLocation()
  const { t, to } = useLang()
  const [open, setOpen] = useState(false)
  // Transparent only while a dark hero ([data-hero]) is under the header.
  const overHero = useAnyInView('[data-hero]', pathname, {
    rootMargin: '-64px 0px 0px 0px',
    initial: resolve(pathname)?.key === 'home', // matches the prerendered landing
  })

  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  const links = [
    [t.nav.projects, to('projects')],
    [t.nav.services, { pathname: to('home'), hash: '#servicios' }],
    [t.nav.studio, { pathname: to('home'), hash: '#estudio' }],
  ]

  return (
    <header className={'hdr' + (overHero && !open ? ' is-over' : '') + (open ? ' is-open' : '')}>
      <a className="skip" href="#contenido">{t.skip}</a>
      <div className="hdr-in">
        <Link className="brand" to={to('home')} aria-label={t.brand}>
          <Monogram size={24} color="var(--bronze)" />
          <span className="brand-name">{t.brand}</span>
        </Link>
        <nav className="hdr-nav" aria-label={t.menu}>
          {links.map(([label, dest]) => <Link key={label} to={dest}>{label}</Link>)}
          <LangSwitch />
        </nav>
        <Link className="btn hdr-cta" to={to('quote')}>{t.cta}</Link>
        <button
          type="button" className="hdr-menu" aria-expanded={open} aria-controls="menu-sheet"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? t.close : t.menu}
        </button>
      </div>

      <div id="menu-sheet" className="sheet" hidden={!open}>
        <nav className="sheet-nav" aria-label={t.menu}>
          {links.map(([label, dest]) => (
            <Link key={label} to={dest} onClick={() => setOpen(false)}>{label}</Link>
          ))}
          <Link to={to('quote')} onClick={() => setOpen(false)}>{t.nav.quote}</Link>
        </nav>
        <div className="sheet-foot">
          <LangSwitch />
          <a className="sheet-mail" href={`mailto:${EMAIL}`}>{EMAIL}</a>
          <Link className="btn btn-light btn-block" to={to('quote')} onClick={() => setOpen(false)}>{t.cta}</Link>
        </div>
      </div>
    </header>
  )
}
