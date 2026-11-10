import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ALBUMS, ALBUM_ORDER } from '../albums.generated'
import { placeName } from '../seo'
import { useLang } from '../hooks'
import Picture from '../components/Picture'
import Lightbox from '../Lightbox'
import { CtaBand, PressLine, Arrow } from '../components/Blocks'

const CURATED_MAX = 12

/**
 * Lays the curated photos out in the editorial rhythm A / B / C:
 *   A  one landscape, full width, 16:9
 *   B  two portraits side by side, 4:5
 *   C  one landscape on 8 columns, 3:2, caption beside it
 * falling back gracefully when an orientation runs out.
 */
function rhythm(indexes, images) {
  const L = indexes.filter((i) => images[i].w >= images[i].h)
  const P = indexes.filter((i) => images[i].w < images[i].h)
  const rows = []
  for (let step = 0; L.length || P.length; step++) {
    const want = 'ABC'[step % 3]
    if (want === 'A' && L.length) rows.push({ kind: 'A', items: [L.shift()] })
    else if (want === 'B' && P.length >= 2) rows.push({ kind: 'B', items: [P.shift(), P.shift()] })
    else if (L.length) rows.push({ kind: 'C', items: [L.shift()] })
    else if (P.length >= 2) rows.push({ kind: 'B', items: [P.shift(), P.shift()] })
    else rows.push({ kind: 'S', items: [P.shift()] })
  }
  return rows
}

const ROW = {
  A: { ratio: 16 / 9, sizes: '(min-width: 1440px) 1264px, 90vw' },
  B: { ratio: 4 / 5, sizes: '(min-width: 900px) 44vw, 90vw' },
  C: { ratio: 3 / 2, sizes: '(min-width: 900px) 60vw, 90vw' },
  S: { ratio: 4 / 5, sizes: '(min-width: 900px) 38vw, 90vw' },
}

export default function Project({ slug }) {
  const { t, lang, to, projectTo } = useLang()
  const p = t.project
  const a = ALBUMS[slug]
  const [lb, setLb] = useState(null)
  const place = placeName(a.location[lang])
  const alt = (i) => a.images[i].caption[lang] || p.photoAlt(a.title, place, i + 1)

  const hero = a.images[a.hero]
  const curated = (a.sequence.length
    ? a.sequence
    : a.images.map((_, i) => i).filter((i) => i !== a.hero).slice(0, CURATED_MAX)
  ).filter((i) => i !== a.hero)
  const rows = rhythm(curated, a.images)

  const ficha = [
    [p.ficha.location, place],
    [p.ficha.year, a.year],
    [p.ficha.type, a.type[lang]],
    [p.ficha.client, a.client && a.client[lang]],
    [p.ficha.architect, a.architect && a.architect[lang]],
    [p.ficha.dimensions, a.dimensions && a.dimensions[lang]],
    [p.ficha.materials, a.materials && a.materials[lang]],
    [p.ficha.duration, a.duration && a.duration[lang]],
    [p.ficha.scope, a.scope && a.scope[lang]],
  ].filter(([, v]) => v)

  const next = ALBUMS[ALBUM_ORDER[(ALBUM_ORDER.indexOf(slug) + 1) % ALBUM_ORDER.length]]
  const quoteTo = `${to('quote')}?obra=${slug}`

  const shot = (i, kind) => (
    <button type="button" className="shot" onClick={() => setLb(i)} aria-label={`${p.open}: ${alt(i)}`}>
      <Picture img={a.images[i]} ratio={ROW[kind].ratio} sizes={ROW[kind].sizes} alt={alt(i)} />
    </button>
  )

  return (
    <article className="project">
      <button type="button" className="shot p-hero" onClick={() => setLb(a.hero)} aria-label={`${p.open}: ${alt(a.hero)}`}>
        <Picture img={hero} alt={alt(a.hero)} eager sizes="100vw" className="p-hero-pic" />
      </button>

      <header className="wrap p-head">
        <div>
          {a.type[lang] && <p className="label">{a.type[lang]}</p>}
          <h1 className="h1 h1-page">{a.title}</h1>
        </div>
        {ficha.length > 0 && (
          <dl className="ficha">
            {ficha.map(([k, v]) => (
              <div key={k}><dt className="label">{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>
        )}
      </header>

      <PressLine slug={slug} />

      {a.story && (
        <div className="wrap p-story" data-reveal>
          {a.story[lang].map((par) => <p key={par}>{par}</p>)}
        </div>
      )}

      {rows.length > 0 && (
        <div className="wrap seq">
          {rows.map((row) => (
            <div key={row.items.join('-')} className={'seq-row seq-' + row.kind} data-reveal>
              {row.items.map((i) => (
                <figure key={i}>
                  {shot(i, row.kind)}
                  {a.images[i].caption[lang] && <figcaption className="meta">{a.images[i].caption[lang]}</figcaption>}
                </figure>
              ))}
            </div>
          ))}
        </div>
      )}

      {a.images.length > curated.length + 1 && (
        <p className="wrap seq-more">
          <button type="button" className="link" onClick={() => setLb(0)}>{p.allPhotos(a.images.length)}</button>
        </p>
      )}

      {a.process.length > 0 && (
        <section className="wrap p-process">
          <h2 className="label">{p.process}</h2>
          <div className="p-process-row">
            {a.process.slice(0, 4).map((i) => (
              <figure key={i} data-reveal>{shot(i, 'B')}</figure>
            ))}
          </div>
        </section>
      )}

      <CtaBand title={p.ctaTitle} body={p.ctaBody} button={p.ctaButton} to={quoteTo} />

      {next && next.slug !== slug && (
        <Link className="next" to={projectTo(next.slug)}>
          <div className="wrap">
            <span className="label">{p.next}</span>
            <span className="h2 next-title">{next.title} <Arrow /></span>
            <Picture img={next.images[next.hero]} ratio={16 / 9} sizes="(min-width: 1440px) 1264px, 90vw"
              alt={p.photoAlt(next.title, placeName(next.location[lang]), 1)} />
          </div>
        </Link>
      )}

      <Lightbox
        images={a.images.map((im, i) => ({ src: im.src, w: im.w, h: im.h, caption: im.caption[lang], alt: alt(i) }))}
        index={lb} setIndex={setLb}
        labels={{ close: t.close, prev: p.prev, next: p.nextPhoto }}
      />
    </article>
  )
}
