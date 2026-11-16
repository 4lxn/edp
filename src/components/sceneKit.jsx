/**
 * sceneKit.jsx — shared pieces of the scroll-built project scenes (PergolaScene,
 * AbanicoScene). Lives only inside their lazy chunks.
 *
 * Rig: passive, rAF-coalesced scroll listener that only lives while the section
 * intersects; frameloop="demand". Writes progress (0..1) to scene.userData and
 * reports the continuous step position to onProgress (Anatomy.jsx reads --p).
 */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
export const V = (x, y, z) => new THREE.Vector3(x, y, z)

/** Build progress in steps (0..steps) from the scene's scroll progress. */
export const stepPos = (state, steps, assemble) => (clamp(state.scene.userData.progress ?? 0) / assemble) * steps

/**
 * view: camera path. While building, azimuth/elevation/target height go from
 * [x, x + dx] over the assembly; then they ease to `end` (the photo's angle).
 * reach: half-size of the subject (m) for portrait / landscape viewports.
 */
export function Rig({ section, still, steps, assemble, view, onStep, onReady, onProgress, setStepUI }) {
  const { camera, invalidate, size } = useThree()
  const target = useRef(still ? 1 : 0)
  const cur = useRef(still ? 1 : 0)
  const lastStep = useRef(-2)
  const readyFired = useRef(false)

  useEffect(() => {
    if (still) { invalidate(); return }
    const el = section.current
    let raf = 0, on = false
    const read = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const total = r.height - window.innerHeight
      target.current = total > 1 ? clamp(-r.top / total) : 1
      invalidate()
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(read) }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !on) {
        on = true
        window.addEventListener('scroll', onScroll, { passive: true })
        window.addEventListener('resize', onScroll)
      } else if (!e.isIntersecting && on) {
        on = false
        window.removeEventListener('scroll', onScroll)
        window.removeEventListener('resize', onScroll)
      }
      read()
    })
    io.observe(el)
    read()
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [section, still, invalidate])

  useFrame((state, dt) => {
    const k = 1 - Math.exp(-Math.min(dt, 0.1) * 7)
    cur.current += (target.current - cur.current) * k
    if (Math.abs(target.current - cur.current) < 1e-4) cur.current = target.current
    else invalidate()
    const p = cur.current
    state.scene.userData.progress = p
    // Continuous step position: step i spans [i, i+1); past assembly it keeps growing to steps + 1.
    const sp = p < assemble ? (p / assemble) * steps : steps + (p - assemble) / (1 - assemble)
    onProgress?.(sp)

    const step = p >= assemble - 1e-3 ? steps : Math.floor(sp)
    if (step !== lastStep.current) { lastStep.current = step; onStep(step); setStepUI(step) }

    const q = clamp(p / assemble)
    const f = clamp((p - assemble * 0.9) / (1 - assemble * 0.9))
    const e = f * f * (3 - 2 * f)
    const L = THREE.MathUtils.lerp
    const az = THREE.MathUtils.degToRad(L(view.az[0] + view.az[1] * q, view.end.az, e))
    const el = THREE.MathUtils.degToRad(L(view.el[0] + view.el[1] * q, view.end.el, e))
    const ty = L(view.ty[0] + view.ty[1] * q, view.end.ty, e)
    const vf = THREE.MathUtils.degToRad(camera.fov / 2)
    const hf = Math.atan(Math.tan(vf) * (size.width / size.height))
    const dist = ((size.width < size.height ? view.reach[0] : view.reach[1]) / Math.sin(Math.min(vf, hf))) * (1 - 0.08 * e)
    camera.position.set(Math.sin(az) * Math.cos(el) * dist, ty + Math.sin(el) * dist, Math.cos(az) * Math.cos(el) * dist)
    camera.lookAt(0, ty, 0)
    if (!readyFired.current) { readyFired.current = true; requestAnimationFrame(() => onReady()) }
  })
  return null
}

function dimLine(a, b, tick = 0.15) {
  const d = b.clone().sub(a).normalize()
  const t = (Math.abs(d.y) > 0.9 ? V(1, 0, 0) : V(0, 1, 0)).multiplyScalar(tick)
  return [a, b, a.clone().sub(t), a.clone().add(t), b.clone().sub(t), b.clone().add(t)]
}

/** Dimension lines: each shows from its step on (only on that step unless `keep`). */
export function Dims({ step, steps, dims, color }) {
  const geo = useMemo(() => dims.map((d) => new THREE.BufferGeometry().setFromPoints(dimLine(d.from, d.to))), [dims])
  const mat = useMemo(() => new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.6 }), [color])
  if (step >= steps) return null
  return dims.map((d, i) => {
    if (!(step >= d.step && (d.keep || step === d.step))) return null
    return (
      <group key={d.text}>
        <lineSegments geometry={geo[i]} material={mat} />
        <Html position={d.from.clone().add(d.to).multiplyScalar(0.5)} center zIndexRange={[2, 0]} style={{ pointerEvents: 'none' }}>
          <span className="anat-dim">{d.text}</span>
        </Html>
      </group>
    )
  })
}

/** Label of the step being built, pinned to its piece. */
export function Tag({ step, steps, at }) {
  if (step < 0 || step >= steps.length) return null
  const s = steps[step]
  return (
    <Html key={step} position={at[step]} zIndexRange={[3, 0]} style={{ pointerEvents: 'none' }}>
      <span className="anat-tag"><b>{String(step + 1).padStart(2, '0')}</b> {s.name}{s.tag && <i>{s.tag}</i>}</span>
    </Html>
  )
}
