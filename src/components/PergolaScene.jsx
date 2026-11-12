/**
 * PergolaScene.jsx — lazy chunk (three + R3F + drei). Never imported by SSR.
 *
 * The parking pergola at Punta Garrobo, built from its construction drawing
 * (metres): steel posts and beams 8"×4", 13 timber joists 0.08 × 0.20 at
 * 0.53 m, palm rib on top. Pieces drop in as the sticky section is scrolled;
 * the camera ends on the front elevation and the page cross-fades to the real
 * photo (Anatomy.jsx reads --p from onProgress).
 *
 * Scroll handling mirrors AnatomyScene: passive, rAF-coalesced listener that
 * only lives while the section intersects, frameloop="demand".
 * ponytail: Rig is a trimmed copy of AnatomyScene's; extract a shared hook if a third scene appears.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

// ---------- Plan numbers (m) ----------
const W = 6.45               // along the steel beams (x)
const D = 6.00               // joist length (z)
const ZB = [1.45, -2.46]     // beam axes: 1.55 front cantilever, 3.91 between, 0.55 rear
const PX = 2.9               // post x (posts sit just inside the roof edge)
const STEEL = [0.10, 0.20]   // 8"×4" heavy section
const POST_TOP = 2.40
const BEAM_TOP = 2.60
const TOP = 2.80             // top of joists
const JOIST = [0.08, 0.20]
const N_JOIST = 13
const JS = 0.53              // joist centres

const STEPS = 5
const ASSEMBLE = 0.8         // share of scroll for assembly; the rest frames the photo

const C = {
  bg: '#2C2C2C', bronze: '#B39B78', paper: '#F4F3F0',
  concrete: '#8f8b83', brick: '#a0644a', steel: '#5a3424', wood: '#8a5636', palm: '#c9b083',
}

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const V = (x, y, z) => new THREE.Vector3(x, y, z)
const box = (cx, cy, cz, sx, sy, sz, color) => ({ pos: V(cx, cy, cz), scale: V(sx, sy, sz), color })

function buildStructure() {
  const s = Array.from({ length: STEPS }, () => [])
  const posts = ZB.flatMap((z) => [[-PX, z], [PX, z]])
  // 1 Concrete pier below grade + brick collar around the post base (Detalle 1)
  posts.forEach(([x, z]) => {
    s[0].push(box(x, -0.25, z, 0.4, 0.5, 0.4, C.concrete))
    s[0].push(box(x, 0.3, z, 0.4, 0.6, 0.4, C.brick))
  })
  // 2 Steel posts
  posts.forEach(([x, z]) => s[1].push(box(x, POST_TOP / 2, z, STEEL[1], POST_TOP, STEEL[0], C.steel)))
  // 3 Steel beams along x
  ZB.forEach((z) => s[2].push(box(0, (POST_TOP + BEAM_TOP) / 2, z, W, STEEL[1], STEEL[0], C.steel)))
  // 4 Timber joists along z
  const x0 = -((N_JOIST - 1) * JS) / 2
  for (let i = 0; i < N_JOIST; i++) s[3].push(box(x0 + i * JS, (BEAM_TOP + TOP) / 2, 0, JOIST[0], JOIST[1], D, C.wood))
  return s
}

/** Palm rib: thin sticks across the joists, as one striped texture. */
function ribTexture() {
  const c = document.createElement('canvas')
  c.width = 16; c.height = 512
  const g = c.getContext('2d')
  let seed = 11
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  g.fillStyle = '#8f7550' // opaque: alpha gaps vanish under mipmapping at this scale
  g.fillRect(0, 0, 16, 512)
  for (let y = 0; y < 512; y += 4 + rnd() * 3) {
    g.fillStyle = ['#cdb486', '#bba06f', '#d8c299', '#b39563'][(rnd() * 4) | 0]
    g.fillRect(0, y, 16, 1.6 + rnd() * 1.4)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(1, 3)
  return t
}

const DIMS = [
  { text: '6.45 m', from: V(-W / 2, 0.02, D / 2 + 0.9), to: V(W / 2, 0.02, D / 2 + 0.9), step: 0, keep: true },
  { text: '6.00 m', from: V(W / 2 + 0.9, 0.02, -D / 2), to: V(W / 2 + 0.9, 0.02, D / 2), step: 0, keep: true },
  { text: '2.40 m', from: V(PX + 0.45, 0, ZB[0]), to: V(PX + 0.45, POST_TOP, ZB[0]), step: 1, keep: true },
  { text: '0.53 m', from: V(0, TOP + 0.35, D / 2), to: V(JS, TOP + 0.35, D / 2), step: 3 },
  { text: '1.55 m', from: V(-W / 2 - 0.4, BEAM_TOP, ZB[0]), to: V(-W / 2 - 0.4, BEAM_TOP, D / 2), step: 3 },
  { text: '2.80 m', from: V(-W / 2 - 0.6, 0, -D / 2), to: V(-W / 2 - 0.6, TOP, -D / 2), step: 4, keep: true },
]

const TAG_AT = [V(PX, 0.7, ZB[0]), V(PX, 1.6, ZB[0]), V(0, BEAM_TOP + 0.1, ZB[0]), V(-1.5, TOP + 0.1, 2.4), V(1.2, TOP + 0.3, -1)]

function dimLine(a, b, tick = 0.15) {
  const d = b.clone().sub(a).normalize()
  const t = (Math.abs(d.y) > 0.9 ? V(1, 0, 0) : V(0, 1, 0)).multiplyScalar(tick)
  return [a, b, a.clone().sub(t), a.clone().add(t), b.clone().sub(t), b.clone().add(t)]
}

// ---------- Scene ----------
function Rig({ section, still, onStep, onReady, onProgress, setStepUI }) {
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
    // Continuous step position: step i spans [i, i+1); past assembly it keeps growing to STEPS + 1.
    const sp = p < ASSEMBLE ? (p / ASSEMBLE) * STEPS : STEPS + (p - ASSEMBLE) / (1 - ASSEMBLE)
    onProgress?.(sp)

    const step = p >= ASSEMBLE - 1e-3 ? STEPS : Math.floor(sp)
    if (step !== lastStep.current) { lastStep.current = step; onStep(step); setStepUI(step) }

    // Three-quarter orbit while building, then swing to the front elevation of the photo.
    const q = clamp(p / ASSEMBLE)
    const f = clamp((p - ASSEMBLE * 0.9) / (1 - ASSEMBLE * 0.9))
    const e = f * f * (3 - 2 * f)
    const az = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(38 - 18 * q, 0, e))
    const el = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(32 - 14 * q, 4, e))
    const ty = THREE.MathUtils.lerp(0.9 + 0.7 * q, 1.5, e)
    const vf = THREE.MathUtils.degToRad(camera.fov / 2)
    const hf = Math.atan(Math.tan(vf) * (size.width / size.height))
    const dist = ((size.width < size.height ? 6.2 : 5.4) / Math.sin(Math.min(vf, hf))) * (1 - 0.08 * e)
    camera.position.set(Math.sin(az) * Math.cos(el) * dist, ty + Math.sin(el) * dist, Math.cos(az) * Math.cos(el) * dist)
    camera.lookAt(0, ty, 0)
    if (!readyFired.current) { readyFired.current = true; requestAnimationFrame(() => onReady()) }
  })
  return null
}

