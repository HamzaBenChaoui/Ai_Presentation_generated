import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { PresentationSpec } from '../../types'
import SlideRenderer from './SlideRenderer'
import { tokenFor } from './theme'

interface Props {
  spec: PresentationSpec
  onExit: () => void
}

// Fullscreen presentation player. One slide at a time, no browser chrome,
// no scrolling. Navigation: Arrow keys / PageUp-Down / Space / click left-right
// thirds, touch swipe, ESC to exit. Presenter-mode architecture is prepared
// via the `notes` hook (future overlay) without changing the rendering path.
export default function FullscreenPlayer({ spec, onExit }: Props) {
  const [index, setIndex] = useState(0)
  const [isFs, setIsFs] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const total = spec.slides.length

  const go = useCallback(
    (next: number) => setIndex(() => Math.max(0, Math.min(next, total - 1))),
    [total],
  )

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {})
    } else {
      document.exitFullscreen?.().catch(() => {})
    }
  }, [])

  // Track native fullscreen state (ESC from browser also exits).
  useEffect(() => {
    const onFsChange = () => setIsFs(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  // Keyboard navigation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onExit()
        return
      }
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault()
        go(index + 1)
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        go(index - 1)
      } else if (e.key.toLowerCase() === 'f') {
        toggleFullscreen()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, go, onExit, toggleFullscreen])

  // Click / touch zones (left third = prev, right two thirds = next).
  const onPointer = (e: React.MouseEvent) => {
    const x = e.clientX / window.innerWidth
    if (x < 0.33) go(index - 1)
    else go(index + 1)
  }

  const onTouch = (e: React.TouchEvent) => {
    const t = e.changedTouches[0]
    if (!t) return
    const startX = (e as any)._startX ?? t.clientX
    if (Math.abs(t.clientX - startX) > 50) {
      go(t.clientX < startX ? index + 1 : index - 1)
    }
    ;(e as any)._startX = undefined
  }
  const onTouchStart = (e: React.TouchEvent) => {
    ;(e as any)._startX = e.changedTouches[0]?.clientX
  }

  const tokens = tokenFor(spec.meta?.theme)

  return (
    <div
      ref={containerRef}
      onClick={onPointer}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouch}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 5000,
        background: tokens.bg,
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
        cursor: 'pointer',
      }}
    >
      {/* Slide stage */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(16px, 3vw, 48px)', minHeight: 0, overflow: 'hidden' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            style={{ width: '100%', maxWidth: 'min(1100px, 92vw)', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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

      {/* Controls overlay (non-blocking except buttons) */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '12px 22px', color: tokens.textMuted, fontSize: 13 }}
      >
        <button
          onClick={() => go(index - 1)}
          disabled={index === 0}
          style={{ pointerEvents: index === 0 ? 'none' : 'auto', background: 'transparent', border: `1px solid ${tokens.border}`, color: index === 0 ? tokens.textDim : tokens.text, borderRadius: 10, padding: '8px 14px', cursor: index === 0 ? 'default' : 'pointer', fontSize: 14, fontWeight: 600 }}
        >
          ←
        </button>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
            {total ? `${index + 1} / ${total}` : '0 / 0'}
          </span>
          <span style={{ flex: 1, height: 4, borderRadius: 2, background: tokens.surface2, overflow: 'hidden', display: 'block' }}>
            <span style={{ display: 'block', height: '100%', width: total ? `${((index + 1) / total) * 100}%` : '0%', background: `linear-gradient(90deg, ${tokens.accent}, ${tokens.accent2})`, transition: 'width 0.3s ease' }} />
          </span>
        </div>

        <button
          onClick={() => go(index + 1)}
          disabled={index >= total - 1}
          style={{ pointerEvents: index >= total - 1 ? 'none' : 'auto', background: 'transparent', border: `1px solid ${tokens.border}`, color: index >= total - 1 ? tokens.textDim : tokens.text, borderRadius: 10, padding: '8px 14px', cursor: index >= total - 1 ? 'default' : 'pointer', fontSize: 14, fontWeight: 600 }}
        >
          →
        </button>
        <button
          onClick={toggleFullscreen}
          title="Fullscreen (F)"
          style={{ background: 'transparent', border: `1px solid ${tokens.border}`, color: tokens.textMuted, borderRadius: 10, width: 34, height: 34, cursor: 'pointer', fontSize: 15 }}
        >
          {isFs ? '⤢' : '⛶'}
        </button>
        <button
          onClick={onExit}
          title="Exit (Esc)"
          style={{ background: 'transparent', border: `1px solid ${tokens.border}`, color: tokens.textMuted, borderRadius: 10, width: 34, height: 34, cursor: 'pointer', fontSize: 18 }}
        >
          ×
        </button>
      </div>
    </div>
  )
}
