import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { m, useReducedMotion } from 'framer-motion'
import { COPY } from './copy'
import { Monogram } from './Brand'
import { useScrollY, useReveal, useScrolledPast, usePageMotion } from './hooks'

const B = import.meta.env.BASE_URL
import {
  useTweaks, TweaksPanel, TweakSection,
  TweakSlider, TweakToggle, TweakRadio,
} from './TweaksPanel'

const TWEAK_DEFAULTS = {
  density: 'editorial',
  heroTreatment: 'fullbleed',
  monogram: 'trussed',
  accentIntensity: 100,
  showGrain: true,
  language: 'es',
}

/* ---------- Header ---------- */
function scrollTo(id) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth' })
}

function Header({ t, monogram }) {
  const condensed = useScrolledPast(80)
  return (
    <header className={'site-header ' + (condensed ? 'is-condensed' : '')}>
      <div className="hdr-inner">
        <button className="brand" onClick={() => scrollTo('top')} type="button">
          <Monogram kind={monogram} size={condensed ? 24 : 30} />
          <span className="brand-words">
            <span className="brand-name">Estructuras del Pacífico</span>
            <span className="brand-mark">Maestría en madera</span>
          </span>
        </button>
        <nav className="hdr-nav">
          <Link to="/proyectos"><span>{t.nav[0]}</span></Link>
          <button type="button" onClick={() => scrollTo('statement')}><span>{t.nav[1]}</span></button>
          <button type="button" onClick={() => scrollTo('contacto')}><span>{t.nav[2]}</span></button>
        </nav>
        <button className="btn btn-ghost" type="button" onClick={() => scrollTo('contacto')}>
          {t.cta}
          <span className="btn-arrow">→</span>
        </button>
      </div>
    </header>
  )
}

/* ---------- Hero ---------- */
function Hero({ t, treatment }) {
  const y = useScrollY()
  const bgShift = Math.min(y * 0.35, 240)
  const overlayOpacity = Math.min(y / 600, 0.25)
  const reduce = useReducedMotion()
  const ease = [0.2, 0.7, 0.2, 1]

  // Entrance choreography: media fade → eyebrow → title lines → foot → scroll → spec.
  const container = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.12, delayChildren: reduce ? 0 : 0.15 } },
  }
  const item = {
    hidden: reduce ? { opacity: 1 } : { opacity: 0, y: 28 },
    show: { opacity: 1, y: 0, transition: { duration: 0.9, ease } },
  }
  const titleWrap = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.14 } },
  }
  const lineV = {
    hidden: reduce ? { opacity: 1 } : { opacity: 0, y: 42 },
    show: { opacity: 1, y: 0, transition: { duration: 1, ease } },
  }
  const media = {
    hidden: reduce ? { opacity: 1 } : { opacity: 0 },
    show: { opacity: 1, transition: { duration: 1.4, ease: 'easeOut' } },
  }

  return (
    <section className={'hero hero-' + treatment} id="top">
      <m.div className="hero-media" variants={media} initial="hidden" animate="show">
        <div
          className="hero-img"
          style={{
            backgroundImage: `url(${B}assets/portada-palapa-mar.jpeg)`,
            transform: `translate3d(0, ${bgShift}px, 0) scale(${1 + y * 0.0002})`,
          }}
        />
        <div className="hero-veil" style={{ opacity: 0.32 + overlayOpacity }} />
      </m.div>

      <m.div className="hero-grid" variants={container} initial="hidden" animate="show">
        <m.div className="hero-eyebrow" variants={item}>
          <span className="rule" />
          <span>{t.heroEyebrow}</span>
        </m.div>

        <m.div className="hero-title-wrap" variants={titleWrap}>
          <h1 className="hero-title">
            <m.span className="line line-1" variants={lineV}>{t.heroTitle[0]}</m.span>
            <m.span className="line line-2" variants={lineV}>{t.heroTitle[1]}</m.span>
          </h1>
        </m.div>

        <m.div className="hero-foot" variants={item}>
          <p className="hero-sub">{t.heroSub}</p>
          <div className="hero-meta">
            <span>N 17°38&prime; · W 101°33&prime;</span>
            <span>·</span>
            <span>Punta Garrobo · Zihuatanejo</span>
          </div>
        </m.div>

        <m.button className="hero-scroll" type="button" variants={item} onClick={() => scrollTo('statement')}>
          <span className="scroll-line" />
          <span>{t.heroScroll}</span>
        </m.button>

        <m.div className="hero-spec" variants={item}>
          <div><em>I</em><span></span></div>
          <div><em>II</em><span>Punta Garrobo · Zihuatanejo, Gro. · MX</span></div>
          <div><em>III</em><span></span></div>
        </m.div>
      </m.div>

      <div className="hero-corners">
        <span className="c c-tl" /><span className="c c-tr" />
        <span className="c c-bl" /><span className="c c-br" />
      </div>
    </section>
  )
}

