/**
 * CasaArcoScene.jsx — lazy chunk (three + R3F + drei). Never imported by SSR.
 *
 * The palapa of Casa Arco, Punta Garrobo, from the architectural set A-01…A-06
 * (Zozaya Arquitectos): 11.90 × 7.90 m at the eave, ridge 7.20 m above the
 * floor. A hip roof at 46° up to +5.50 m, then a gablet (copete) at 60° with
 * vertical triangular ends. Read off section Y-Y1 and the roof plan.
 * Layers in build order; each shell is revealed by a moving clipping plane.
 */
import { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Rig, Dims, Tag, clamp, V, stepPos, courseTex, petateTex } from './sceneKit'

// ---------- Plan numbers (m, floor = 0) ----------
const A = 11.9 / 2, B = 7.9 / 2      // eave half-sizes (x along the ridge, z across)
const EAVE = 2.43                    // eave edge
const T1 = Math.tan(THREE.MathUtils.degToRad(46))
const KINK = 5.5                     // where the hip meets the gablet
const D = (KINK - EAVE) / T1         // horizontal inset of the hip at the kink (≈ 2.96)
const GA = A - D, GB = B - D         // gablet base half-sizes (≈ 2.99 × 0.99)
const T2 = Math.tan(THREE.MathUtils.degToRad(60))
const RIDGE = KINK + GB * T2         // ≈ 7.20
const COL = [4.85, 2.8]              // column line half-sizes (9.70 × 5.60)
const BEAM_Y = 3.0

const STEPS = 6
const ASSEMBLE = 0.82

const C = {
  bg: '#2C2C2C', bronze: '#B39B78', paper: '#F4F3F0',
  concrete: '#cfcac0', beam: '#2e2e30', steel: '#a4522e', ply: '#a77b52', membrane: '#8a3426', batten: '#cdb184',
}
const UP = V(0, 1, 0)

// ---------- Roof surface as bands ----------
// A point on the roof: lower hip faces are indexed by inset d (0 at the eave … D at the kink),
// the gablet's long faces by inset e (0 at the kink … GB at the ridge).
const hipY = (d) => EAVE + d * T1
const gabY = (e) => KINK + e * T2

/** Quads (as triangles) between insets [d0, d1] on all four hip faces, lifted by l0 (bottom) and l1 (top). */
function hipBand(d0, d1, l0, l1, out) {
  const y0 = hipY(d0) + l0, y1 = hipY(d1) + l1
  const faces = [
    // [corner a at d, corner b at d] for each face, as functions of inset d
    (d) => [V(-A + d, 0, B - d), V(A - d, 0, B - d)],
    (d) => [V(A - d, 0, -B + d), V(-A + d, 0, -B + d)],
    (d) => [V(A - d, 0, B - d), V(A - d, 0, -B + d)],
    (d) => [V(-A + d, 0, -B + d), V(-A + d, 0, B - d)],
  ]
  faces.forEach((f) => {
    const [a0, b0] = f(d0), [a1, b1] = f(d1)
    a0.y = b0.y = y0; a1.y = b1.y = y1
    out.push([a0, b0, b1, a1])
  })
}

/** Quads between insets [e0, e1] on the two long gablet faces. */
function gabBand(e0, e1, l0, l1, out) {
  const y0 = gabY(e0) + l0, y1 = gabY(e1) + l1
  ;[1, -1].forEach((s) => {
    const z0 = s * (GB - e0), z1 = s * (GB - e1)
    const q = [V(-GA, y0, z0), V(GA, y0, z0), V(GA, y1, z1), V(-GA, y1, z1)]
    out.push(s > 0 ? q : [q[1], q[0], q[3], q[2]])
  })
}

