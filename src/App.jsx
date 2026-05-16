import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { COPY } from './copy'

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

/* ---------- Hooks ---------- */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]')
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in')
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    )
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  })
}

function useScrollY() {
  const [y, setY] = useState(0)
  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        setY(window.scrollY)
        raf = 0
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return y
}

/* ---------- Monograms ---------- */
function Monogram({ kind = 'trussed', size = 28, color = 'currentColor' }) {
  if (kind === 'trussed') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke={color} strokeWidth="1.2">
        <path d="M4 34 L20 6 L36 34 Z" />
        <path d="M20 6 L20 34" />
        <path d="M12 20 L28 20" />
        <path d="M16 27 L24 27" />
      </svg>
    )
  }
  if (kind === 'diamond') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke={color} strokeWidth="1.2">
        <path d="M20 4 L36 20 L20 36 L4 20 Z" />
        <path d="M20 4 L20 36" />
        <path d="M4 20 L36 20" />
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke={color} strokeWidth="1.2">
      <rect x="4" y="4" width="32" height="32" />
      <path d="M14 28 L14 12 L20 12" />
      <path d="M14 20 L19 20" />
      <path d="M22 28 L22 12 L28 12 L28 18 L22 18" />
    </svg>
  )
}

/* ---------- Header ---------- */
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

function scrollTo(id) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth' })
}

