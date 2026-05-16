import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { PROJECT_ALBUMS } from './copy'

function useScrollY() {
  const [y, setY] = useState(0)
  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => { setY(window.scrollY); raf = 0 })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return y
}

function useScrolledPast(threshold) {
  const [past, setPast] = useState(false)
  useEffect(() => {
    const onScroll = () => setPast(window.scrollY > threshold)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])
  return past
}

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]')
    const io = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target) }
      }),
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    )
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  })
}

export default function Album() {
  const { slug } = useParams()
  const y = useScrollY()
  const condensed = useScrolledPast(80)
  const project = PROJECT_ALBUMS[slug]
  useReveal()

  if (!project) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
        <p style={{ fontFamily: 'var(--display)', letterSpacing: '0.2em', textTransform: 'uppercase', fontSize: 12 }}>
          Proyecto no encontrado
        </p>
        <Link to="/" className="btn btn-ghost">← Volver</Link>
      </div>
    )
  }

  const bgShift = Math.min(y * 0.3, 180)

  return (
    <>
      {/* Header */}
      <header className={'site-header ' + (condensed ? 'is-condensed' : '')}>
        <div className="hdr-inner">
          <Link className="brand" to="/">
            <svg width={condensed ? 24 : 30} height={condensed ? 24 : 30} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M4 34 L20 6 L36 34 Z" />
              <path d="M20 6 L20 34" />
              <path d="M12 20 L28 20" />
              <path d="M16 27 L24 27" />
            </svg>
            <span className="brand-words">
              <span className="brand-name">Estructuras del Pacífico</span>
              <span className="brand-mark">EST · MCMXCVIII</span>
            </span>
          </Link>
          <nav className="hdr-nav">
            <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span className="num">←</span>
              <span>Portafolio</span>
            </Link>
          </nav>
          <Link className="btn btn-ghost" to="/#contacto">
            Cotizar Proyecto
            <span className="btn-arrow">→</span>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="hero hero-fullbleed" style={{ minHeight: '72vh' }}>
        <div className="hero-media">
          <div
            className="hero-img"
            style={{
              backgroundImage: `url(${project.hero})`,
              transform: `translate3d(0, ${bgShift}px, 0)`,
            }}
          />
          <div className="hero-veil" style={{ opacity: 0.45 }} />
        </div>

        <div className="hero-grid" style={{ paddingTop: 160 }}>
          <div className="hero-eyebrow">
            <span className="rule" />
            <span>{project.meta}</span>
          </div>
          <div className="hero-title-wrap">
            <h1 className="hero-title">
              <span className="line line-1">{project.title}</span>
              <span className="line line-2">{project.type}</span>
            </h1>
          </div>
        </div>

        <div className="hero-corners">
          <span className="c c-tl" /><span className="c c-tr" />
          <span className="c c-bl" /><span className="c c-br" />
        </div>
      </section>

      {/* Album grid */}
      <main style={{ padding: 'clamp(80px, 12vh, 160px) var(--grid-pad)' }}>
        <div style={{ maxWidth: 1480, margin: '0 auto' }}>
          <div className="sect-head" data-reveal style={{ marginBottom: 48 }}>
            <span className="kicker">
              <span className="rule" />
              Álbum del proyecto
              <span className="kicker-num">{String(Object.keys(PROJECT_ALBUMS).indexOf(slug) + 1).padStart(2, '0')}</span>
            </span>
          </div>

          {project.images.length === 1 ? (
            /* Single image — full width with "more coming soon" */
            <>
              <div data-reveal style={{
                position: 'relative', overflow: 'hidden',
                border: '1px solid var(--hair)',
                aspectRatio: '16/9',
                maxHeight: 680,
              }}>
                <img src={project.images[0].src} alt={project.images[0].caption}
                     style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
              <p style={{
                marginTop: 32,
                fontFamily: 'var(--display)',
                fontSize: 12,
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                color: 'var(--bronze-deep)',
              }}>
                Álbum en preparación: más fotografías próximamente
              </p>
            </>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(400px, 100%), 1fr))',
              gap: 'var(--col-gap)',
            }}>
              {project.images.map((img, i) => (
                <figure key={img.src} data-reveal style={{
                  margin: 0,
                  display: 'flex', flexDirection: 'column', gap: 12,
                  transitionDelay: `${i * 60}ms`,
                  ...(i === 0 ? { gridColumn: 'span 2' } : {}),
                }}>
                  <div style={{
                    position: 'relative', overflow: 'hidden',
                    border: '1px solid var(--hair)',
                    aspectRatio: i === 0 ? '16/9' : '4/3',
                  }}>
                    <img src={img.src} alt={img.caption}
                         style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                                  transition: 'transform 900ms cubic-bezier(.2,.7,.2,1)' }}
                         onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
                         onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} />
                  </div>
                  <figcaption style={{
                    fontFamily: 'var(--display)',
                    fontSize: 12,
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: 'var(--ink-soft)',
                  }}>
                    {img.caption}
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </div>

        {/* Other projects */}
        <div style={{ maxWidth: 1480, margin: '96px auto 0', borderTop: '1px solid var(--hair)', paddingTop: 48 }}>
          <div className="sect-head" data-reveal style={{ marginBottom: 40 }}>
            <span className="kicker">
              <span className="rule" />
              Otros proyectos
            </span>
          </div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {Object.entries(PROJECT_ALBUMS).reduce((acc, [s, p], i) => {
              if (s === slug) return acc
              const idx = acc.length
              acc.push(
                <Link key={s} to={`/album/${s}`} data-reveal
                      style={{
                        flex: '1 1 240px', display: 'flex', flexDirection: 'column', gap: 12,
                        transitionDelay: `${idx * 60}ms`,
                      }}>
                  <div style={{ position: 'relative', overflow: 'hidden', border: '1px solid var(--hair)', aspectRatio: '4/3' }}>
                    <img src={p.hero} alt={p.title}
                         style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                                  transition: 'transform 900ms cubic-bezier(.2,.7,.2,1)' }}
                         onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                         onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} />
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--display)', fontSize: 12, letterSpacing: '0.22em',
                                  textTransform: 'uppercase', color: 'var(--bronze-deep)' }}>
                      {p.type}
                    </div>
                    <div style={{ fontFamily: 'var(--display)', fontWeight: 300,
                                  fontSize: 'clamp(18px, 1.6vw, 24px)', marginTop: 4 }}>
                      {p.title}
                    </div>
                  </div>
                </Link>
              )
              return acc
            }, [])}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-rule" style={{ marginTop: 0 }} />
        <div className="footer-bottom" style={{ maxWidth: 1480, margin: '0 auto', padding: '32px 0' }}>
          <p>Estructuras del Pacífico · Taller de arquitectura tropical en madera · Sayulita, Nayarit · MX</p>
          <ul style={{ listStyle: 'none', display: 'flex', gap: 24 }}>
            <li>© MMXXVI</li>
            <li>Aviso de privacidad</li>
          </ul>
        </div>
      </footer>
    </>
  )
}
