import { useCallback, useEffect, useRef, useState, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Maximize, Minimize, MonitorSpeaker, StickyNote, Timer, X } from 'lucide-react'
import type { PresentationSpec } from '../../types'
import SlideRenderer from './SlideRenderer'
import { tokenFor } from './theme'
import { useDeckTheme } from './DeckThemeContext'
import { applyBrandKit, useBrandKit } from '../../context/BrandKitContext'
import { getSettings } from '../../lib/settings'
import { EASE_IN, EASE_OUT } from './animations'
import { SlidePresentationContext } from './slideContext'

interface Props {
  spec: PresentationSpec
  onExit: () => void
}

// Base slide design size. The active slide is scaled dynamically so it always
// COVERS the full viewport (no margins, no background bars visible) while
// content scales proportionally, exactly like PowerPoint/Google Slides.
// Design size of the fullscreen stage. 1280x720 (not 1920) keeps the
// text/element proportions close to the medium editor view — on a 1080p
// screen everything renders ~1.5x bigger instead of looking tiny.
const BASE_W = 1280
const BASE_H = 720

// Theme-aware transition energy, now sourced from the theme tokens so the
// renderer and the player share one source of truth:
// - calm:    subtle crossfade (minimal, luxury, apple, finance)
// - dynamic: directional slide (startup, neon, modern, glass, dark, google)
// - bold:    zoom + fade (medical, education, microsoft, corporate, openai)
type Energy = 'calm' | 'dynamic' | 'bold'

// Two persistent render slots. The current slide keeps its slot (so its
// element instances stay mounted), and on navigation we flip it to the
// "exiting" state in place — its elements play their dissolution — while the
// other slot mounts the incoming slide fresh. Because both are absolutely
// positioned over each other, the two choreographies OVERLAP instead of
// playing in sequence (the 100-150ms overlap window comes from the element
// base delay in AnimatedElement/MotionItem).
type SlotId = 'a' | 'b'
type Dir = 'forward' | 'backward'

interface Exiting {
  idx: number
  slot: SlotId
  dir: Dir
}

// Container choreography — subtle, because the real work is element-level.
// The outgoing slide dissolves in place while the incoming settles in.
function enterFrom(energy: Energy, dir: Dir) {
  switch (energy) {
    case 'calm':
      return { opacity: 0, scale: 0.995 }
    case 'bold':
      return { opacity: 0, scale: 0.95 }
    default:
      return { opacity: 0, x: dir === 'forward' ? 70 : -70, scale: 0.99 }
  }
}

function outgoingAnim(energy: Energy, dir: Dir) {
  switch (energy) {
    case 'calm':
      return { opacity: 0, scale: 1.01 }
    case 'bold':
      return { opacity: 0, scale: 1.06 }
    default:
      return { opacity: 0, x: dir === 'forward' ? -70 : 70, scale: 1.01 }
  }
}

const enterTrans = { duration: 0.6, ease: EASE_OUT }
const exitTrans = { duration: 0.5, ease: EASE_IN }
// Long enough for the last exiting element (max exit stagger 0.3 + 0.26) to
// finish before the slot is recycled.
const EXIT_WINDOW_MS = 700

// Cover-fit scale: grow the 16:9 slide so it fills every corner of the
// viewport, cropping only the excess (no letterboxing / visible background).
function coverScale(vw: number, vh: number) {
  return Math.max(vw / BASE_W, vh / BASE_H)
}

