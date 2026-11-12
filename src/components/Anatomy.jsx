import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useLang } from '../hooks'
import Picture from './Picture'

// The WebGL scene (three + R3F + drei) is its own chunk, fetched only when the
// section nears the viewport. Prerender, no-JS and no-WebGL get the poster.
const PalapaScene = lazy(() => import('./AnatomyScene'))

function webgl() {
  try {
    const c = document.createElement('canvas')
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')))
  } catch { return false }
}

const PALAPA_POSTER = (
  <picture className="anat-poster">
    <source type="image/avif" srcSet="/assets/anatomy-poster.avif" />
    <img src="/assets/anatomy-poster.jpg" width="1200" height="1000" alt="" loading="lazy" decoding="async" />
  </picture>
)

/**
 * Scroll-assembled 3D structure in a sticky stage.
 * Default: "Anatomía de una cubierta" (landing), a generic hip roof.
 * Project pages pass their own `copy`, `Scene`, `poster` and `photos`:
 * photos are real shots that cross-fade over the model while the scene's
 * step position `--p` (step i spans i..i+1, set via onProgress) sits inside [a, b].
 */
export default function Anatomy({ copy, Scene = PalapaScene, poster = PALAPA_POSTER, photos = [], id = 'anat' }) {
  const { t } = useLang()
  const a = copy || t.anatomy
  const ref = useRef(null)
  const stage = useRef(null)
  const [load, setLoad] = useState(false)
  const [ready, setReady] = useState(false)
  const [step, setStep] = useState(-1)
  const [gl, setGl] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || !('IntersectionObserver' in window) || !webgl()) return
    setGl(true)
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setLoad(true); io.disconnect() }
    }, { rootMargin: '100% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const done = step >= a.steps.length
  const onProgress = photos.length ? (p) => stage.current?.style.setProperty('--p', p.toFixed(4)) : undefined
  return (
    <section ref={ref} className={'anat dark' + (gl ? ' is-3d' : '') + (ready ? ' is-live' : '')} aria-labelledby={id + '-title'}>
      <div className="anat-stick">
        <div className="wrap anat-in">
          <div className="anat-text">
            <p className="label">{a.label}</p>
            <h2 className="h2" id={id + '-title'}>{a.title}</h2>
            <p className="anat-body">{a.body}</p>
            <ol className="anat-steps">
              {a.steps.map((s, i) => (
                <li key={s.name} className={i === step ? 'is-on' : i < step ? 'is-done' : undefined}>
                  <span className="step-n" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                  <span className="anat-name">{s.name}</span>
                  <span className="anat-spec">{s.spec}</span>
                </li>
              ))}
            </ol>
            <p className="meta anat-cap">{done && ready ? a.hint : a.caption}</p>
          </div>
          <div ref={stage} className={'anat-stage' + (ready ? ' is-live' : '')} aria-hidden="true">
            {poster}
            {load && (
              <Suspense fallback={null}>
                <Scene section={ref} steps={a.steps} onStep={setStep} onReady={() => setReady(true)} onProgress={onProgress} />
              </Suspense>
            )}
            {ready && photos.map((ph) => (
              <div key={ph.img.src} className="anat-photo" style={{ '--a': ph.a, '--b': ph.b }}>
                <Picture img={ph.img} cap={false} sizes="(min-width: 900px) 60vw, 100vw" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
