/**
 * AnatomyScene.jsx — lazy chunk (three + R3F + drei). Never imported by SSR.
 *
 * A hip roof built procedurally from the "Vestíbulo acceso" plan numbers
 * (metres). Pieces drop into place as the section's sticky stage is scrolled;
 * when assembled, OrbitControls take over (drag only, no wheel zoom).
 *
 * Scroll: the one scroll listener on the site lives here. It is passive,
 * rAF-coalesced, attached only while the section intersects the viewport, and
 * only marks the canvas dirty (frameloop="demand"). Nothing renders when idle.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

// ---------- Plan numbers (m) ----------
const HX = 7.80 / 2          // half plan, x
const HZ = 7.50 / 2          // half plan, z
const H = 4.20               // post line / top of perimeter beam
const APEX = 6.98            // apex from ground
const RISE = APEX - H        // 2.78
const OV = 1.00              // eave overhang (horizontal)
const SP = 0.735             // rafter spacing
const BEAM = [0.15, 0.20]    // VIGA 8x6 → 15 wide × 20 deep
const KP = 0.15              // 6x6
const POST = 0.20            // approximated (not dimensioned on the plan)
const RAF = [0.10, 0.15]     // polín, approximated
const HIP = [0.15, 0.20]     // limatesa, approximated as 8x6
const TIE_Y = 5.47           // ≈ where the roof is 4.02 wide

const STEPS = 7
const ASSEMBLE = 0.86        // share of the scroll used for assembly; the rest is "complete"

const C = {
  bg: '#2C2C2C', bronze: '#B39B78', paper: '#F4F3F0',
  concrete: '#8f8b83', post: '#8a5a37', beam: '#7a4f30', hip: '#93623c',
  rafter: '#a7774b', apex: '#6f4529', palm: '#c2a774',
}

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const V = (x, y, z) => new THREE.Vector3(x, y, z)
const UP = V(0, 1, 0)

/** A rectangular member between two centreline points. `under` lifts it so its underside sits on a–b. */
function member(a, b, [w, d], { under = false, up = UP } = {}) {
  const dir = b.clone().sub(a)
  const len = dir.length()
  const m = new THREE.Matrix4().lookAt(b, a, Math.abs(dir.clone().normalize().dot(up)) > 0.99 ? V(0, 0, 1) : up)
  const q = new THREE.Quaternion().setFromRotationMatrix(m)
  const pos = a.clone().add(b).multiplyScalar(0.5)
  if (under) pos.add(V(0, 1, 0).applyQuaternion(q).multiplyScalar(d / 2))
  return { pos, quat: q, scale: V(w, d, len) }
}

const box = (cx, cy, cz, sx, sy, sz) => ({ pos: V(cx, cy, cz), quat: new THREE.Quaternion(), scale: V(sx, sy, sz) })

/** Underside height of the roof plane at plan point (x, z) on the face that owns it. */
const roofY = (x, z) => {
  const fx = Math.abs(x) / HX, fz = Math.abs(z) / HZ
  return APEX - RISE * Math.max(fx, fz)
}

