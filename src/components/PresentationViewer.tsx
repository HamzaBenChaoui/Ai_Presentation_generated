import { useEffect, useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import { generationApi, ApiClientError } from '../lib/api'
import type { Presentation, Slide } from '../types'

interface Props {
  presentation: Presentation | null
  onClose: () => void
}

// Gradient backgrounds keyed by theme name (mirrors PRESENTATION_THEMES).
const THEME_GRADIENTS: Record<string, string> = {
  Void: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
  Bright: 'linear-gradient(135deg, #f8f9ff 0%, #e8eaf6 100%)',
  Ocean: 'linear-gradient(135deg, #0d3b66 0%, #1b6ca8 100%)',
  Sunset: 'linear-gradient(135deg, #ff6b35 0%, #f7c59f 100%)',
  Forest: 'linear-gradient(135deg, #1a3c34 0%, #2d6a4f 100%)',
}

function themeGradient(p: Presentation | null): string {
  if (p?.theme && THEME_GRADIENTS[p.theme]) return THEME_GRADIENTS[p.theme]
  return 'linear-gradient(135deg, #7c6aff 0%, #a89fff 100%)'
}

export default function PresentationViewer({ presentation, onClose }: Props) {
  const { colors, mode } = useTheme()
  const [slides, setSlides] = useState<Slide[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!presentation) return
    setIndex(0)
    setError(null)
    setLoading(true)
    generationApi
      .slides(presentation.id)
      .then((data) => setSlides(data))
      .catch((err) =>
        setError(err instanceof ApiClientError ? err.message : 'Failed to load slides'),
      )
      .finally(() => setLoading(false))
  }, [presentation])

  // Close on Escape.
  useEffect(() => {
    if (!presentation) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, Math.max(0, slides.length - 1)))
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [presentation, slides.length, onClose])

  if (!presentation) return null

  const current = slides[index]
  const bg = themeGradient(presentation)
  const isDarkBg = !presentation.theme || presentation.theme === 'Void' || presentation.theme === 'Ocean' || presentation.theme === 'Forest' || presentation.theme === 'Sunset'

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(6,6,16,0.82)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex: 4000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '960px',
          height: 'min(86vh, 620px)',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '18px',
          overflow: 'hidden',
          boxShadow: '0 30px 90px rgba(0,0,0,0.5)',
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 22px',
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Presentation
            </div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: colors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {presentation.title}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMuted, borderRadius: '10px', width: '34px', height: '34px', cursor: 'pointer', fontSize: '18px', flexShrink: 0 }}
          >
            ×
          </button>
        </div>

        {/* Slide stage */}
        <div style={{ flex: 1, padding: '28px', display: 'flex', alignItems: 'stretch', minHeight: 0 }}>
          {loading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted, fontSize: '14px' }}>
              Loading slides…
            </div>
          ) : error ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff6b81', fontSize: '14px', textAlign: 'center', padding: '20px' }}>
              {error}
            </div>
          ) : !current ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted, fontSize: '14px' }}>
              No slides yet.
            </div>
          ) : (
            <div
              style={{
                flex: 1,
                borderRadius: '14px',
                background: bg,
                color: isDarkBg ? '#ffffff' : '#1a1a2e',
                padding: '44px 52px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <h2 style={{ fontSize: '34px', fontWeight: 800, fontFamily: 'Syne, sans-serif', margin: '0 0 28px', lineHeight: 1.15 }}>
                {current.title}
              </h2>
              <ul style={{ margin: 0, paddingLeft: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {current.bullets.map((b, i) => (
                  <li key={i} style={{ fontSize: '18px', lineHeight: 1.5 }}>
                    {b}
                  </li>
                ))}
              </ul>
              {current.notes && (
                <p style={{ marginTop: '28px', fontSize: '13px', opacity: 0.7, fontStyle: 'italic' }}>
                  {current.notes}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer / controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 22px',
            borderTop: `1px solid ${colors.border}`,
          }}
        >
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            style={{
              padding: '9px 16px',
              borderRadius: '10px',
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              color: index === 0 ? colors.textDim : colors.text,
              cursor: index === 0 ? 'default' : 'pointer',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            ← Prev
          </button>
          <div style={{ fontSize: '13px', color: colors.textMuted }}>
            {slides.length === 0 ? '0 / 0' : `${index + 1} / ${slides.length}`}
          </div>
          <button
            onClick={() => setIndex((i) => Math.min(i + 1, Math.max(0, slides.length - 1)))}
            disabled={index >= slides.length - 1}
            style={{
              padding: '9px 16px',
              borderRadius: '10px',
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              color: index >= slides.length - 1 ? colors.textDim : colors.text,
              cursor: index >= slides.length - 1 ? 'default' : 'pointer',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  )
}
