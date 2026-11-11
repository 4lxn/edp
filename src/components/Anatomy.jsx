import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useLang } from '../hooks'

// The WebGL scene (three + R3F + drei) is its own chunk, fetched only when the
// section nears the viewport. Prerender, no-JS and no-WebGL get the poster.
const Scene = lazy(() => import('./AnatomyScene'))

function webgl() {
  try {
    const c = document.createElement('canvas')
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')))
  } catch { return false }
}

/**
 * "Anatomía de una cubierta": a hip roof that assembles as the section is
 * scrolled (sticky stage), then orbits by drag. Generic structure, not a project.
 */
export default function Anatomy() {
  const { t } = useLang()
  const a = t.anatomy
  const ref = useRef(null)
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
  return (
    <section ref={ref} className={'anat dark' + (gl ? ' is-3d' : '') + (ready ? ' is-live' : '')} aria-labelledby="anat-title">
      <div className="anat-stick">
        <div className="wrap anat-in">
          <div className="anat-text">
            <p className="label">{a.label}</p>
            <h2 className="h2" id="anat-title">{a.title}</h2>
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
          <div className={'anat-stage' + (ready ? ' is-live' : '')} aria-hidden="true">
            <picture className="anat-poster">
              <source type="image/avif" srcSet="/assets/anatomy-poster.avif" />
              <img src="/assets/anatomy-poster.jpg" width="1200" height="1000" alt="" loading="lazy" decoding="async" />
            </picture>
            {load && (
              <Suspense fallback={null}>
                <Scene section={ref} steps={a.steps} onStep={setStep} onReady={() => setReady(true)} />
              </Suspense>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