/* ---------- Statement ---------- */
function Statement({ t }) {
  return (
    <section className="statement" id="statement">
      <div className="sect-head" data-reveal>
        <span className="kicker">
          <span className="rule" />
          {t.statementLabel}
          <span className="kicker-num">II</span>
        </span>
      </div>
      <div className="statement-body">
        <p className="statement-text" data-reveal>
          {t.statement.split(' ').map((w, i) => (
            <span key={`${w}-${i}`} className="word" style={{ transitionDelay: `${i * 14}ms` }}>
              {w + ' '}
            </span>
          ))}
        </p>
        <div className="statement-sig" data-reveal>{t.statementSig}</div>
      </div>
    </section>
  )
}

/* ---------- Gallery (featured) ---------- */
function Gallery({ t }) {
  const y = useScrollY()
  const sectionRef = useRef(null)
  const [sectTop, setSectTop] = useState(0)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const update = () => setSectTop(el.offsetTop)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const parallaxFor = (idx) => {
    const offset = (y - sectTop) * 0.06
    const sign = idx % 2 === 0 ? -1 : 1
    return sign * offset
  }

  return (
    <section className="gallery" id="sec-0" ref={sectionRef}>
      <header className="gallery-head">
        <div className="sect-head" data-reveal>
          <span className="kicker">
            <span className="rule" />
            {t.galleryLabel}
            <span className="kicker-num">III</span>
          </span>
        </div>
        <h2 className="display" data-reveal>
          <span>{t.galleryTitle[0]}</span>
          <em>{t.galleryTitle[1]}</em>
        </h2>
        <p className="gallery-lede" data-reveal>{t.galleryLede}</p>
      </header>

      <div className="gallery-grid">
        {t.galleryItems.map((g, i) => (
          <article
            key={g.n}
            className={'g-card g-card-' + (i + 1)}
            data-reveal
            style={{ transitionDelay: `${i * 80}ms` }}
          >
            <Link className="g-frame" to={`/album/${g.slug}`}>
              <div
                className="g-img"
                style={{
                  backgroundImage: `url(${g.img})`,
                  transform: `translate3d(0, ${parallaxFor(i)}px, 0)`,
                }}
              />
              <div className="g-overlay">
                <span className="g-view">Ver álbum <span className="arr">→</span></span>
              </div>
            </Link>
            <div className="g-meta">
              <div className="g-row">
                <span className="g-num">{g.n}</span>
                <span className="g-type">{g.type}</span>
              </div>
              <h3 className="g-title">{g.title}</h3>
              <div className="g-row g-foot">
                <span>{g.meta}</span>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="gallery-foot" data-reveal>
        <Link className="btn btn-ghost" to="/proyectos">
          {t.galleryAll}<span className="btn-arrow">→</span>
        </Link>
      </div>
    </section>
  )
}

/* ---------- Image break ---------- */
function ImageBreak({ src, caption, num }) {
  const y = useScrollY()
  const ref = useRef(null)
  const [top, setTop] = useState(0)
  useEffect(() => {
    if (!ref.current) return
    const u = () => setTop(ref.current.offsetTop)
    u()
    window.addEventListener('resize', u)
    return () => window.removeEventListener('resize', u)
  }, [])
  const shift = (y - top + 600) * 0.12
  return (
    <section className="break" ref={ref}>
      <div className="break-img" style={{
        backgroundImage: `url(${src})`,
        transform: `translate3d(0, ${shift}px, 0)`,
      }} />
      <div className="break-cap" data-reveal>
        <span className="break-num">{num}</span>
        <span className="break-rule" />
        <span>{caption}</span>
      </div>
    </section>
  )
}

/* ---------- Contact ---------- */
function Contact({ t, monogram }) {
  return (
    <section className="contact" id="contacto">
      <div className="sect-head" data-reveal>
        <span className="kicker">
          <span className="rule" />
          {t.contactLabel}
          <span className="kicker-num">IV</span>
        </span>
      </div>

      <div className="contact-grid">
        <h2 className="contact-title" data-reveal>
          {t.contactTitle.map((line, i) => (
            <span key={line} className="line" style={{ transitionDelay: `${i * 80}ms` }}>{line}</span>
          ))}
        </h2>

        <div className="contact-side" data-reveal>
          <p className="contact-body">{t.contactBody}</p>
          <a className="btn btn-solid" href={`mailto:${t.contactEmail}`}>
            {t.contactCta}<span className="btn-arrow">→</span>
          </a>
          <ul className="contact-meta">
            {t.contactMeta.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>

        <div className="contact-mark" data-reveal>
          <Monogram kind={monogram} size={120} color="#B39B78" />
        </div>
      </div>
    </section>
  )
}

/* ---------- Footer ---------- */
function Footer({ t, monogram }) {
  return (
    <footer className="footer">
      <div className="footer-top">
        <div className="footer-brand">
          <Monogram kind={monogram} size={56} color="#B39B78" />
          <div>
            <div className="ft-name">Estructuras del Pacífico</div>
            <div className="ft-mark">Maestría en madera</div>
          </div>
        </div>
        <nav className="footer-nav">
          <Link to="/proyectos">Proyectos</Link>
          <button type="button" onClick={() => scrollTo('statement')}>Filosofía</button>
          <button type="button" onClick={() => scrollTo('contacto')}>Contacto</button>
        </nav>
      </div>

      <div className="footer-rule" />

      <div className="footer-bottom">
        <p>{t.footerNote}</p>
        <ul>
          {t.footerLegal.map((l) => <li key={l}>{l}</li>)}
        </ul>
      </div>
    </footer>
  )
}

/* ---------- App ---------- */
export default function App() {
  const [tw, setTweak] = useTweaks(TWEAK_DEFAULTS)
  const t = COPY[tw.language] || COPY.es
  const page = usePageMotion()
  useReveal()

  useEffect(() => {
    const r = document.documentElement
    r.style.setProperty('--accent-mix', String(tw.accentIntensity / 100))
    r.dataset.density = tw.density
    r.dataset.grain = String(tw.showGrain)
  }, [tw.accentIntensity, tw.density, tw.showGrain])

  return (
    <m.div {...page}>
      <Header t={t} monogram={tw.monogram} />

      <main>
        <Hero t={t} treatment={tw.heroTreatment} />
        <Statement t={t} />
        <ImageBreak
          src={`${B}assets/infinity-pool.jpeg`}
          caption={tw.language === 'es'
            ? 'Mirador con palapa — Costa del Pacífico, MX'
            : 'Lookout with palapa — Pacific Coast, MX'}
          num="—"
        />
        <Gallery t={t} />
        <ImageBreak
          src={`${B}assets/deck-ocean.jpeg`}
          caption={tw.language === 'es'
            ? 'Deck de parota — Costa del Pacífico'
            : 'Parota timber deck — Pacific Coast'}
          num="—"
        />
        <Contact t={t} monogram={tw.monogram} />
      </main>

      <Footer t={t} monogram={tw.monogram} />

      <TweaksPanel title="Tweaks">
        <TweakSection title="Idioma / Language">
          <TweakRadio
            label="Idioma"
            value={tw.language}
            onChange={v => setTweak('language', v)}
            options={[
              { value: 'es', label: 'Español' },
              { value: 'en', label: 'English' },
            ]}
          />
        </TweakSection>

        <TweakSection title="Composición">
          <TweakRadio
            label="Densidad editorial"
            value={tw.density}
            onChange={v => setTweak('density', v)}
            options={[
              { value: 'spacious', label: 'Amplia' },
              { value: 'editorial', label: 'Editorial' },
              { value: 'dense', label: 'Densa' },
            ]}
          />
          <TweakRadio
            label="Hero"
            value={tw.heroTreatment}
            onChange={v => setTweak('heroTreatment', v)}
            options={[
              { value: 'fullbleed', label: 'Pantalla' },
              { value: 'framed', label: 'Enmarcado' },
              { value: 'split', label: 'Split' },
            ]}
          />
        </TweakSection>

        <TweakSection title="Marca">
          <TweakRadio
            label="Monograma"
            value={tw.monogram}
            onChange={v => setTweak('monogram', v)}
            options={[
              { value: 'trussed', label: 'Trabe' },
              { value: 'diamond', label: 'Diamante' },
              { value: 'edp', label: 'EDP' },
            ]}
          />
          <TweakSlider
            label="Intensidad de acento"
            value={tw.accentIntensity}
            min={40} max={140} step={5}
            onChange={v => setTweak('accentIntensity', v)}
            suffix="%"
          />
          <TweakToggle
            label="Grano sobre fotografías"
            value={tw.showGrain}
            onChange={v => setTweak('showGrain', v)}
          />
        </TweakSection>
      </TweaksPanel>
    </m.div>
  )
}