/** Quads → BufferGeometry with UVs: u = metres along the bottom edge / su, v = 0 (bottom) … 1 (top) or metres / sv. */
function quadsGeo(quads, su = 1, sv = 0) {
  const pos = [], uv = []
  quads.forEach(([a, b, c, d]) => {
    const w = a.distanceTo(b) / su
    const h = sv ? a.distanceTo(d) / sv : 1
    const P = [a, b, c, a, c, d], U = [[0, 0], [w, 0], [w, h], [0, 0], [w, h], [0, h]]
    P.forEach((p) => pos.push(p.x, p.y, p.z))
    U.forEach((t) => uv.push(...t))
  })
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.computeVertexNormals()
  return g
}

function shellGeo(lift, su, sv) {
  const q = []
  hipBand(0, D, lift, lift, q)
  gabBand(0, GB, lift, lift, q)
  return quadsGeo(q, su, sv)
}

/**
 * Gablet ends: in the photos the "A" is framed by red boards and the triangle
 * is recessed, lined with light plywood, so it reads as an opening under the palm.
 */
function gableEnds(inset) {
  const pos = []
  ;[1, -1].forEach((s) => {
    const x = s * (GA - inset), w = GB * (1 - inset / GA * 0.2)
    pos.push(x, KINK, -w, x, KINK, w, x, RIDGE - 0.1, 0)
  })
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.computeVertexNormals()
  return g
}

/** The red "A" boards along the two sloped edges of each gablet end. */
function gableFascia() {
  const out = []
  const len = Math.hypot(GB, RIDGE - KINK) + 0.3
  const ang = Math.atan2(RIDGE - KINK, GB)
  ;[1, -1].forEach((s) => [1, -1].forEach((k) => {
    const g = new THREE.BoxGeometry(0.06, 0.28, len)
    const m = new THREE.Matrix4().makeRotationX(k * ang)
    g.applyMatrix4(m)
    g.translate(s * (GA + 0.1), (KINK + RIDGE) / 2 + 0.12, k * GB / 2)
    out.push(g)
  }))
  return out
}

// ---------- Structure (concrete, steel beam, tubes) ----------
const piece = (geo, color, pos, quat = new THREE.Quaternion()) => ({ geo, color, pos, quat })
function tube(a, b, r, color) {
  const d = b.clone().sub(a)
  return piece(new THREE.CylinderGeometry(r, r, d.length(), 8), color, a.clone().add(b).multiplyScalar(0.5),
    new THREE.Quaternion().setFromUnitVectors(UP, d.normalize()))
}

