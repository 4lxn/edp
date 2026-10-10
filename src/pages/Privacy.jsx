import { m } from 'framer-motion'
import { business, copy, fill } from '../i18n'
import { usePageMotion } from '../hooks'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'

/** Turns the contact email inside a sentence into a mailto link. */
function withEmailLink(text) {
  const parts = text.split(business.email)
  return parts.flatMap((part, i) =>
    i === 0 ? [part] : [<a key={i} href={`mailto:${business.email}`}>{business.email}</a>, part]
  )
}

export default function Privacy({ lang }) {
  const p = copy(lang).privacy
  const page = usePageMotion()
  const vars = {
    business: business.name,
    responsible: business.legalName || business.name,
    email: business.email,
    address: business.address,
  }

  return (
    <m.div {...page}>
      <SiteHeader lang={lang} solid />

      <main id="contenido" className="page-main">
        <article className="page-wrap legal">
          <div className="sect-head page-in">
            <span className="kicker">
              <span className="rule" />
              {p.label}
            </span>
          </div>
          <h1 className="legal-title page-in">{p.title}</h1>
          <p className="legal-updated page-in">{p.updated}</p>
          <p className="legal-intro">{fill(p.intro, vars)}</p>

          {p.sections.map((s) => (
            <section key={s.heading} className="legal-sec">
              <h2>{s.heading}</h2>
              {s.paragraphs.map((para, i) => {
                if (para === '{address}') {
                  return business.address ? <p key={i}>{fill(p.addressLine, vars)}</p> : null
                }
                return <p key={i}>{withEmailLink(fill(para, vars))}</p>
              })}
            </section>
          ))}
        </article>
      </main>

      <SiteFooter lang={lang} />
    </m.div>
  )
}
