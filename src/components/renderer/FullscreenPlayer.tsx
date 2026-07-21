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

export default function FullscreenPlayer({ spec, onExit }: Props) {
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  const [isFs, setIsFs] = useState(false)
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

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {})
    } else {
      document.exitFullscreen?.().catch(() => {})
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

  const controlBtnClass = (disabled: boolean) =>
    `p-2 rounded-lg border transition-colors ${
      disabled
        ? 'border-border text-text-dim cursor-default pointer-events-none'
        : 'border-border text-text hover:text-accent hover:border-accent cursor-pointer'
    }`

  return (
    <div
      ref={containerRef}
      onClick={onPointer}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className="fixed inset-0 z-[5000] flex flex-col select-none cursor-pointer"
      style={{ background: tokens.bg }}
    >
      {/* Slide stage */}
      <div className="flex-1 flex items-center justify-center p-[clamp(16px,3vw,48px)] min-h-0 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={index}
            custom={direction}
            variants={slideVariants[direction]}
            transition={slideTransition}
            className="w-full flex items-center justify-center"
            style={{ maxWidth: 'min(1100px, 92vw)', height: '100%' }}
          >
            <SlideRenderer
              slide={spec.slides[index]}
              themeName={spec.meta?.theme}
              tokens={tokens}
              active
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls overlay */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex items-center justify-between gap-3 px-5 py-3"
        style={{ color: tokens.textMuted }}
      >
        <button
          onClick={goPrev}
          disabled={index === 0}
          className={controlBtnClass(index === 0)}
        >
          <ChevronLeft size={18} />
        </button>

        <div className="flex-1 flex items-center gap-3">
          <span className="text-xs tabular-nums whitespace-nowrap" style={{ color: tokens.textMuted }}>
            {total ? `${index + 1} / ${total}` : '0 / 0'}
          </span>
          <div
            className="flex-1 h-1 rounded-full overflow-hidden"
            style={{ background: tokens.surface2 }}
          >
            <div
              className="h-full rounded-full transition-[width] duration-300 ease-out"
              style={{
                width: `${progressPct}%`,
                background: `linear-gradient(90deg, ${tokens.accent}, ${tokens.accent2})`,
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={toggleFullscreen}
            title="Fullscreen (F)"
            className="p-2 rounded-lg border border-border cursor-pointer transition-colors hover:text-accent"
            style={{ color: tokens.textMuted }}
          >
            {isFs ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
          <button
            onClick={onExit}
            title="Exit (Esc)"
            className="p-2 rounded-lg border border-border cursor-pointer transition-colors hover:text-accent"
            style={{ color: tokens.textMuted }}
          >
            <X size={18} />
          </button>
          <button
            onClick={goNext}
            disabled={index >= total - 1}
            className={controlBtnClass(index >= total - 1)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}