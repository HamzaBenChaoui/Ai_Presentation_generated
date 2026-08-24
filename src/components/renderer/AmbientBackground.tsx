import { useReducedMotion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import * as THREE from 'three'
import type { AmbientSpec } from './theme'

// Living background layer. Each theme ships an `ambient` spec (kind, colors,
// opacity, cycle speed) and this component turns it into a subtle texture that
// drifts behind the slide. Everything animates with transform-only CSS
// (translate/rotate/scale) so it runs on the compositor at 60fps — never
// background-position or border-radius, which would thrash layout/paint.
//
// The layer is absolute, inset 0, behind content, and ignores pointer events
// so it never steals clicks or blocks inline editing. Respects the user's
// reduced-motion preference by rendering the texture statically.

// --- shared keyframes (defined once in src/index.css) -----------------------

const hexToRgba = (hex: string, a: number): string => {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
  const int = parseInt(full, 16)
  if (Number.isNaN(int)) return hex
  return `rgba(${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}, ${a})`
}

// Film-grain noise (fractal turbulence), rendered as a tileable data-URI so no
// image request is needed. Opacity handled by the parent layer.
const NOISE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='240' height='240' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E")`

// Fine grid of hairlines drawn from two crossing repeating-linear-gradients.
const gridTexture = (c: string): string =>
  `repeating-linear-gradient(0deg, ${hexToRgba(c, 0.7)} 0px, ${hexToRgba(c, 0.7)} 1px, transparent 1px, transparent 46px), ` +
  `repeating-linear-gradient(90deg, ${hexToRgba(c, 0.7)} 0px, ${hexToRgba(c, 0.7)} 1px, transparent 1px, transparent 46px)`

export default function AmbientBackground({ spec }: { spec: AmbientSpec }) {
  const prefersReduced = useReducedMotion()
  const moving = !prefersReduced
  const layerStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
    opacity: spec.opacity,
    zIndex: 0,
  }
  const root = <div style={layerStyle}>{renderKind(spec, moving)}</div>

  return root
}

function renderKind(spec: AmbientSpec, moving: boolean) {
  switch (spec.kind) {
    case 'blobs':
      return <Blobs spec={spec} moving={moving} />
    case 'grid':
      return <Grid spec={spec} moving={moving} />
    case 'grain':
      return <Grain spec={spec} moving={moving} />
    case 'organic':
      return <Organic spec={spec} moving={moving} />
    case 'particles':
      // Checked once at module level — no WebGL (or a dead context) silently
      // degrades to the CSS blobs instead of ever rendering broken.
      return webglAvailable() ? <Particles spec={spec} moving={moving} /> : <Blobs spec={spec} moving={moving} />
  }
}

// Cached WebGL capability probe (three.js recommended pattern).
let webglProbe: boolean | null = null
function webglAvailable(): boolean {
  if (webglProbe !== null) return webglProbe
  try {
    const canvas = document.createElement('canvas')
    webglProbe = !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    webglProbe = false
  }
  return webglProbe
}

function animate(name: string, speed: number, moving: boolean): CSSProperties {
  return moving ? { animation: `${name} ${speed}s ease-in-out infinite` } : {}
}

// Soft radial "aurora" blobs drifting independently — no filter/blur needed,
// the gradients already fall off to transparent.
function Blobs({ spec, moving }: { spec: AmbientSpec; moving: boolean }) {
  const [c1, c2, c3 = c1] = spec.colors
  const blob: CSSProperties = {
    position: 'absolute',
    borderRadius: '50%',
    willChange: 'transform',
  }
  return (
    <>
      <div style={{ ...blob, ...animate('ambDriftA', spec.speed, moving), width: '48%', height: '70%', left: '-10%', top: '-18%', background: `radial-gradient(circle, ${hexToRgba(c1, 0.5)} 0%, rgba(0,0,0,0) 70%)` }} />
      <div style={{ ...blob, ...animate('ambDriftB', spec.speed * 0.85, moving), width: '42%', height: '60%', right: '-8%', top: '6%', background: `radial-gradient(circle, ${hexToRgba(c2, 0.45)} 0%, rgba(0,0,0,0) 70%)` }} />
      <div style={{ ...blob, ...animate('ambDriftC', spec.speed * 1.15, moving), width: '36%', height: '50%', left: '22%', bottom: '-14%', background: `radial-gradient(circle, ${hexToRgba(c3, 0.35)} 0%, rgba(0,0,0,0) 70%)` }} />
    </>
  )
}

