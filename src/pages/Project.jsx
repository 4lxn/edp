import { lazy, useState } from 'react'
import { Link } from 'react-router-dom'
import { ALBUMS, ALBUM_ORDER } from '../albums.generated'
import { placeName } from '../seo'
import { useLang } from '../hooks'
import { titleOf } from '../routes'
import Picture from '../components/Picture'
import Lightbox from '../Lightbox'
import { CtaBand, PressLine, Arrow } from '../components/Blocks'
import Anatomy from '../components/Anatomy'

const SCENES = { pergola: lazy(() => import('../components/PergolaScene')) }

const CURATED_MAX = 12

/**
 * Lays the curated photos out in the editorial rhythm A / B / C:
 *   A  one landscape, full width, 16:9
 *   B  two portraits side by side, 4:5
 *   C  one landscape on 8 columns, 3:2, caption beside it
 *   D  two landscapes side by side, 3:2 (used when a C would have no caption)
 * falling back gracefully when an orientation runs out.
 */
function rhythm(indexes, images, lang) {
  const captioned = (i) => !!images[i].caption[lang]
  const L = indexes.filter((i) => images[i].w >= images[i].h)
  const P = indexes.filter((i) => images[i].w < images[i].h)
  const rows = []
  for (let step = 0; L.length || P.length; step++) {
    const want = 'ABC'[step % 3]
    if (want === 'A' && L.length) rows.push({ kind: 'A', items: [L.shift()] })
    // an uncaptioned C would leave 4 empty columns: pair two photos instead
    else if (want === 'C' && L.length && !captioned(L[0]) && P.length >= 2) rows.push({ kind: 'B', items: [P.shift(), P.shift()] })
    else if (want === 'C' && L.length >= 2 && !captioned(L[0])) rows.push({ kind: 'D', items: [L.shift(), L.shift()] })
    else if (want === 'B' && P.length >= 2) rows.push({ kind: 'B', items: [P.shift(), P.shift()] })
    // C keeps 4 columns free for its caption; without one the photo takes the full width
    else if (L.length) rows.push({ kind: captioned(L[0]) ? 'C' : 'A', items: [L.shift()] })
    else if (P.length >= 2) rows.push({ kind: 'B', items: [P.shift(), P.shift()] })
    else rows.push({ kind: 'S', items: [P.shift()] })
  }
  return rows
}

const ROW = {
  A: { ratio: 16 / 9, sizes: '(min-width: 1440px) 1264px, (min-width: 900px) 90vw, 66vw' },
  B: { ratio: 4 / 5, sizes: '(min-width: 900px) 44vw, 33vw' },
  C: { ratio: 3 / 2, sizes: '(min-width: 900px) 60vw, 66vw' },
  D: { ratio: 3 / 2, sizes: '(min-width: 900px) 44vw, 66vw' },
  S: { ratio: 4 / 5, sizes: '(min-width: 900px) 38vw, 66vw' },
}

export default function Project({ slug }) {
  const { t, lang, to, projectTo } = useLang()
  const p = t.project
  const a = ALBUMS[slug]
  const title = titleOf(a, lang)
  const [lb, setLb] = useState(null)
  const place = placeName(a.location[lang])
  const alt = (i) => a.images[i].caption[lang] || p.photoAlt(title, place, i + 1)

  const hero = a.images[a.hero]
  const curated = (a.sequence.length
    ? a.sequence
    : a.images.map((_, i) => i).filter((i) => i !== a.hero).slice(0, CURATED_MAX)
  ).filter((i) => i !== a.hero)
  const rows = rhythm(curated, a.images, lang)

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
        <Picture img={hero} alt={alt(a.hero)} eager sizes="(min-width: 700px) 100vw, 82vw" className="p-hero-pic" />
      </button>

      {/* With only a row or two of facts the ficha sits inline under the title
          instead of as a lone table beside it. */}
      <header className={'wrap p-head' + (ficha.length <= 2 ? ' p-head-short' : '')}>
        <div>
          {a.type[lang] && <p className="label">{a.type[lang]}</p>}
          <h1 className="h1 h1-page">{title}</h1>
        </div>
        {ficha.length > 0 && (
          <dl className={ficha.length <= 2 ? 'ficha-inline' : 'ficha'}>
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

      {a.experience && SCENES[a.experience] && (() => {
        // Each step's photo fades in over the last part of that step; the hero closes the sequence.
        const copy = t[a.experience]
        const img = (f) => a.images.find((im) => im.src.endsWith('/' + f))
        const photos = copy.steps.map((s, i) => s.photo && img(s.photo) && { img: img(s.photo), a: i + 0.55, b: i + 1.3 }).filter(Boolean)
        photos.push({ img: hero, a: copy.steps.length + 0.35, b: 99 })
        return (
          <Anatomy id="exp" copy={copy} Scene={SCENES[a.experience]} photos={photos}
            poster={<Picture img={hero} cap={false} className="anat-poster" sizes="(min-width: 900px) 60vw, 100vw" />} />
        )
      })()}

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
          <div className="p-process-row" style={{ '--n': Math.min(a.process.length, 4) }}>
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
            <span className="h2 next-title">{titleOf(next, lang)} <Arrow /></span>
            <Picture img={next.images[next.hero]} ratio={16 / 9} sizes="(min-width: 1440px) 1264px, (min-width: 900px) 90vw, 66vw"
              alt={p.photoAlt(titleOf(next, lang), placeName(next.location[lang]), 1)} />
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