function buildStructure() {
  const s = [[], []]
  // 1 Concrete columns and the black steel beam around them
  const cols = [[-1, -1], [0, -1], [1, -1], [1, 1], [0, 1], [-1, 1]].map(([i, k]) => [i * COL[0], k * COL[1]])
  cols.forEach(([x, z]) => s[0].push(piece(new THREE.CylinderGeometry(0.18, 0.18, BEAM_Y, 14), C.concrete, V(x, BEAM_Y / 2, z))))
  ;[1, -1].forEach((k) => {
    s[0].push(piece(new THREE.BoxGeometry(2 * COL[0] + 0.3, 0.3, 0.15), C.beam, V(0, BEAM_Y + 0.15, k * COL[1])))
    s[0].push(piece(new THREE.BoxGeometry(0.15, 0.3, 2 * COL[1]), C.beam, V(k * COL[0], BEAM_Y + 0.15, 0)))
  })
  // 2 Tubes: hips, ridge, then rafters square to each eave (jack rafters stop at the hips)
  const R = 0.06, sp = 0.6
  ;[[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([i, k]) => s[1].push(tube(V(i * A, EAVE, k * B), V(i * GA, KINK, k * GB), 0.08, C.steel)))
  // Kink frame where the gablet starts, and a ladder ridge (two tubes with rungs), as in the interior photos
  ;[[1, 1, 1, -1], [-1, 1, -1, -1], [-1, 1, 1, 1], [-1, -1, 1, -1]].forEach(([i0, k0, i1, k1]) =>
    s[1].push(tube(V(i0 * GA, KINK, k0 * GB), V(i1 * GA, KINK, k1 * GB), 0.08, C.steel)))
  const RZ = 0.22, RY = RIDGE - RZ * T2 - 0.04
  ;[1, -1].forEach((k) => s[1].push(tube(V(-GA, RY, k * RZ), V(GA, RY, k * RZ), 0.08, C.steel)))
  for (let x = -GA; x <= GA + 1e-6; x += (2 * GA) / 7) s[1].push(tube(V(x, RY, -RZ), V(x, RY, RZ), 0.05, C.steel))
  for (let x = -A + 0.4; x <= A - 0.4 + 1e-6; x += sp) {
    ;[1, -1].forEach((k) => {
      const top = Math.min(D, A - Math.abs(x))
      const a = V(x, EAVE, k * B), b = V(x, hipY(top), k * (B - top))
      s[1].push(tube(a, b, R, C.steel))
      if (Math.abs(x) <= GA) s[1].push(tube(b, V(x, RY, k * RZ), R, C.steel))
    })
  }
  for (let z = -B + 0.4; z <= B - 0.4 + 1e-6; z += sp) {
    ;[1, -1].forEach((i) => {
      const top = Math.min(D, B - Math.abs(z))
      s[1].push(tube(V(i * A, EAVE, z), V(i * (A - top), hipY(top), z), R, C.steel))
    })
  }
  return s
}

function ghostGeometry() {
  const p = []
  const rect = (a, b, y) => { const c = [V(-a, y, -b), V(a, y, -b), V(a, y, b), V(-a, y, b)]; c.forEach((v, i) => p.push(v, c[(i + 1) % 4])) }
  rect(A + 0.4, B + 0.4, EAVE - 0.1)
  rect(GA, GB, KINK)
  ;[[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([i, k]) => p.push(V(i * (A + 0.4), EAVE - 0.1, k * (B + 0.4)), V(i * GA, KINK, k * GB)))
  ;[1, -1].forEach((i) => p.push(V(i * GA, KINK, GB), V(i * GA, RIDGE, 0), V(i * GA, RIDGE, 0), V(i * GA, KINK, -GB)))
  p.push(V(-GA, RIDGE, 0), V(GA, RIDGE, 0))
  return new THREE.BufferGeometry().setFromPoints(p)
}

function Structure() {
  const steps = useMemo(buildStructure, [])
  const mats = useMemo(() => {
    const m = {}
    Object.values(C).forEach((c) => { m[c] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.75 }) })
    return m
  }, [])
  const ghost = useMemo(ghostGeometry, [])
  const ghostMat = useMemo(() => new THREE.LineBasicMaterial({ color: C.bronze, transparent: true, opacity: 0.42 }), [])
  const ghostRef = useRef()
  const refs = useRef([])
  useFrame((state) => {
    const sp = stepPos(state, STEPS, ASSEMBLE)
    steps.forEach((list, s) => list.forEach((p, j) => {
      const g = refs.current[s]?.[j]
      if (!g) return
      const r = clamp((sp - (s + (j / list.length) * 0.55)) / 0.45)
      const e = 1 - Math.pow(1 - r, 3)
      g.visible = r > 0
      g.position.set(p.pos.x, p.pos.y + (1 - e) * 1.5, p.pos.z)
    }))
    if (ghostRef.current) ghostRef.current.visible = sp < STEPS
  })
  return (
    <group>
      <lineSegments ref={ghostRef} geometry={ghost} material={ghostMat} />
      {steps.map((list, s) => list.map((p, j) => (
        <mesh key={s + '-' + j} ref={(el) => { (refs.current[s] ||= [])[j] = el }}
          geometry={p.geo} material={mats[p.color]} quaternion={p.quat} />
      )))}
    </group>
  )
}

// ---------- Layers revealed by a clipping plane sweeping along x ----------
const sweep = () => new THREE.Plane(V(-1, 0, 0), -8)
const SPAN = 8

