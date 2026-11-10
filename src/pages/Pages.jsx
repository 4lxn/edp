import { Link } from 'react-router-dom'
import { ALBUMS, ALBUM_ORDER, SITE } from '../albums.generated'
import { useLang } from '../hooks'
import { present } from '../i18n'
import Picture from '../components/Picture'
import { ProjectCard, CtaBand, Process } from '../components/Blocks'
import { QuoteSection } from '../components/QuoteForm'

export function Quote() {
  return <QuoteSection as="h1" />
}

/** One service: what it is, a photograph, how we work, built work, the quote action. */
export function Service({ k }) {
  const { t, to } = useLang()
  const s = t.services.items[k]
  const featured = ALBUM_ORDER.filter((slug) => ALBUMS[slug].featured).slice(0, 2)
  return (
    <>
      <div className="wrap svc-page">
        <div className="svc-page-text">
          <p className="label">{t.services.title}</p>
          <h1 className="h1 h1-page">{s.name}</h1>
          {present(s.body).map((p, i) => <p key={p} className={i === 0 ? 'lede' : undefined}>{p}</p>)}
          <div className="actions">
            <Link className="btn" to={to('quote')}>{t.cta}</Link>
            <Link className="link" to={to('projects')}>{t.hero.secondary}</Link>
          </div>
        </div>
        <Picture img={SITE.services[k]} ratio={4 / 5} alt={s.alt} eager sizes="(min-width: 900px) 40vw, 90vw" />
      </div>
      <Process />
      <section className="sect">
        <div className="wrap">
          <div className="sect-head">
            <h2 className="h2">{t.selected.title}</h2>
            <Link className="link" to={to('projects')}>{t.selected.all(ALBUM_ORDER.length)}</Link>
          </div>
          <div className="grid-2">
            {featured.map((slug) => <ProjectCard key={slug} slug={slug} sizes="(min-width: 900px) 44vw, 90vw" />)}
          </div>
        </div>
      </section>
      <CtaBand title={t.footer.closing} />
    </>
  )
}

export function Privacy() {
  const { t } = useLang()
  const p = t.privacy
  return (
    <div className="wrap prose">
      <h1 className="h1 h1-page">{p.title}</h1>
      <p className="meta">{p.updated}</p>
      {p.sections.map(([title, paras]) => (
        <section key={title}>
          <h2 className="h3">{title}</h2>
          {paras.map((par) => <p key={par}>{par}</p>)}
        </section>
      ))}
    </div>
  )
}

export function NotFound() {
  const { t, to } = useLang()
  return (
    <div className="wrap prose notfound">
      <h1 className="h1 h1-page">{t.notFound.title}</h1>
      <p className="lede">{t.notFound.body}</p>
      <div className="actions">
        <Link className="btn" to={to('home')}>{t.notFound.home}</Link>
        <Link className="link" to={to('projects')}>{t.nav.projects}</Link>
      </div>
    </div>
  )
}
