/**
 * PlataformaScene.jsx — lazy chunk (three + R3F + drei). Never imported by SSR.
 *
 * Delfiniti's new platform around the pink tower, from the architectural plan
 * (stage 3 ≈ 146.62 m², stage 2 ≈ 23.91 m², tower R 2.35 m). Outline and post
 * positions are read off the drawing at its print scale, so they are approximate.
 * Steps: the old raised deck comes down, twin log posts go into concrete
 * sockets, sleepers on a 1.25 m grid, then the boards.
 */
import { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Rig, Dims, Tag, clamp, V, stepPos, canvasTex } from './sceneKit'

const STEPS = 4
const ASSEMBLE = 0.82
const TOWER_R = 2.35
const DECK_Y = 0.3, BOARD = 0.04
const POST_H = 3.2

const C = {
  bg: '#2C2C2C', bronze: '#B39B78', paper: '#F4F3F0',
  tower: '#c95a8e', concrete: '#bdb6aa', log: '#7a4a2c', sleeper: '#6b4a32', old: '#5a4636',
}

// Plan outline (m, tower centre at the origin, z towards the pool side).
const STAGE3 = [[-4.4, -4.0], [4.5, -1.2], [4.5, 2.4], [7.0, 6.2], [-7.7, 6.2], [-4.4, 2.1]]
const STAGE2 = [[-9.8, 0.9], [-4.4, 0.9], [-4.4, 2.1], [-7.4, 5.6], [-9.8, 5.6]]
const POSTS = [[-4.6, -0.7], [-3.95, -0.7], [-4.6, 0.72], [-3.95, 0.72], [-4.6, 2.57], [-3.95, 2.57],
  [-7.5, 5.5], [-6.9, 5.5], [4.0, 0.72], [4.6, 0.72], [4.0, 2.57], [4.6, 2.57], [4.0, -1.0]]

const inPoly = (x, z, poly) => {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j]
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside
  }
  return inside
}
const onDeck = (x, z) => (inPoly(x, z, STAGE3) || inPoly(x, z, STAGE2)) && Math.hypot(x, z) > TOWER_R + 0.05

/** Deck boards run along x (as in the plan); planks in a canvas texture. */
const boardTex = () => {
  let seed = 3
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  return canvasTex(64, 256, (g) => {
    for (let y = 0; y < 256; y += 16) {
      g.fillStyle = ['#9a5a38', '#a8653f', '#8f5233', '#b06c44'][(rnd() * 4) | 0]
      g.fillRect(0, y, 64, 15)
      g.fillStyle = '#4a2c1c'; g.fillRect(0, y + 15, 64, 1)
    }
  }, [1, 1])
}

function deckGeo(poly) {
  const sh = new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, -z)))
  const hole = new THREE.Path(); hole.absarc(0, 0, TOWER_R, 0, Math.PI * 2, true)
  if (poly === STAGE3) sh.holes.push(hole)
  const g = new THREE.ExtrudeGeometry(sh, { depth: BOARD, bevelEnabled: false })
  g.rotateX(-Math.PI / 2)
  g.translate(0, DECK_Y, 0)
  // UVs from plan metres: 0.16 m boards (16 px per board in a 256 px tile → 1 tile = 2.56 m)
  const uv = g.attributes.uv
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2.56, uv.getY(i) / 2.56)
  return g
}

/** Sleepers along z on a 1.25 m grid, split into runs that stay on the deck. */
function sleeperRuns() {
  const runs = []
  for (let x = -9.6; x <= 6.9; x += 1.25) {
    let start = null
    for (let z = -4.2; z <= 6.4; z += 0.05) {
      const on = onDeck(x, z)
      if (on && start === null) start = z
      if ((!on || z + 0.05 > 6.4) && start !== null) { if (z - start > 0.3) runs.push([x, start, z]); start = null }
    }
  }
  return runs
}

/** The old raised deck: a ghost that sinks and fades during step 1. */
function OldDeck() {
  const ref = useRef()
  const geo = useMemo(() => {
    const p = []
    const y = 2.4
    for (let x = -9; x <= 6; x += 1.5) for (let z = -2; z <= 5.5; z += 1.5) {
      if (!onDeck(x, z)) continue
      p.push(V(x, 0, z), V(x, y, z))
      if (onDeck(x + 1.5, z)) p.push(V(x, y, z), V(x + 1.5, y, z))
      if (onDeck(x, z + 1.5)) p.push(V(x, y, z), V(x, y, z + 1.5))
    }
    return new THREE.BufferGeometry().setFromPoints(p)
  }, [])
  const mat = useMemo(() => new THREE.LineBasicMaterial({ color: '#b07a52', transparent: true, opacity: 0.9 }), [])
  useFrame((state) => {
    const sp = stepPos(state, STEPS, ASSEMBLE)
    const r = clamp((sp - 0.15) / 0.75)
    if (!ref.current) return
    ref.current.visible = r < 1
    ref.current.position.y = -r * 1.2
    mat.opacity = 0.9 * (1 - r)
  })
  return <lineSegments ref={ref} geometry={geo} material={mat} />
}

