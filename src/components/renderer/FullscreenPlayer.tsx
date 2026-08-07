import { useCallback, useEffect, useRef, useState, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, type Variants } from 'framer-motion'
import { ChevronLeft, ChevronRight, Maximize, Minimize, X } from 'lucide-react'
import type { PresentationSpec } from '../../types'
import SlideRenderer from './SlideRenderer'
import { tokenFor } from './theme'
import { getSettings } from '../../lib/settings'

interface Props {
  spec: PresentationSpec
  onExit: () => void
}

// Base slide design size. The active slide is scaled dynamically so it always
// COVERS the full viewport (no margins, no background bars visible) while
// content scales proportionally, exactly like PowerPoint/Google Slides.
const BASE_W = 1920
const BASE_H = 1080

// Theme-aware transition styles. Each theme picks one of these "energies":
// - calm:    subtle fade (minimal, luxury, apple, finance)
// - dynamic: horizontal slide (startup, neon, modern, glass, dark, google)
// - bold:    zoom + fade (medical, education, microsoft, corporate, openai)
// The variants are direction-aware so backward/forward navigation feels right.
type Energy = 'calm' | 'dynamic' | 'bold'

const THEME_ENERGY: Record<string, Energy> = {
  minimal: 'calm',
  luxury: 'calm',
  apple: 'calm',
  finance: 'calm',
  corporate: 'bold',
  education: 'bold',
  medical: 'bold',
  microsoft: 'bold',
  openai: 'bold',
  startup: 'dynamic',
  neon: 'dynamic',
  modern: 'dynamic',
  glass: 'dynamic',
  dark: 'dynamic',
  google: 'dynamic',
}

function variantsFor(energy: Energy): Record<'forward' | 'backward', Variants> {
  if (energy === 'calm') {
    return {
      forward: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      },
      backward: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      },
    }
  }
  if (energy === 'bold') {
    return {
      forward: {
        initial: { opacity: 0, scale: 0.92 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 1.06 },
      },
      backward: {
        initial: { opacity: 0, scale: 1.06 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.92 },
      },
    }
  }
  // dynamic
  return {
    forward: {
      initial: { opacity: 0, x: 120, scale: 0.96 },
      animate: { opacity: 1, x: 0, scale: 1 },
      exit: { opacity: 0, x: -120, scale: 0.96 },
    },
    backward: {
      initial: { opacity: 0, x: -120, scale: 0.96 },
      animate: { opacity: 1, x: 0, scale: 1 },
      exit: { opacity: 0, x: 120, scale: 0.96 },
    },
  }
}

const slideTransition = { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }

// Cover-fit scale: grow the 16:9 slide so it fills every corner of the
// viewport, cropping only the excess (no letterboxing / visible background).
function coverScale(vw: number, vh: number) {
  return Math.max(vw / BASE_W, vh / BASE_H)
}