function Header({ t, monogram }) {
  const condensed = useScrolledPast(80)
  const navItems = [
    { label: t.nav[0], target: 'sec-0' },
    { label: t.nav[2], target: 'statement' },
    { label: t.nav[3], target: 'contacto' },
  ]
  return (
    <header className={'site-header ' + (condensed ? 'is-condensed' : '')}>
      <div className="hdr-inner">
        <button className="brand" onClick={() => scrollTo('top')} type="button">
          <Monogram kind={monogram} size={condensed ? 24 : 30} />
          <span className="brand-words">
            <span className="brand-name">Estructuras del Pacífico</span>
            <span className="brand-mark">EST · MCMXCVIII</span>
          </span>
        </button>
        <nav className="hdr-nav">
          {navItems.map((item) => (
            <button key={item.target} type="button" onClick={() => scrollTo(item.target)}>
              <span>{item.label}</span>
            </button>
          ))}
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

  return (
    <section className={'hero hero-' + treatment} id="top">
      <div className="hero-media">
        <div
          className="hero-img"
          style={{
            backgroundImage: `url(${B}assets/portada-palapa-mar.jpeg)`,
            transform: `translate3d(0, ${bgShift}px, 0) scale(${1 + y * 0.0002})`,
          }}
        />
        <div className="hero-veil" style={{ opacity: 0.32 + overlayOpacity }} />
      </div>

      <div className="hero-grid">
        <div className="hero-eyebrow">
          <span className="rule" />
          <span>{t.heroEyebrow}</span>
        </div>

        <div className="hero-title-wrap">
          <h1 className="hero-title">
            <span className="line line-1">{t.heroTitle[0]}</span>
            <span className="line line-2">{t.heroTitle[1]}</span>
          </h1>
        </div>

        <div className="hero-foot">
          <p className="hero-sub">{t.heroSub}</p>
          <div className="hero-meta">
            <span>N 17°38&prime; · W 101°33&prime;</span>
            <span>·</span>
            <span>EST. 1998</span>
          </div>
        </div>

        <button className="hero-scroll" type="button" onClick={() => scrollTo('statement')}>
          <span className="scroll-line" />
          <span>{t.heroScroll}</span>
        </button>

        <div className="hero-spec">
          <div><em>I</em><span></span></div>
          <div><em>II</em><span>Punta Garrobo · Zihuatanejo</span></div>
          <div><em>III</em><span></span></div>
        </div>
      </div>

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

/* ---------- Gallery ---------- */
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
        <p className="gallery-lede" data-reveal>
          Cuatro obras seleccionadas de un portafolio de ciento ochenta y cuatro.
          Cada una construida en sitio, sin clavos vistos.
        </p>
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
                <span className="g-stats">
                  <em>{g.area}</em>
                  {g.height !== '—' && <em>· {g.height}</em>}
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

/* ---------- Material swatches ---------- */
function SwatchTimber() {
  return (
    <svg viewBox="0 0 200 280" preserveAspectRatio="none" className="sw">
      <defs>
        <linearGradient id="tmb" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8a6f50" />
          <stop offset="0.5" stopColor="#b39b78" />
          <stop offset="1" stopColor="#705839" />
        </linearGradient>
      </defs>
      <rect width="200" height="280" fill="url(#tmb)" />
      {Array.from({ length: 24 }).map((_, i) => (
        <line key={i} x1={i * 9 + Math.sin(i) * 2} y1="0"
              x2={i * 9 + Math.cos(i) * 4} y2="280"
              stroke="rgba(44,44,44,0.18)" strokeWidth={0.6 + i % 3 * 0.4} />
      ))}
    </svg>
  )
}

function SwatchThatch() {
  return (
    <svg viewBox="0 0 200 280" preserveAspectRatio="none" className="sw">
      <rect width="200" height="280" fill="#c9b48d" />
      {Array.from({ length: 60 }).map((_, i) => (
        <line key={i} x1={-50 + i * 8} y1="0" x2={-50 + i * 8 + 80} y2="280"
              stroke="rgba(80,60,30,0.25)" strokeWidth="0.8" />
      ))}
      {Array.from({ length: 40 }).map((_, i) => (
        <line key={'b' + i} x1={i * 6} y1="0" x2={i * 6 - 40} y2="280"
              stroke="rgba(255,245,220,0.18)" strokeWidth="0.5" />
      ))}
    </svg>
  )
}

function SwatchConcrete() {
  return (
    <svg viewBox="0 0 200 280" preserveAspectRatio="none" className="sw">
      <rect width="200" height="280" fill="#bcb9b2" />
      <rect width="200" height="140" fill="#a8a59d" />
      <line x1="0" y1="140" x2="200" y2="140" stroke="rgba(44,44,44,0.35)" strokeWidth="0.6" />
      {Array.from({ length: 220 }).map((_, i) => {
        const x = i * 53 % 200
        const y = i * 89 % 280
        return <circle key={i} cx={x} cy={y} r={0.6 + i % 3 * 0.3} fill="rgba(44,44,44,0.12)" />
      })}
    </svg>
  )
}

/* ---------- Materials ---------- */
function Materials({ t }) {
  return (
    <section className="materials" id="sec-1">
      <div className="materials-cap">
        <div className="sect-head" data-reveal>
          <span className="kicker">
            <span className="rule" />
            {t.materialsLabel}
            <span className="kicker-num">IV</span>
          </span>
        </div>
        <h2 className="display" data-reveal>
          <span>{t.materialsTitle[0]}</span>
          <em>{t.materialsTitle[1]}</em>
        </h2>
        <p className="materials-intro" data-reveal>{t.materialsIntro}</p>
      </div>

      <div className="materials-grid">
        {t.materials.map((m, i) => (
          <article className="mat" key={m.n} data-reveal style={{ transitionDelay: `${i * 100}ms` }}>
            <div className="mat-num">{m.n}</div>
            <div className="mat-swatch">
              {m.n === 'I' && <SwatchTimber />}
              {m.n === 'II' && <SwatchThatch />}
              {m.n === 'III' && <SwatchConcrete />}
            </div>
            <div className="mat-body">
              <h3 className="mat-name">{m.name}</h3>
              <p className="mat-latin">{m.latin}</p>
              <div className="mat-rule" />
              <p className="mat-text">{m.body}</p>
            </div>
          </article>
        ))}
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

/* ---------- Process ---------- */
function Process({ t }) {
  return (
    <section className="process">
      <div className="sect-head" data-reveal>
        <span className="kicker">
          <span className="rule" />
          {t.processLabel}
          <span className="kicker-num">V</span>
        </span>
      </div>
      <h2 className="display" data-reveal>
        <span>{t.processTitle[0]}</span>
        <em>{t.processTitle[1]}</em>
      </h2>
      <ol className="process-list">
        {t.process.map((p, i) => (
          <li className="proc" key={p.n} data-reveal style={{ transitionDelay: `${i * 90}ms` }}>
            <div className="proc-num">{p.n}</div>
            <div className="proc-body">
              <h3>{p.t}</h3>
              <p>{p.d}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

/* ---------- Stats ribbon ---------- */
function Stats({ t }) {
  return (
    <section className="stats">
      <div className="stats-label" data-reveal>
        <span className="rule" />
        {t.statsLabel}
      </div>
      <ul className="stats-row">
        {t.stats.map((s, i) => (
          <li key={s.n} data-reveal style={{ transitionDelay: `${i * 80}ms` }}>
            <span className="stat-n">{s.n}</span>
            <span className="stat-l">{s.l}</span>
          </li>
        ))}
      </ul>
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
          <span className="kicker-num">VI</span>
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
          <a className="btn btn-solid" href="mailto:estudio@estructurasdelpacifico.mx">
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
            <div className="ft-mark">EST · MCMXCVIII</div>
          </div>
        </div>
        <div className="footer-cols">
          {t.footerNav.map(([h, items]) => (
            <div className="footer-col" key={h}>
              <h4>{h}</h4>
              <ul>{items.map((x) => <li key={x}><a href={`#${h.toLowerCase()}-${x.toLowerCase()}`}>{x}</a></li>)}</ul>
            </div>
          ))}
        </div>
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
  useReveal()

  useEffect(() => {
    const r = document.documentElement
    r.style.setProperty('--accent-mix', String(tw.accentIntensity / 100))
    r.dataset.density = tw.density
    r.dataset.grain = String(tw.showGrain)
  }, [tw.accentIntensity, tw.density, tw.showGrain])

  return (
    <>
      <Header t={t} monogram={tw.monogram} />

      <main>
        <Hero t={t} treatment={tw.heroTreatment} />
        <Statement t={t} />
        <Gallery t={t} />
        <ImageBreak
          src={`${B}assets/infinity-pool.jpeg`}
          caption={tw.language === 'es'
            ? 'Mirador con palapa monumental — Costa Pacífica, MX'
            : 'Lookout with monumental palapa — Pacific Coast, MX'}
          num="—"
        />
        <Materials t={t} />
        <Process t={t} />
        <ImageBreak
          src={`${B}assets/deck-ocean.jpeg`}
          caption={tw.language === 'es'
            ? 'Deck de parota — entrega 2024'
            : 'Parota timber deck — delivered 2024'}
          num="—"
        />
        <Stats t={t} />
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
    </>
  )
}
