/**
 * AbanicoScene.jsx — lazy chunk (three + R3F + drei). Never imported by SSR.
 *
 * The fan palapa at Punta Garrobo: half a cone over the dining room and living
 * area. Plan radius ≈ 6.9 m (architectural plan A-04); the slope and heights
 * are read off the site photos, so they are approximate and not dimensioned.
 * Layers go on in the order the crew built them: concrete, radial steel tubes,
 * palm mat + plywood, membrane, battens, palm. Shells sweep around the fan.
 */
import { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Rig, Dims, Tag, clamp, V, stepPos, courseTex, petateTex } from './sceneKit'

// ---------- Geometry (m) ----------
const R = 6.9                // ring beam radius (plan)
const RE = 7.4               // steel eave ring
const RP = 7.9               // palm edge
const SLOPE = Math.tan(THREE.MathUtils.degToRad(35))
const EAVE = 3.0             // height of the steel eave ring
const APEX = EAVE + SLOPE * RE
const yAt = (r) => APEX - SLOPE * r
const N_TUBE = 19
const SEG = 48

const STEPS = 6
const ASSEMBLE = 0.82

const C = {
  bg: '#2C2C2C', bronze: '#B39B78', paper: '#F4F3F0',
  concrete: '#9a968e', steel: '#7a3a22', ply: '#4b4239', membrane: '#8a3426', batten: '#cdb184',
}

const arcAt = (t, r) => V(r * Math.sin(t), 0, r * Math.cos(t)) // t ∈ [-π/2, π/2], fan opens to +z
const angles = (n) => Array.from({ length: n }, (_, i) => -Math.PI / 2 + (i * Math.PI) / (n - 1))
const UP = V(0, 1, 0)

/** A mesh piece: geometry + colour + transform. */
const piece = (geo, color, pos, quat = new THREE.Quaternion()) => ({ geo, color, pos, quat })

function tube(a, b, radius, color) {
  const d = b.clone().sub(a)
  const g = new THREE.CylinderGeometry(radius, radius, d.length(), 10)
  return piece(g, color, a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(UP, d.normalize()))
}

function arc(radius, y, thick, color) {
  const g = new THREE.TorusGeometry(radius, thick, 6, SEG, Math.PI)
  // Torus lies in XY from +x through +y; turning it +90° about x lays it in XZ through +z.
  return piece(g, color, V(0, y, 0), new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), Math.PI / 2))
}

function buildStructure() {
  const s = [[], []]
  // 1 Concrete: back wall up to the beam, a central fin that carries the apex, columns and the curved ring beam
  s[0].push(piece(new THREE.BoxGeometry(2 * R, yAt(R), 0.25), C.concrete, V(0, yAt(R) / 2, -0.3)))
  const fin = new THREE.Shape([[0, 0], [2.4, 0], [2.4, yAt(R)], [0, APEX - 0.1]].map(([z, y]) => new THREE.Vector2(z, y)))
  const finGeo = new THREE.ExtrudeGeometry(fin, { depth: 0.3, bevelEnabled: false })
  finGeo.translate(0, 0, -0.15)
  s[0].push(piece(finGeo, C.concrete, V(0, 0, -0.3), new THREE.Quaternion().setFromAxisAngle(UP, Math.PI / 2)))
  angles(7).forEach((t) => {
    const p = arcAt(t, R)
    s[0].push(piece(new THREE.CylinderGeometry(0.16, 0.16, yAt(R) - 0.3, 12), C.concrete, V(p.x, (yAt(R) - 0.3) / 2, p.z)))
  })
  s[0].push(arc(R, yAt(R) - 0.15, 0.17, C.concrete))
  // 2 Radial steel tubes from the apex to the eave ring, then the ring
  const apex = V(0, APEX, 0)
  angles(N_TUBE).forEach((t) => {
    const e = arcAt(t, RE); e.y = EAVE
    s[1].push(tube(apex, e, 0.07, C.steel))
  })
  s[1].push(arc(RE, EAVE, 0.06, C.steel))
  return s
}

/** Ghost: bronze outline of what is still to be built (tube axes, beam arc, roof edge). */
function ghostGeometry() {
  const pts = []
  const apex = V(0, APEX, 0)
  angles(N_TUBE).forEach((t) => { const e = arcAt(t, RE); e.y = EAVE; pts.push(apex, e) })
  const ring = (r, y) => angles(SEG).forEach((t, i, a) => {
    if (!i) return
    const p = arcAt(a[i - 1], r), q = arcAt(t, r); p.y = q.y = y; pts.push(p, q)
  })
  ring(R, yAt(R) - 0.15)
  ring(RP, yAt(RP) + 0.28)
  return new THREE.BufferGeometry().setFromPoints(pts)
}

/** Half-cone shell from the apex down to radius rb, lifted by `off`. */
function shellGeo(rb) {
  const h = SLOPE * rb
  const g = new THREE.ConeGeometry(rb, h, SEG, 1, true, -Math.PI / 2, Math.PI)
  g.translate(0, APEX - h / 2, 0)
  return g
}

// Shells: step, base radius, lift, material. They sweep around the fan in build order.
const SHELLS = [
  { step: 2, rb: RE, off: -0.09, start: 0, mat: () => ({ map: petateTex() }) },
  { step: 2, rb: RE + 0.05, off: 0.09, start: 0.45, mat: () => ({ color: C.ply }) },
  { step: 3, rb: RE + 0.1, off: 0.12, start: 0, mat: () => ({ color: C.membrane }) },
]