function Layers() {
  const items = useMemo(() => {
    const mk = (opts) => { const plane = sweep(); return { plane, mat: new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.95, clippingPlanes: [plane], ...opts }) } }
    const pet = petateTex(); pet.repeat.set(1, 1)
    return [
      { step: 2, start: 0, geo: shellGeo(-0.09, 0.5, 0.5), ...mk({ map: pet }) },
      { step: 2, start: 0.4, geo: shellGeo(0.09), ...mk({ color: C.ply }) },
      { step: 2, start: 0.4, geo: gableEnds(0.35), ...mk({ color: '#c9a77a' }) },
      ...gableFascia().map((geo) => ({ step: 2, start: 0.4, geo, ...mk({ color: C.membrane }) })),
      { step: 3, start: 0, geo: shellGeo(0.13), ...mk({ color: C.membrane }) },
    ]
  }, [])
  const refs = useRef([])
  useFrame((state) => {
    const sp = stepPos(state, STEPS, ASSEMBLE)
    items.forEach((it, i) => {
      it.plane.constant = -SPAN + 2 * SPAN * clamp((sp - it.step - it.start) / 0.55)
      // ponytail: once the palm is fully on, the waterproofing under it is hidden so the
      // steep gablet's fringe gaps can't flash red; layer it properly if the palm gets thicker.
      if (refs.current[i]) refs.current[i].visible = !(it.step === 3 && sp > 5.95)
    })
  })
  return items.map((it, i) => <mesh key={i} ref={(el) => (refs.current[i] = el)} geometry={it.geo} material={it.mat} />)
}

/** Battens: contour lines on the waterproofing, laid from the eave up. */
function Battens() {
  const rows = useMemo(() => {
    const out = []
    for (let d = 0.2; d < D - 0.1; d += 0.42) {
      const a = A - d, b = B - d, y = hipY(d) + 0.17
      out.push([[V(-a, y, b), V(a, y, b)], [V(a, y, -b), V(-a, y, -b)], [V(a, y, b), V(a, y, -b)], [V(-a, y, -b), V(-a, y, b)]])
    }
    for (let e = 0.15; e < GB - 0.05; e += 0.3) {
      const y = gabY(e) + 0.17, z = GB - e
      out.push([[V(-GA, y, z), V(GA, y, z)], [V(-GA, y, -z), V(GA, y, -z)]])
    }
    return out.map((segs) => {
      const pos = []
      segs.forEach(([a, b]) => pos.push(a.x, a.y, a.z, b.x, b.y, b.z))
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
      return g
    })
  }, [])
  const mat = useMemo(() => new THREE.LineBasicMaterial({ color: C.batten }), [])
  const refs = useRef([])
  useFrame((state) => {
    const sp = stepPos(state, STEPS, ASSEMBLE)
    rows.forEach((_, i) => { const m = refs.current[i]; if (m) m.visible = sp - 4 > (i / rows.length) * 0.8 && sp < 5.95 })
  })
  return rows.map((g, i) => <lineSegments key={i} ref={(el) => (refs.current[i] = el)} geometry={g} material={mat} />)
}