function Build() {
  const mats = useMemo(() => {
    const m = {}
    Object.values(C).forEach((c) => { m[c] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 }) })
    return m
  }, [])
  const pieces = useMemo(() => {
    const s = [[], [], []]
    // 2 Concrete sockets and twin log posts
    POSTS.forEach(([x, z]) => {
      s[0].push({ geo: new THREE.CylinderGeometry(0.28, 0.3, 0.35, 16), color: C.concrete, pos: V(x, 0.17, z) })
      s[0].push({ geo: new THREE.CylinderGeometry(0.15, 0.18, POST_H, 12), color: C.log, pos: V(x, POST_H / 2, z) })
    })
    // 3 Sleepers
    sleeperRuns().forEach(([x, z0, z1]) => s[1].push({
      geo: new THREE.BoxGeometry(0.1, 0.2, z1 - z0), color: C.sleeper, pos: V(x, DECK_Y - 0.1, (z0 + z1) / 2) }))
    return s
  }, [])
  const refs = useRef([])
  useFrame((state) => {
    const sp = stepPos(state, STEPS, ASSEMBLE)
    pieces.forEach((list, s) => list.forEach((p, j) => {
      const g = refs.current[s]?.[j]
      if (!g) return
      const r = clamp((sp - (s + 1 + (j / list.length) * 0.55)) / 0.45)
      const e = 1 - Math.pow(1 - r, 3)
      g.visible = r > 0
      g.position.set(p.pos.x, p.pos.y + (1 - e) * 1.2, p.pos.z)
    }))
  })
  return pieces.map((list, s) => list.map((p, j) => (
    <mesh key={s + '-' + j} ref={(el) => { (refs.current[s] ||= [])[j] = el }} geometry={p.geo} material={mats[p.color]} />
  )))
}

/** Boards: stage 2 then stage 3, each revealed by a plane sweeping along x. */
function Boards() {
  const items = useMemo(() => {
    const tex = boardTex()
    return [STAGE2, STAGE3].map((poly, i) => {
      const plane = new THREE.Plane(V(-1, 0, 0), -12)
      return { i, geo: deckGeo(poly), plane, mat: new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, clippingPlanes: [plane] }) }
    })
  }, [])
  useFrame((state) => {
    const sp = stepPos(state, STEPS, ASSEMBLE)
    items.forEach((it) => { it.plane.constant = -12 + 24 * clamp((sp - 3 - it.i * 0.4) / 0.5) })
  })
  return items.map((it) => <mesh key={it.i} geometry={it.geo} material={it.mat} />)
}

/** The pink tower, context from the start (cut short so it doesn't hide the deck). */
function Tower() {
  return (
    <mesh position={[0, 2.2, 0]}>
      <cylinderGeometry args={[TOWER_R, TOWER_R, 4.4, 40, 1, true]} />
      <meshStandardMaterial color={C.tower} roughness={0.9} side={THREE.DoubleSide} />
    </mesh>
  )
}

function Outline() {
  const geo = useMemo(() => {
    const p = []
    ;[STAGE3, STAGE2].forEach((poly) => poly.forEach(([x, z], i) => {
      const [x2, z2] = poly[(i + 1) % poly.length]
      p.push(V(x, 0.02, z), V(x2, 0.02, z2))
    }))
    return new THREE.BufferGeometry().setFromPoints(p)
  }, [])
  return <lineSegments geometry={geo}><lineBasicMaterial color={C.bronze} transparent opacity={0.6} /></lineSegments>
}

const DIMS = [
  { text: 'R 2.35 m', from: V(0, 0.05, 0), to: V(TOWER_R, 0.05, 0), step: 0, keep: true },
  { text: '1.25 m', from: V(-3.35, DECK_Y + 0.4, 5.2), to: V(-2.1, DECK_Y + 0.4, 5.2), step: 2 },
]
const TAG_AT = [V(-6, 2.6, 2), V(-4.3, POST_H + 0.3, 0.7), V(1.5, 0.8, 4.5), V(-2, 0.8, 5)]
const VIEW = { az: [35, -15], el: [38, -8], ty: [0.8, 0.2], end: { az: 10, el: 30, ty: 1.0 }, reach: [11, 9] }

export default function PlataformaScene({ section, steps, onStep, onReady, onProgress }) {
  const [step, setStep] = useState(-1)
  const still = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  return (
    <Canvas
      className="anat-canvas"
      frameloop="demand"
      dpr={[1, 1.5]}
      flat
      camera={{ fov: 32, near: 0.5, far: 150, position: [14, 12, 20] }}
      gl={{ antialias: true, powerPreference: 'low-power', localClippingEnabled: true }}
      onCreated={({ gl }) => { gl.localClippingEnabled = true }}
      style={{ touchAction: 'pan-y', cursor: 'default' }}
      aria-hidden="true"
    >
      <color attach="background" args={[C.bg]} />
      <hemisphereLight args={['#fff1dc', '#3b3129', 1.2]} />
      <directionalLight position={[8, 16, 12]} intensity={1.6} color="#ffe9c9" />
      <directionalLight position={[-10, 6, -10]} intensity={0.35} color="#c9d3e0" />
      <gridHelper args={[24, 48, C.bronze, C.bronze]} position={[0, 0.001, 0]} material-transparent material-opacity={0.14} />
      <group position={[1, 0, -1]}>
        <Outline />
        <Tower />
        <OldDeck />
        <Build />
        <Boards />
        <Dims step={step} steps={STEPS} dims={DIMS} color={C.paper} />
        <Tag step={step} steps={steps} at={TAG_AT} />
      </group>
      <Rig section={section} still={still} steps={STEPS} assemble={ASSEMBLE} view={VIEW}
        onStep={onStep} onReady={onReady} onProgress={onProgress} setStepUI={setStep} />
    </Canvas>
  )
}
