import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, type Variants } from 'framer-motion'
import { ChevronLeft, ChevronRight, Maximize, Minimize, X } from 'lucide-react'
import type { PresentationSpec } from '../../types'
import SlideRenderer from './SlideRenderer'
import { tokenFor } from './theme'

interface Props {
  spec: PresentationSpec
  onExit: () => void
}

// Base slide design size. The active slide is scaled dynamically so it always
// COVERS the full viewport (no margins, no background bars visible) while
// content scales proportionally, exactly like PowerPoint/Google Slides.
const BASE_W = 1920
const BASE_H = 1080

// Direction-aware slide transitions
const slideVariants: Record<string, Variants> = {
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
  const [scale, setScale] = useState(() =>
    coverScale(window.innerWidth, window.innerHeight),
  )
  const containerRef = useRef<HTMLDivElement>(null)
  const total = spec.slides.length

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

  // Track viewport size (native fullscreen changes it too) and recompute the
  // cover scale so the slide always fills the whole screen.
  useEffect(() => {
    const recompute = () => setScale(coverScale(window.innerWidth, window.innerHeight))
    window.addEventListener('resize', recompute)
    document.addEventListener('fullscreenchange', recompute)
    return () => {
      window.removeEventListener('resize', recompute)
      document.removeEventListener('fullscreenchange', recompute)
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

  return (
    <div
      ref={containerRef}
      onClick={onPointer}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className="fixed inset-0 z-[5000] w-screen h-screen overflow-hidden select-none cursor-pointer bg-bg"
    >
      {/* Slide stage — covers the entire viewport, slide is cover-scaled */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={index}
            custom={direction}
            variants={slideVariants[direction]}
            transition={slideTransition}
            style={{ width: BASE_W * scale, height: BASE_H * scale }}
          >
            <div
              style={{
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
        className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 px-5 py-3 bg-gradient-to-t from-black/60 to-transparent text-text-dim"
      >
        <button
          onClick={goPrev}
          disabled={index === 0}
          className={`p-2 rounded-lg border transition-colors bg-surface/40 backdrop-blur-sm ${
            index === 0
              ? 'border-border text-text-dim cursor-default pointer-events-none'
              : 'border-border text-text hover:text-accent hover:border-accent cursor-pointer'
          }`}
        >
          <ChevronLeft size={18} />
        </button>

        <div className="flex-1 flex items-center gap-3">
          <span className="text-xs tabular-nums whitespace-nowrap text-white/80">
            {total ? `${index + 1} / ${total}` : '0 / 0'}
          </span>
          <div className="flex-1 h-1 rounded-full overflow-hidden bg-white/20">
            <div
              className="h-full rounded-full transition-[width] duration-300 ease-out bg-gradient-to-r from-accent to-accent2"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={toggleFullscreen}
            title="Fullscreen (F)"
            className="p-2 rounded-lg border border-border bg-surface/40 backdrop-blur-sm text-text cursor-pointer transition-colors hover:text-accent hover:border-accent"
          >
            {isFs ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
          <button
            onClick={onExit}
            title="Exit (Esc)"
            className="p-2 rounded-lg border border-border bg-surface/40 backdrop-blur-sm text-text cursor-pointer transition-colors hover:text-accent hover:border-accent"
          >
            <X size={18} />
          </button>
          <button
            onClick={goNext}
            disabled={index >= total - 1}
            className={`p-2 rounded-lg border transition-colors bg-surface/40 backdrop-blur-sm ${
              index >= total - 1
                ? 'border-border text-text-dim cursor-default pointer-events-none'
                : 'border-border text-text hover:text-accent hover:border-accent cursor-pointer'
            }`}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