/** Palm: overlapping courses from the eave up; each sweeps along the ridge. */
function Palm() {
  const items = useMemo(() => {
    const tex = courseTex(); tex.repeat.set(1, 1)
    const bands = []
    const nLow = 6, nTop = 2
    for (let i = 0; i < nLow; i++) {
      const d0 = i === 0 ? -0.45 : (D * i) / nLow - 0.12, d1 = (D * (i + 1)) / nLow + 0.3
      const q = []; hipBand(d0, Math.min(d1, D + 0.1), 0.34, 0.18, q); bands.push(q)
    }
    for (let i = 0; i < nTop; i++) {
      const e0 = (GB * i) / nTop - (i ? 0.1 : 0.2), e1 = (GB * (i + 1)) / nTop + 0.05
      const q = []; gabBand(e0, Math.min(e1, GB), 0.5, 0.36, q); bands.push(q) // steeper: lift more to clear the waterproofing
    }
    const out = bands.map((q, order) => {
      const plane = sweep()
      const mat = new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 1, alphaTest: 0.45, clippingPlanes: [plane] })
      return { geo: quadsGeo(q, 1.6), mat, plane, order, n: bands.length + 1 }
    })
    // Ridge cap: a roll of palm along the cumbrera, tied last.
    const plane = sweep()
    const cap = new THREE.CylinderGeometry(0.13, 0.13, 2 * GA + 0.1, 10, 1, false)
    cap.rotateZ(Math.PI / 2); cap.translate(0, RIDGE + 0.32, 0)
    out.push({ geo: cap, plane, order: bands.length, n: bands.length + 1,
      mat: new THREE.MeshStandardMaterial({ color: '#9a8a6a', roughness: 1, clippingPlanes: [plane] }) })
    return out
  }, [])
  useFrame((state) => {
    const sp = stepPos(state, STEPS, ASSEMBLE)
    items.forEach((it) => { it.plane.constant = -SPAN + 2 * SPAN * clamp((sp - 5 - (it.order / it.n) * 0.6) / 0.3) })
  })
  return items.map((it, i) => <mesh key={i} geometry={it.geo} material={it.mat} />)
}

const DIMS = [
  { text: '11.90 m', from: V(-A, 0.02, B + 1.0), to: V(A, 0.02, B + 1.0), step: 0, keep: true },
  { text: '7.90 m', from: V(A + 1.0, 0.02, -B), to: V(A + 1.0, 0.02, B), step: 0, keep: true },
  { text: '7.20 m', from: V(-A - 1.0, 0, 0), to: V(-A - 1.0, RIDGE, 0), step: 1, keep: true },
  { text: '46°', from: V(A - 0.2, EAVE, B + 0.3), to: V(A - D, KINK, B + 0.3), step: 1 },
]

const TAG_AT = [
  V(-COL[0], 1.5, COL[1]), V(0, RIDGE + 0.4, 0), V(-2, hipY(1.5) + 0.3, B - 1.5), V(2, hipY(1.2) + 0.3, B - 1.2),
  V(-3, hipY(2.2) + 0.4, B - 2.2), V(1, RIDGE + 0.3, 0),
]

const VIEW = { az: [-38, 20], el: [24, 4], ty: [2.2, 1.2], end: { az: -28, el: 30, ty: 3.2 }, reach: [9.2, 7.6] }

export default function CasaArcoScene({ section, steps, onStep, onReady, onProgress }) {
  const [step, setStep] = useState(-1)
  const still = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  return (
    <Canvas
      className="anat-canvas"
      frameloop="demand"
      dpr={[1, 1.5]}
      flat
      camera={{ fov: 32, near: 0.5, far: 150, position: [-16, 10, 20] }}
      gl={{ antialias: true, powerPreference: 'low-power', localClippingEnabled: true }}
      onCreated={({ gl }) => { gl.localClippingEnabled = true }}
      style={{ touchAction: 'pan-y', cursor: 'default' }}
      aria-hidden="true"
    >
      <color attach="background" args={[C.bg]} />
      <hemisphereLight args={['#fff1dc', '#3b3129', 1.2]} />
      <directionalLight position={[-8, 16, 12]} intensity={1.7} color="#ffe9c9" />
      <directionalLight position={[10, 6, -10]} intensity={0.35} color="#c9d3e0" />
      <gridHelper args={[20, 40, C.bronze, C.bronze]} position={[0, 0.001, 0]} material-transparent material-opacity={0.16} />
      <Structure />
      <Layers />
      <Battens />
      <Palm />
      <Dims step={step} steps={STEPS} dims={DIMS} color={C.paper} />
      <Tag step={step} steps={steps} at={TAG_AT} />
      <Rig section={section} still={still} steps={STEPS} assemble={ASSEMBLE} view={VIEW}
        onStep={onStep} onReady={onReady} onProgress={onProgress} setStepUI={setStep} />
    </Canvas>
  )
}