const unitBox = new THREE.BoxGeometry(1, 1, 1)
const unitEdges = new THREE.EdgesGeometry(unitBox)

function Structure() {
  const steps = useMemo(buildStructure, [])
  const refs = useRef([])
  const ghostRefs = useRef([])
  const mats = useMemo(() => {
    const m = {}
    Object.values(C).forEach((c) => { m[c] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }) })
    return m
  }, [])
  const line = useMemo(() => new THREE.LineBasicMaterial({ color: '#1e1a16', transparent: true, opacity: 0.5 }), [])
  // Bronze wireframe of every step that is not built yet: the drawing before the build.
  const ghosts = useMemo(() => steps.map((list) => {
    const arr = [], pos = unitEdges.attributes.position, m = new THREE.Matrix4(), v = new THREE.Vector3(), q = new THREE.Quaternion()
    list.forEach((p) => {
      m.compose(p.pos, q, p.scale)
      for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(m); arr.push(v.x, v.y, v.z) }
    })
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3))
    return g
  }), [steps])
  const ghostMat = useMemo(() => new THREE.LineBasicMaterial({ color: C.bronze, transparent: true, opacity: 0.42 }), [])

  useFrame((state) => {
    const sp = (clamp(state.scene.userData.progress ?? 0) / ASSEMBLE) * STEPS
    steps.forEach((list, s) => {
      let all = true
      list.forEach((p, j) => {
        const g = refs.current[s]?.[j]
        if (!g) return
        const r = clamp((sp - (s + (j / list.length) * 0.55)) / 0.45)
        const e = 1 - Math.pow(1 - r, 3)
        g.visible = r > 0
        g.position.set(p.pos.x, p.pos.y + (1 - e) * 1.2, p.pos.z)
        if (e < 1) all = false
      })
      if (ghostRefs.current[s]) ghostRefs.current[s].visible = !all
    })
  })

  return (
    <group>
      {ghosts.map((g, s) => <lineSegments key={'g' + s} ref={(el) => (ghostRefs.current[s] = el)} geometry={g} material={ghostMat} />)}
      {steps.map((list, s) => list.map((p, j) => (
        <group key={s + '-' + j} ref={(el) => { (refs.current[s] ||= [])[j] = el }}>
          <group scale={p.scale}>
            <mesh geometry={unitBox} material={mats[p.color]} />
            <lineSegments geometry={unitEdges} material={line} />
          </group>
        </group>
      )))}
    </group>
  )
}