function buildStructure() {
  const steps = Array.from({ length: STEPS }, () => [])
  const corners = [[1, 1], [-1, 1], [-1, -1], [1, -1]]

  // 1 Footings: pad below grade + pedestal (sizes approximated)
  corners.forEach(([sx, sz]) => {
    steps[0].push({ ...box(sx * HX, -0.125, sz * HZ, 0.9, 0.25, 0.9), color: C.concrete })
    steps[0].push({ ...box(sx * HX, 0.075, sz * HZ, 0.36, 0.15, 0.36), color: C.concrete })
  })
  // 2 Posts
  const postTop = H - BEAM[1]
  corners.forEach(([sx, sz]) => steps[1].push({ ...box(sx * HX, (0.15 + postTop) / 2, sz * HZ, POST, postTop - 0.15, POST), color: C.post }))
  // 3 Perimeter beams 8x6
  const by = H - BEAM[1] / 2
  ;[1, -1].forEach((s) => {
    steps[2].push({ ...box(0, by, s * HZ, 2 * HX + 0.3, BEAM[1], BEAM[0]), color: C.beam })
    steps[2].push({ ...box(s * HX, by, 0, BEAM[0], BEAM[1], 2 * HZ + 0.3), color: C.beam })
  })
  // 4 Hip rafters: apex → corner, extended over the eave
  const EXT = 1 + OV / HZ * 0.98
  corners.forEach(([sx, sz]) => {
    const a = V(0, APEX, 0)
    const b = V(sx * HX * EXT, APEX - RISE * EXT, sz * HZ * EXT)
    steps[3].push({ ...member(a, b, HIP, { under: true }), color: C.hip })
  })
  // 5 Rafters (polines) at SP, perpendicular to each eave, from the hip to the eave end
  const faces = [
    { axis: 'x', s: 1, h: HX, w: HZ }, { axis: 'z', s: 1, h: HZ, w: HX },
    { axis: 'x', s: -1, h: HX, w: HZ }, { axis: 'z', s: -1, h: HZ, w: HX },
  ]
  faces.forEach(({ axis, s, h, w }) => {
    for (let k = -6; k <= 6; k++) {
      const lat = k * SP
      const start = (h * Math.abs(lat)) / w // the hip in plan
      const end = h + OV
      if (end - start < 0.35) continue
      const yA = APEX - RISE * (start / h), yB = APEX - RISE * (end / h)
      const a = axis === 'x' ? V(s * start, yA, lat) : V(lat, yA, s * start)
      const b = axis === 'x' ? V(s * end, yB, lat) : V(lat, yB, s * end)
      steps[4].push({ ...member(a, b, RAF, { under: true }), color: C.rafter })
    }
  })
  // 6 Apex structure 6x6: king post, crossed ties (~4.02), four struts to the hips
  steps[5].push({ ...box(0, 6.25, 0, KP, 2.0, KP), color: C.apex })
  const hx = HX * (1 - (TIE_Y + KP / 2 - H) / RISE) // half-span where the tie meets the x faces
  const hz = HZ * (1 - (TIE_Y + KP / 2 - H) / RISE)
  steps[5].push({ ...box(0, TIE_Y, 0, 2 * hx, KP, KP), color: C.apex })
  steps[5].push({ ...box(0, TIE_Y, 0, KP, KP, 2 * hz), color: C.apex })
  corners.forEach(([sx, sz]) => {
    const f = 0.24
    const b = V(sx * HX * f, APEX - RISE * f - 0.1, sz * HZ * f)
    steps[5].push({ ...member(V(0, 5.62, 0), b, [KP * 0.8, KP * 0.8]), color: C.apex })
  })
  return steps
}

