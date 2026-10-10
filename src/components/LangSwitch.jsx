import { Link, useLocation } from 'react-router-dom'
import { LANGS, alternatePath, copy } from '../i18n'

/**
 * ES · EN links to the same page in the other language. (The #section isn't
 * carried over: the server render can't know it, and a mismatched href would
 * break hydration.)
 */
export default function LangSwitch({ lang, className = '', onNavigate }) {
  const { pathname } = useLocation()
  const t = copy(lang)
  return (
    <div className={'lang-switch ' + className} role="group" aria-label={t.lang.label}>
      {LANGS.map((l) => (
        <Link
          key={l}
          to={alternatePath(pathname, l)}
          hrefLang={l}
          lang={l}
          aria-current={l === lang ? 'true' : undefined}
          aria-label={t.lang.names[l]}
          onClick={onNavigate}
        >
          {l.toUpperCase()}
        </Link>
      ))}
    </div>
  )
}