/** Palm rib rolls out from the back to the front across the joists. */
function PalmRib() {
  const ref = useRef()
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: ribTexture(), side: THREE.DoubleSide, roughness: 0.95 }), [])
  useFrame((state) => {
    const sp = (clamp(state.scene.userData.progress ?? 0) / ASSEMBLE) * STEPS
    const r = clamp((sp - 4) / 0.9)
    const m = ref.current
    if (!m) return
    m.visible = r > 0
    m.scale.set(W + 0.1, Math.max(r, 0.001) * D, 1)
    m.position.set(0, TOP + 0.02, -D / 2 + (r * D) / 2)
    mat.map.repeat.set(1, 3 * Math.max(r, 0.001))
  })
  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2} material={mat}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  )
}

function Dims({ step }) {
  const geo = useMemo(() => DIMS.map((d) => new THREE.BufferGeometry().setFromPoints(dimLine(d.from, d.to))), [])
  const mat = useMemo(() => new THREE.LineBasicMaterial({ color: C.paper, transparent: true, opacity: 0.6 }), [])
  if (step >= STEPS) return null
  return DIMS.map((d, i) => {
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

function Tag({ step, steps }) {
  if (step < 0 || step >= STEPS) return null
  const s = steps[step]
  return (
    <Html key={step} position={TAG_AT[step]} zIndexRange={[3, 0]} style={{ pointerEvents: 'none' }}>
      <span className="anat-tag"><b>{String(step + 1).padStart(2, '0')}</b> {s.name}{s.tag && <i>{s.tag}</i>}</span>
    </Html>
  )
}

export default function PergolaScene({ section, steps, onStep, onReady, onProgress }) {
  const [step, setStep] = useState(-1)
  const still = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  return (
    <Canvas
      className="anat-canvas"
      frameloop="demand"
      dpr={[1, 1.5]}
      flat
      camera={{ fov: 32, near: 0.3, far: 100, position: [10, 8, 14] }}
      gl={{ antialias: true, powerPreference: 'low-power' }}
      style={{ touchAction: 'pan-y', cursor: 'default' }}
      aria-hidden="true"
    >
      <color attach="background" args={[C.bg]} />
      <hemisphereLight args={['#fff1dc', '#3b3129', 1.25]} />
      <directionalLight position={[6, 12, 9]} intensity={1.7} color="#ffe9c9" />
      <directionalLight position={[-8, 5, -9]} intensity={0.35} color="#c9d3e0" />
      <gridHelper args={[14, 28, C.bronze, C.bronze]} position={[0, 0.001, 0]} material-transparent material-opacity={0.16} />
      <Structure />
      <PalmRib />
      <Dims step={step} />
      <Tag step={step} steps={steps} />
      <Rig section={section} still={still} onStep={onStep} onReady={onReady} onProgress={onProgress} setStepUI={setStep} />
    </Canvas>
  )
}