// Engineering-grid floor: an oversized tiled panel that slowly pans on a
// diagonal loop (infinite, seamless because it shifts by exactly its tile).
function Grid({ spec, moving }: { spec: AmbientSpec; moving: boolean }) {
  const [c1, c2 = c1] = spec.colors
  const panel: CSSProperties = {
    position: 'absolute',
    inset: '-100%',
    backgroundImage: gridTexture(c1),
    backgroundSize: '92px 92px',
    ...animate('ambPan', spec.speed, moving),
    animationTimingFunction: 'linear',
  }
  const halo: CSSProperties = {
    position: 'absolute',
    inset: '-40%',
    backgroundImage: `radial-gradient(circle at 50% 40%, ${hexToRgba(c2, 0.35)} 0%, rgba(0,0,0,0) 55%)`,
    ...animate('ambDriftA', spec.speed * 1.6, moving),
  }
  return (
    <>
      <div style={halo} />
      <div style={panel} />
    </>
  )
}

// Film grain: a large noise tile breathing slowly (translate + scale jitter).
function Grain({ spec, moving }: { spec: AmbientSpec; moving: boolean }) {
  const grain: CSSProperties = {
    position: 'absolute',
    inset: '-60%',
    backgroundImage: NOISE,
    backgroundSize: '220px 220px',
    ...animate('ambShift', spec.speed, moving),
  }
  return <div style={grain} />
}

// Organic flowing forms: layered radial washes on a slowly rotating panel.
function Organic({ spec, moving }: { spec: AmbientSpec; moving: boolean }) {
  const [c1, c2, c3 = c1] = spec.colors
  const panel: CSSProperties = {
    position: 'absolute',
    inset: '-25%',
    backgroundImage: [
      `radial-gradient(circle at 30% 30%, ${hexToRgba(c1, 0.5)} 0%, rgba(0,0,0,0) 42%)`,
      `radial-gradient(circle at 72% 38%, ${hexToRgba(c2, 0.4)} 0%, rgba(0,0,0,0) 45%)`,
      `radial-gradient(circle at 50% 78%, ${hexToRgba(c3, 0.35)} 0%, rgba(0,0,0,0) 48%)`,
    ].join(', '),
    ...animate('ambSpin', spec.speed, moving),
  }
  return <div style={panel} />
}

// Three.js point-field: a slowly rotating cloud of theme-coloured particles
// with additive blending — real depth for bold/dark decks. WebGL is created
// lazily and torn down cleanly; if anything fails (no GPU, context lost) we
// silently fall back to the CSS blobs so the slide NEVER renders broken.
function Particles({ spec, moving }: { spec: AmbientSpec; moving: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' })
    } catch {
      return // context died between the probe and mount — leave the layer empty
    }

    const [c1, c2, c3 = c1] = spec.colors
    const width = host.clientWidth || 800
    const height = host.clientHeight || 600

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.setSize(width, height)
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 50)
    camera.position.z = 7

    // Distribute ~900 points across a volume, cycling through the theme colors.
    const COUNT = 900
    const positions = new Float32Array(COUNT * 3)
    const colors = new Float32Array(COUNT * 3)
    const palette = [new THREE.Color(c1), new THREE.Color(c2), new THREE.Color(c3)]
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 16
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8
      const c = palette[i % palette.length]
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })
    const points = new THREE.Points(geometry, material)
    scene.add(points)

    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect
      if (!box || !box.width || !box.height) return
      camera.aspect = box.width / box.height
      camera.updateProjectionMatrix()
      renderer.setSize(box.width, box.height)
    })
    observer.observe(host)

    // speed is "seconds per full cycle" (shared with the CSS kinds) — convert
    // to radians/second so all ambient layers feel consistent.
    const omega = (Math.PI * 2) / Math.max(spec.speed, 4)
    let raf = 0
    const clock = new THREE.Clock()

    const frame = () => {
      const t = clock.getElapsedTime()
      points.rotation.y = t * omega * 0.6
      points.rotation.x = Math.sin(t * omega * 0.25) * 0.12
      points.position.y = Math.sin(t * omega * 0.5) * 0.35
      renderer.render(scene, camera)
      raf = requestAnimationFrame(frame)
    }
    if (moving) raf = requestAnimationFrame(frame)
    else renderer.render(scene, camera) // static single frame for reduced motion

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [spec.colors, spec.speed, moving])
  return <div ref={hostRef} style={{ position: 'absolute', inset: 0 }} />
}