// ---------- Thatch: layered alpha cards, never leaf by leaf ----------
function thatchTexture() {
  const W = 256, Hh = 128
  const c = document.createElement('canvas')
  c.width = W; c.height = Hh
  const g = c.getContext('2d')
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  const tones = ['#c9ae7b', '#b99c68', '#d4bc8c', '#a98d5d', '#bfa371']
  for (let i = 0; i < 520; i++) {
    const x = rnd() * W
    const len = Hh * (0.72 + rnd() * 0.28)
    g.strokeStyle = tones[(rnd() * tones.length) | 0]
    g.lineWidth = 1 + rnd() * 2.2
    g.beginPath()
    g.moveTo(x, 0)
    g.lineTo(x + (rnd() - 0.5) * 10, len)
    g.stroke()
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = THREE.RepeatWrapping
  t.wrapT = THREE.ClampToEdgeWrapping
  t.anisotropy = 4
  return t
}

/** One course: a trapezoid strip on face triangle (A, C1, C2) between t0 (top) and t1 (bottom). */
function courseGeometry(A, C1, C2, t0, t1, liftTop, liftBot, seg = 10) {
  const mid = C1.clone().add(C2).multiplyScalar(0.5)
  const half = C2.clone().sub(C1).multiplyScalar(0.5)
  const n = C1.clone().sub(A).cross(C2.clone().sub(A)).normalize()
  if (n.y < 0) n.negate()
  const P = (t, s, lift) => A.clone().add(mid.clone().sub(A).multiplyScalar(t)).add(half.clone().multiplyScalar(s * t)).add(n.clone().multiplyScalar(lift))
  const pos = [], uv = [], idx = []
  const hw = half.length()
  for (let i = 0; i <= seg; i++) {
    const s = -1 + (2 * i) / seg
    const top = P(t0, s, liftTop), bot = P(t1, s, liftBot)
    pos.push(top.x, top.y, top.z, bot.x, bot.y, bot.z)
    uv.push((s * t0 * hw) / 1.3, 1, (s * t1 * hw) / 1.3, 0)
    if (i < seg) { const b = i * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2) }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  return { geo, n }
}

function buildThatch() {
  const N = 7, T0 = 0.12, band = (1 - T0) / N
  const E = 1 + (OV + 0.25) / HZ
  const lift = 0.3
  const A = V(0, APEX + lift, 0)
  const corner = (sx, sz) => V(sx * HX * E, APEX - RISE * E + lift, sz * HZ * E)
  // [C1, C2, near?] — the two faces toward the final camera are cut away above the eave courses.
  const faces = [
    [corner(1, -1), corner(1, 1), true], [corner(1, 1), corner(-1, 1), true],
    [corner(-1, 1), corner(-1, -1), false], [corner(-1, -1), corner(1, -1), false],
  ]
  const out = []
  for (let k = N - 1; k >= 0; k--) { // eave course first, as it is laid
    faces.forEach(([C1, C2, near]) => {
      const t1 = T0 + (k + 1) * band
      if (near && t1 < 0.87) return
      const t0 = Math.max(0.02, t1 - band * 1.7)
      const stack = (N - k) * 0.025
      const { geo, n } = courseGeometry(A, C1, C2, t0, t1, stack, stack + 0.16)
      out.push({ geo, n })
    })
  }
  // ridge cap
  faces.forEach(([C1, C2]) => {
    const { geo, n } = courseGeometry(V(0, APEX + lift + 0.28, 0), C1, C2, 0.0, 0.17, 0.0, 0.05)
    out.push({ geo, n })
  })
  return out
}

/** Hip caps: a palm ridge over each hip except the cut-away near one. */
function buildHipCaps() {
  const E = 1 + (OV + 0.25) / HZ
  const top = (f, sx, sz) => V(sx * HX * E * f, APEX + 0.42 - RISE * E * f, sz * HZ * E * f)
  return [[1, -1], [-1, -1], [-1, 1]].map(([sx, sz]) => member(top(0.02, sx, sz), top(1, sx, sz), [0.42, 0.12]))
}

// ---------- Dimensions (blueprint) ----------
function dimLine(a, b, tick = 0.18) {
  const d = b.clone().sub(a).normalize()
  const p = Math.abs(d.y) > 0.9 ? V(1, 0, 0) : V(0, 1, 0)
  const t = p.multiplyScalar(tick)
  const pts = [a, b, a.clone().sub(t), a.clone().add(t), b.clone().sub(t), b.clone().add(t)]
  return pts
}

const DIMS = [
  { text: '7.80 m', from: V(-HX, 0.02, HZ + 1.7), to: V(HX, 0.02, HZ + 1.7), step: 0, keep: true },
  { text: '7.50 m', from: V(HX + 1.7, 0.02, -HZ), to: V(HX + 1.7, 0.02, HZ), step: 0, keep: true },
  { text: '4.20 m', from: V(HX + 0.7, 0, HZ + 0.7), to: V(HX + 0.7, H, HZ + 0.7), step: 1, keep: true },
  { text: '6.98 m', from: V(0, 0, 0), to: V(0, APEX, 0), step: 3, keep: true },
  { text: '1.00 m', from: V(HX, H - 1.05, 0.3), to: V(HX + OV, H - 1.05, 0.3), step: 4 },
  { text: '0.735 m', from: V(HX + OV + 0.15, H - RISE * (OV / HX) - 0.25, 0), to: V(HX + OV + 0.15, H - RISE * (OV / HX) - 0.25, SP), step: 4 },
  { text: '4.02 m', from: V(-2.01, TIE_Y - 0.4, 0), to: V(2.01, TIE_Y - 0.4, 0), step: 5 },
]

const TAG_AT = [
  V(HX, 0.1, HZ), V(HX, 2.4, HZ), V(0, H + 0.1, HZ), V(HX * 0.55, APEX - RISE * 0.55 + 0.25, HZ * 0.55),
  V(HX + 0.5, H - 0.1, -1.6), V(0, 6.6, 0), V(-HX * 0.45, APEX - RISE * 0.45 + 0.6, -HZ * 0.1),
]

// ---------- Scene ----------
function Rig({ section, still, onStep, onReady, setStepUI }) {
  const { camera, invalidate, size, controls } = useThree()
  const target = useRef(still ? 1 : 0)
  const cur = useRef(still ? 1 : 0)
  const lastStep = useRef(-2)
  const look = useRef(V(0, 2, 0))
  const readyFired = useRef(false)
  const handed = useRef(false)

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

    const step = p >= ASSEMBLE - 1e-3 ? STEPS : Math.floor((p / ASSEMBLE) * STEPS)
    if (step !== lastStep.current) { lastStep.current = step; onStep(step); setStepUI(step) }

    // Hand the camera to OrbitControls only once the scripted pose has settled.
    const orbit = step === STEPS && !!controls
    if (!orbit) handed.current = false
    if (controls) controls.enabled = handed.current
    if (!handed.current) {
      const q = clamp(p / ASSEMBLE)
      const az = THREE.MathUtils.degToRad(22 + 26 * q)
      const el = THREE.MathUtils.degToRad(30 - 16 * q)
      const ty = 1.6 + 2.3 * q
      const vf = THREE.MathUtils.degToRad(camera.fov / 2)
      const hf = Math.atan(Math.tan(vf) * (size.width / size.height))
      const aspect = size.width / size.height
      const dist = ((aspect < 1 ? 8.3 : 7.4) / Math.sin(Math.min(vf, hf))) * (0.98 - 0.05 * q)
      const want = V(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(dist).add(V(0, ty, 0))
      const lw = V(0, ty, 0)
      const gap = camera.position.distanceTo(want)
      if (gap > 0.01) { camera.position.lerp(want, readyFired.current ? k : 1); invalidate() }
      look.current.lerp(lw, readyFired.current ? k : 1)
      camera.lookAt(look.current)
      if (controls) controls.target.copy(look.current)
      if (orbit && gap < 0.05) { handed.current = true; invalidate() }
    }
    if (!readyFired.current) { readyFired.current = true; requestAnimationFrame(() => onReady()) }
  })
  return null
}