function Shells() {
  const items = useMemo(() => SHELLS.map((s) => {
    const geo = shellGeo(s.rb)
    const mat = new THREE.MeshStandardMaterial({ ...s.mat(), side: THREE.DoubleSide, roughness: 0.95 })
    return { ...s, geo, mat, per: geo.index.count / SEG }
  }), [])
  const refs = useRef([])
  useFrame((state) => {
    const sp = stepPos(state, STEPS, ASSEMBLE)
    items.forEach((it, i) => {
      const m = refs.current[i]
      if (!m) return
      const r = clamp((sp - it.step - it.start) / 0.5)
      m.visible = r > 0
      it.geo.setDrawRange(0, Math.ceil(r * SEG) * it.per)
    })
  })
  return items.map((it, i) => (
    <mesh key={i} ref={(el) => (refs.current[i] = el)} geometry={it.geo} material={it.mat} position-y={it.off} />
  ))
}

/** Palm: overlapping courses tied from the eave up to the apex, each one sweeping around the fan. */
const COURSES = 9
function Palm() {
  const items = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({ map: courseTex(), side: THREE.DoubleSide, roughness: 1, alphaTest: 0.45 })
    return Array.from({ length: COURSES }, (_, i) => {
      const r0 = Math.max(0, (RP * i) / COURSES - 0.45)  // overlaps the course above
      const r1 = (RP * (i + 1)) / COURSES
      // Each course tucks its top under the course above and lifts its fringe,
      // so the upper course always lies over the lower one where they overlap.
      const y0 = yAt(r0) + 0.18, y1 = yAt(r1) + 0.34
      const geo = new THREE.CylinderGeometry(r0, r1 + 0.1, y0 - y1, SEG, 1, true, -Math.PI / 2, Math.PI)
      geo.translate(0, (y0 + y1) / 2, 0)
      return { geo, mat, per: geo.index.count / SEG, order: COURSES - 1 - i }
    })
  }, [])
  const refs = useRef([])
  useFrame((state) => {
    const sp = stepPos(state, STEPS, ASSEMBLE)
    items.forEach((it, i) => {
      const m = refs.current[i]
      if (!m) return
      const r = clamp((sp - 5 - (it.order / COURSES) * 0.6) / 0.3)
      m.visible = r > 0
      it.geo.setDrawRange(0, Math.ceil(r * SEG) * it.per)
    })
  })
  return items.map((it, i) => <mesh key={i} ref={(el) => (refs.current[i] = el)} geometry={it.geo} material={it.mat} />)
}

/** Battens: concentric arcs on the membrane, laid from the eave up. */
function Battens() {
  const rings = useMemo(() => {
    const out = []
    for (let r = RE - 0.15; r > 1.0; r -= 0.42) out.push(r)
    return out
  }, [])
  const geos = useMemo(() => rings.map((r) => new THREE.TorusGeometry(r, 0.025, 4, SEG, Math.PI)), [rings])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: C.batten, roughness: 0.9 }), [])
  const refs = useRef([])
  useFrame((state) => {
    const sp = stepPos(state, STEPS, ASSEMBLE)
    rings.forEach((_, i) => {
      const m = refs.current[i]
      if (m) m.visible = sp - 4 > (i / rings.length) * 0.8
    })
  })
  return rings.map((r, i) => (
    <mesh key={r} ref={(el) => (refs.current[i] = el)} geometry={geos[i]} material={mat}
      position-y={yAt(r) + 0.15} rotation-x={Math.PI / 2} />
  ))
}

function Structure() {
  const steps = useMemo(buildStructure, [])
  const mats = useMemo(() => {
    const m = {}
    Object.values(C).forEach((c) => { m[c] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 }) })
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

const DIMS = [
  { text: '≈ 6.9 m', from: V(0, 0.02, 0), to: V(0, 0.02, R), step: 0, keep: true },
  { text: '≈ 13.8 m', from: V(-R, 0.02, 0.6), to: V(R, 0.02, 0.6), step: 0 },
]

const TAG_AT = [
  V(R * 0.7, 1.6, R * 0.7), V(0, APEX + 0.2, 0.5), V(-3, yAt(3) + 0.3, 3), V(3, yAt(3.5) + 0.4, 2.5),
  V(-4, yAt(5) + 0.4, 3.5), V(2, yAt(2) + 0.6, 2),
]

const VIEW = { az: [40, -22], el: [24, -2], ty: [2.6, 1.0], end: { az: 12, el: 26, ty: 3.4 }, reach: [10.5, 8.6] }

export default function AbanicoScene({ section, steps, onStep, onReady, onProgress }) {
  const [step, setStep] = useState(-1)
  const still = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  return (
    <Canvas
      className="anat-canvas"
      frameloop="demand"
      dpr={[1, 1.5]}
      flat
      camera={{ fov: 32, near: 0.5, far: 150, position: [18, 12, 22] }}
      gl={{ antialias: true, powerPreference: 'low-power' }}
      style={{ touchAction: 'pan-y', cursor: 'default' }}
      aria-hidden="true"
    >
      <color attach="background" args={[C.bg]} />
      <hemisphereLight args={['#fff1dc', '#3b3129', 1.2]} />
      <directionalLight position={[8, 16, 12]} intensity={1.7} color="#ffe9c9" />
      <directionalLight position={[-10, 6, -10]} intensity={0.35} color="#c9d3e0" />
      <gridHelper args={[20, 40, C.bronze, C.bronze]} position={[0, 0.001, 0]} material-transparent material-opacity={0.16} />
      <Structure />
      <Shells />
      <Battens />
      <Palm />
      <Dims step={step} steps={STEPS} dims={DIMS} color={C.paper} />
      <Tag step={step} steps={steps} at={TAG_AT} />
      <Rig section={section} still={still} steps={STEPS} assemble={ASSEMBLE} view={VIEW}
        onStep={onStep} onReady={onReady} onProgress={onProgress} setStepUI={setStep} />
    </Canvas>
  )
}