export default function FullscreenPlayer({ spec, onExit }: Props) {
  const prefersReduced = useReducedMotion()
  const animationsEnabled = getSettings().animationsEnabled && !prefersReduced
  const [index, setIndex] = useState(0)
  const [slot, setSlot] = useState<SlotId>('a')
  const [exiting, setExiting] = useState<Exiting | null>(null)
  const [direction, setDirection] = useState<Dir>('forward')
  const [isFs, setIsFs] = useState(false)
  const [presenter, setPresenter] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  // Rehearsal mode: records seconds spent per slide; timings drive auto-play.
  const [rehearseMode, setRehearseMode] = useState(false)
  const [timings, setTimings] = useState<number[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('slideai.rehearsal') || '[]')
      return Array.isArray(saved) ? saved : []
    } catch {
      return []
    }
  })
  const [autoPlaying, setAutoPlaying] = useState(false)
  const slideStartRef = useRef<number>(0)
  // Dual-screen presenter: the notes window listens on this channel.
  const sessionIdRef = useRef('')
  const channelRef = useRef<BroadcastChannel | null>(null)
  const [box, setBox] = useState({ w: window.innerWidth, h: window.innerHeight })
  const containerRef = useRef<HTMLDivElement>(null)
  const exitTimer = useRef<number>(undefined as unknown as number)
  const total = spec.slides.length

  const scale = coverScale(box.w, box.h)

  const go = useCallback(
    (next: number) => {
      if (next < 0 || next >= total || next === index) return
      const dir: Dir = next > index ? 'forward' : 'backward'
      setDirection(dir)
      const other: SlotId = slot === 'a' ? 'b' : 'a'
      if (animationsEnabled) {
        setExiting({ idx: index, slot, dir })
        setSlot(other)
        setIndex(next)
        window.clearTimeout(exitTimer.current)
        exitTimer.current = window.setTimeout(() => setExiting(null), EXIT_WINDOW_MS)
      } else {
        setExiting(null)
        setSlot(other)
        setIndex(next)
      }
    },
    [total, index, slot, animationsEnabled],
  )

  useEffect(() => () => window.clearTimeout(exitTimer.current), [])

  // Presenter timer: counts up from player mount.
  useEffect(() => {
    if (!presenter) return
    const id = window.setInterval(() => setElapsed((t) => t + 1), 1000)
    return () => window.clearInterval(id)
  }, [presenter])

  // Rehearsal: record seconds spent on the slide being left.
  useEffect(() => {
    slideStartRef.current = Date.now()
    if (!rehearseMode) return
    return () => {
      const secs = Math.round((Date.now() - slideStartRef.current) / 1000)
      setTimings((t) => {
        const n = [...t]
        n[index] = secs
        return n
      })
    }
  }, [index, rehearseMode])

  // Auto-advance using the recorded rehearsal timings.
  useEffect(() => {
    if (!autoPlaying) return
    if (index >= total - 1) {
      // Defer the state reset to a microtask — not synchronously in effect.
      const stop = window.setTimeout(() => setAutoPlaying(false), 0)
      return () => window.clearTimeout(stop)
    }
    const seconds = Math.max(1, timings[index] || 5)
    const id = window.setTimeout(() => go(index + 1), seconds * 1000)
    return () => window.clearTimeout(id)
  }, [autoPlaying, index, timings, go, total])

  // Dual-screen presenter: broadcast state to the notes window.
  useEffect(() => {
    if (!sessionIdRef.current) {
      sessionIdRef.current = Math.random().toString(36).slice(2)
    }
    const ch = new BroadcastChannel(`slideai-present-${sessionIdRef.current}`)
    channelRef.current = ch
    return () => ch.close()
  }, [])
  useEffect(() => {
    channelRef.current?.postMessage({
      type: 'state',
      index,
      total,
      elapsed,
      notes: spec.slides[index]?.notes || '',
      next: spec.slides[index + 1]?.elements.find((e) => e.text)?.text?.slice(0, 80) || '',
    })
  }, [index, elapsed, total, spec])

  const toggleRehearse = () => {
    setRehearseMode((v) => {
      if (v) {
        // Turning off → persist the recorded timings.
        try {
          localStorage.setItem('slideai.rehearsal', JSON.stringify(timings))
        } catch {
          /* storage unavailable */
        }
      } else {
        slideStartRef.current = Date.now()
        setAutoPlaying(false)
      }
      return !v
    })
  }

  const openNotesWindow = () => {
    window.open(`/present-notes?ch=${sessionIdRef.current}`, 'slideai-notes', 'width=430,height=660')
  }

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

  // Presenter panel toggle (P)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'p' || e.key === 'P') setPresenter((v) => !v)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

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

  // Live deck theme (in-sync with ThemeSwitcher edits) + user brand kit.
  const deck = useDeckTheme()
  const { brand } = useBrandKit()
  const tokens = applyBrandKit(deck?.tokens || tokenFor(spec.meta?.theme), brand)
  const energy: Energy = (tokens.energy as Energy) || 'dynamic'
  const progressPct = total ? ((index + 1) / total) * 100 : 0

  // One render slot per slide state. The exiting slide stays in its original
  // slot (instances preserved → real exit choreography), the incoming mounts
  // in the other slot. Both overlap during the window.
  const layer = (slotId: SlotId) => {
    const isExiting = exiting?.slot === slotId && exiting.idx !== index
    const slide = isExiting && exiting ? spec.slides[exiting.idx] : spec.slides[index]
    const active = !isExiting
    const dir = isExiting && exiting ? exiting.dir : direction
    const shown = isExiting || slotId === slot || (exiting?.slot === slotId && exiting.idx === index)

    if (!shown) return null

    const containerInitial = animationsEnabled ? enterFrom(energy, dir) : undefined
    const containerTarget = isExiting ? outgoingAnim(energy, dir) : { opacity: 1, x: 0, scale: 1 }
    const containerTrans = isExiting ? exitTrans : enterTrans

    return (
      <motion.div
        key={slotId}
        initial={containerInitial}
        animate={animationsEnabled ? containerTarget : undefined}
        transition={animationsEnabled ? containerTrans : { duration: 0 }}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: isExiting ? 2 : 1,
        }}
      >
        <div style={{ width: BASE_W * scale, height: BASE_H * scale, position: 'relative' }}>
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
              slide={slide}
              themeName={spec.meta?.theme}
              tokens={tokens}
              customAnimations={spec.meta?.customAnimations}
              active={active}
              presentation
            />
          </div>
        </div>
      </motion.div>
    )
  }

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
      {/* Slide stage — covers the entire viewport, slides are cover-scaled */}
      <SlidePresentationContext.Provider value={animationsEnabled}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflow: 'hidden',
          }}
        >
          {layer('a')}
          {layer('b')}
        </div>
      </SlidePresentationContext.Provider>

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
            onClick={toggleRehearse}
            title={rehearseMode ? 'Rehearsal ON — timings recorded (Timer, T)' : 'Rehearse: record time per slide'}
            style={{
              padding: 8,
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.12)',
              background: rehearseMode ? 'rgba(234,88,12,0.5)' : 'rgba(20,20,32,0.4)',
              backdropFilter: 'blur(8px)',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            <Timer size={16} />
          </button>
          <button
            onClick={openNotesWindow}
            title="Open dual-screen notes window"
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
            <MonitorSpeaker size={16} />
          </button>
          <button
            onClick={() => setPresenter((v) => !v)}
            title="Presenter view (P) — notes, timer, next slide"
            style={{
              padding: 8,
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.12)',
              background: presenter ? 'rgba(234,88,12,0.5)' : 'rgba(20,20,32,0.4)',
              backdropFilter: 'blur(8px)',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            <StickyNote size={16} />
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

        {/* Presenter overlay: notes + timer + next slide. */}
        {presenter && (
          <div
            style={{
              position: 'absolute',
              right: 16,
              bottom: 64,
              width: 'min(360px, 80vw)',
              maxHeight: '60%',
              overflow: 'auto',
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'rgba(12,12,20,0.88)',
              backdropFilter: 'blur(10px)',
              color: '#fff',
              padding: 16,
              zIndex: 60,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <strong style={{ fontSize: 13, opacity: 0.85 }}>
                Slide {index + 1} / {total}
              </strong>
              <strong style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums', opacity: 0.85 }}>
                {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
              </strong>
            </div>
            {index < total - 1 && spec.slides[index + 1]?.elements.some((e) => e.text) && (
              <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 10 }}>
                Next: {spec.slides[index + 1].elements.find((e) => e.text)?.text?.slice(0, 60)}
              </div>
            )}
            {rehearseMode && (
              <div style={{ fontSize: 12, marginBottom: 10, padding: '6px 8px', borderRadius: 8, background: 'rgba(234,88,12,0.15)' }}>
                Rehearsal recording — time per slide is being tracked.
                <button
                  onClick={() => setAutoPlaying((v) => !v)}
                  style={{
                    display: 'block',
                    marginTop: 6,
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: 'none',
                    background: autoPlaying ? 'rgba(255,255,255,0.25)' : 'rgba(234,88,12,0.8)',
                    color: '#fff',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  {autoPlaying ? 'Stop auto-play' : 'Play with recorded timings'}
                </button>
              </div>
            )}
            <div style={{ fontSize: 14, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
              {spec.slides[index]?.notes || 'No speaker notes on this slide.'}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