export default function FullscreenPlayer({ spec, onExit }: Props) {
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  const [isFs, setIsFs] = useState(false)
  const [box, setBox] = useState({ w: window.innerWidth, h: window.innerHeight })
  const containerRef = useRef<HTMLDivElement>(null)
  const total = spec.slides.length

  const scale = coverScale(box.w, box.h)

  const go = useCallback(
    (next: number) => {
      if (next < 0 || next >= total) return
      setDirection(next > index ? 'forward' : 'backward')
      setIndex(next)
    },
    [total, index],
  )

  const goNext = useCallback(() => go(index + 1), [go, index])
  const goPrev = useCallback(() => go(index - 1), [go, index])

  // Track the container size precisely (covers fullscreen enter/exit and
  // window resizes). useLayoutEffect so we measure before paint, avoiding a
  // brief wrong-size flash when the player mounts or fullscreen toggles.
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {})
    } else {
      document.exitFullscreen?.().catch(() => {})
    }
  }, [])

  // Auto-enter native fullscreen when Present is clicked. The fullscreen
  // element is this player container itself (slide + controls only — never the
  // app sidebar/toolbar), so the API fills the physical screen with the slide.
  useEffect(() => {
    const el = containerRef.current
    if (el && !document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {})
    }
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {})
      }
    }
  }, [])

  // Track native fullscreen state
  useEffect(() => {
    const onFsChange = () => setIsFs(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  // Prevent vertical scroll
  useEffect(() => {
    const prevent = (e: WheelEvent) => e.preventDefault()
    document.addEventListener('wheel', prevent, { passive: false })
    return () => document.removeEventListener('wheel', prevent)
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't capture when focused on inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          onExit()
          break
        case 'ArrowRight':
        case 'PageDown':
        case ' ':
          e.preventDefault()
          goNext()
          break
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault()
          goPrev()
          break
        case 'Home':
          e.preventDefault()
          go(0)
          break
        case 'End':
          e.preventDefault()
          go(total - 1)
          break
        case 'f':
        case 'F':
          e.preventDefault()
          toggleFullscreen()
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, total, goNext, goPrev, go, onExit, toggleFullscreen])

  // Touch swipe
  const touchStartX = useRef<number | null>(null)

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0]?.clientX ?? null
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current
    touchStartX.current = null
    if (Math.abs(dx) > 50) {
      dx < 0 ? goNext() : goPrev()
    }
  }

  const onPointer = (e: React.MouseEvent) => {
    const x = e.clientX / window.innerWidth
    if (x < 0.33) goPrev()
    else goNext()
  }

  const tokens = tokenFor(spec.meta?.theme)
  const progressPct = total ? ((index + 1) / total) * 100 : 0
  const animationsEnabled = getSettings().animationsEnabled
  const energy: Energy = THEME_ENERGY[spec.meta?.theme || ''] || 'dynamic'
  const slideVariants = variantsFor(energy)
  const transition = animationsEnabled
    ? slideTransition
    : { duration: 0 }

  // Render through a portal at document.body so ancestor transforms (e.g.
  // framer-motion motion divs, SpotlightCard, AnimatePresence in the editor)
  // can't break `position: fixed`. The player becomes truly viewport-anchored.
  return createPortal(
    <div
      ref={containerRef}
      onClick={onPointer}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 2147483647, // max int — always on top
        overflow: 'hidden',
        background: tokens.bg,
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      {/* Slide stage — covers the entire viewport, slide is cover-scaled */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={index}
            custom={direction}
            variants={
              animationsEnabled
                ? slideVariants[direction]
                : { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
            }
            transition={transition}
            style={{ width: BASE_W * scale, height: BASE_H * scale, position: 'relative' }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: BASE_W,
                height: BASE_H,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
              }}
            >
              <SlideRenderer
                slide={spec.slides[index]}
                themeName={spec.meta?.theme}
                tokens={tokens}
                active
                presentation
              />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls overlay — floats above the slide, never steals layout space */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 20px',
          background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
          color: '#a0a0c0',
        }}
      >
        <button
          onClick={goPrev}
          disabled={index === 0}
          style={{
            padding: 8,
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(20,20,32,0.4)',
            backdropFilter: 'blur(8px)',
            color: index === 0 ? '#6b6b8a' : '#fff',
            cursor: index === 0 ? 'default' : 'pointer',
            pointerEvents: index === 0 ? 'none' : 'auto',
          }}
        >
          <ChevronLeft size={18} />
        </button>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.8)' }}>
            {total ? `${index + 1} / ${total}` : '0 / 0'}
          </span>
          <div style={{ flex: 1, height: 4, borderRadius: 2, overflow: 'hidden', background: 'rgba(255,255,255,0.2)' }}>
            <div
              style={{
                height: '100%',
                width: `${progressPct}%`,
                background: `linear-gradient(90deg, ${tokens.accent}, ${tokens.accent2})`,
                transition: 'width 0.3s ease-out',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            onClick={toggleFullscreen}
            title="Fullscreen (F)"
            style={{
              padding: 8,
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(20,20,32,0.4)',
              backdropFilter: 'blur(8px)',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            {isFs ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
          <button
            onClick={onExit}
            title="Exit (Esc)"
            style={{
              padding: 8,
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(20,20,32,0.4)',
              backdropFilter: 'blur(8px)',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
          <button
            onClick={goNext}
            disabled={index >= total - 1}
            style={{
              padding: 8,
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(20,20,32,0.4)',
              backdropFilter: 'blur(8px)',
              color: index >= total - 1 ? '#6b6b8a' : '#fff',
              cursor: index >= total - 1 ? 'default' : 'pointer',
              pointerEvents: index >= total - 1 ? 'none' : 'auto',
            }}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