const unitBox = new THREE.BoxGeometry(1, 1, 1)
const unitEdges = new THREE.EdgesGeometry(unitBox)

function Structure() {
  const steps = useMemo(buildStructure, [])
  const solidRefs = useRef([])
  const ghostRefs = useRef([])
  const mats = useMemo(() => {
    const m = {}
    Object.values(C).forEach((c) => { m[c] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.82, metalness: 0, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }) })
    return m
  }, [])
  const line = useMemo(() => new THREE.LineBasicMaterial({ color: '#1e1a16', transparent: true, opacity: 0.55 }), [])
  // One merged ghost (bronze wireframe) per step: the plan before it is built.
  const ghosts = useMemo(() => steps.map((list) => {
    const arr = []
    const pos = unitEdges.attributes.position
    const m = new THREE.Matrix4(), v = new THREE.Vector3()
    list.forEach((p) => {
      m.compose(p.pos, p.quat, p.scale)
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
        const g = solidRefs.current[s]?.[j]
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
        <group key={s + '-' + j} ref={(el) => { (solidRefs.current[s] ||= [])[j] = el }} quaternion={p.quat}>
          <group scale={p.scale}>
            <mesh geometry={unitBox} material={mats[p.color]} />
            <lineSegments geometry={unitEdges} material={line} />
          </group>
        </group>
      )))}
    </group>
  )
}

function Thatch() {
  const courses = useMemo(buildThatch, [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    map: thatchTexture(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.95, color: '#e9dcc2',
  }), [])
  const caps = useMemo(buildHipCaps, [])
  const capMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#a8895a', roughness: 0.95 }), [])
  const refs = useRef([])
  const capRefs = useRef([])
  useFrame((state) => {
    const sp = (clamp(state.scene.userData.progress ?? 0) / ASSEMBLE) * STEPS
    courses.forEach((c, j) => {
      const m = refs.current[j]
      if (!m) return
      const r = clamp((sp - (6 + (j / courses.length) * 0.5)) / 0.4)
      const e = 1 - Math.pow(1 - r, 3)
      m.visible = r > 0
      m.position.copy(c.n).multiplyScalar((1 - e) * 1.2)
    })
    caps.forEach((c, j) => {
      const m = capRefs.current[j]
      if (!m) return
      const r = clamp((sp - 6.85) / 0.15)
      m.visible = r > 0
      m.position.set(c.pos.x, c.pos.y + (1 - r) * 0.6, c.pos.z)
    })
  })
  return (
    <>
      {courses.map((c, j) => (
        <mesh key={j} ref={(el) => (refs.current[j] = el)} geometry={c.geo} material={mat} />
      ))}
      {caps.map((c, j) => (
        <mesh key={'c' + j} ref={(el) => (capRefs.current[j] = el)} geometry={unitBox} material={capMat} quaternion={c.quat} scale={c.scale} />
      ))}
    </>
  )
}

function Dims({ step }) {
  const geo = useMemo(() => DIMS.map((d) => new THREE.BufferGeometry().setFromPoints(dimLine(d.from, d.to))), [])
  const mat = useMemo(() => new THREE.LineBasicMaterial({ color: C.paper, transparent: true, opacity: 0.6 }), [])
  return DIMS.map((d, i) => {
    const on = step >= d.step && (d.keep || step === d.step)
    if (!on) return null
    const mid = d.from.clone().add(d.to).multiplyScalar(0.5)
    return (
      <group key={d.text}>
        <lineSegments geometry={geo[i]} material={mat} />
        <Html position={mid} center zIndexRange={[2, 0]} style={{ pointerEvents: 'none' }}>
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
      <span className="anat-tag">
        <b>{String(step + 1).padStart(2, '0')}</b> {s.name}
        {s.tag && <i>{s.tag}</i>}
      </span>
    </Html>
  )
}

export default function AnatomyScene({ section, steps, onStep, onReady }) {
  const [step, setStep] = useState(-1)
  const still = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  return (
    <Canvas
      className="anat-canvas"
      frameloop="demand"
      dpr={[1, 1.5]}
      flat
      camera={{ fov: 32, near: 0.5, far: 120, position: [12, 10, 20] }}
      gl={{ antialias: true, powerPreference: 'low-power', preserveDrawingBuffer: false }}
      aria-hidden="true"
    >
      <color attach="background" args={[C.bg]} />
      <hemisphereLight args={['#fff1dc', '#3b3129', 1.25]} />
      <directionalLight position={[9, 15, 7]} intensity={1.7} color="#ffe9c9" />
      <directionalLight position={[-8, 6, -10]} intensity={0.35} color="#c9d3e0" />
      <gridHelper args={[18, 36, C.bronze, C.bronze]} position={[0, 0.001, 0]} material-transparent material-opacity={0.16} />
      <Structure />
      <Thatch />
      <Dims step={step} />
      <Tag step={step} steps={steps} />
      <OrbitControls makeDefault enableZoom={false} enablePan={false} enableDamping dampingFactor={0.08}
        minPolarAngle={0.75} maxPolarAngle={1.62} rotateSpeed={0.6} />
      <TouchPanY />
      <Rig section={section} still={still} onStep={onStep} onReady={onReady} setStepUI={setStep} />
    </Canvas>
  )
}

/** OrbitControls sets touch-action:none; keep vertical swipes scrolling the page on phones. */
function TouchPanY() {
  const { gl, controls } = useThree()
  useEffect(() => { gl.domElement.style.touchAction = 'pan-y' }, [gl, controls])
  return null
}
