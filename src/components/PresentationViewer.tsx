import { useEffect, useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import { specApi, ApiClientError } from '../lib/api'
import type { Presentation, PresentationSpec } from '../types'
import PresentationRenderer from './renderer/PresentationRenderer'

interface Props {
  presentation: Presentation | null
  onClose: () => void
}

export default function PresentationViewer({ presentation, onClose }: Props) {
  const { colors } = useTheme()
  const [spec, setSpec] = useState<PresentationSpec | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!presentation) return
    setIndex(0)
    setError(null)
    setSpec(null)
    setLoading(true)
    specApi
      .get(presentation.id)
      .then((data) => setSpec(data))
      .catch((err) =>
        setError(err instanceof ApiClientError ? err.message : 'Failed to load presentation'),
      )
      .finally(() => setLoading(false))
  }, [presentation])

  // Keyboard navigation (Phase 10 will also bind these in fullscreen).
  useEffect(() => {
    if (!presentation) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' || e.key === 'PageDown') setIndex((i) => Math.min(i + 1, Math.max(0, (spec?.slides.length || 1) - 1)))
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') setIndex((i) => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [presentation, spec, onClose])

  if (!presentation) return null

  const total = spec?.slides.length || 0

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(6,6,16,0.86)',
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
          maxWidth: '1100px',
          height: 'min(90vh, 720px)',
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
        <div style={{ flex: 1, padding: '24px', overflow: 'auto', minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {loading ? (
            <div style={{ color: colors.textMuted, fontSize: '14px' }}>Loading presentation…</div>
          ) : error ? (
            <div style={{ color: '#ff6b81', fontSize: '14px', textAlign: 'center', padding: '20px' }}>{error}</div>
          ) : !spec ? (
            <div style={{ color: colors.textMuted, fontSize: '14px' }}>No content.</div>
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SlideStage spec={spec} index={index} />
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
            style={{ padding: '9px 16px', borderRadius: '10px', border: `1px solid ${colors.border}`, background: 'transparent', color: index === 0 ? colors.textDim : colors.text, cursor: index === 0 ? 'default' : 'pointer', fontSize: '14px', fontWeight: 600 }}
          >
            ← Prev
          </button>
          <div style={{ fontSize: '13px', color: colors.textMuted, display: 'flex', alignItems: 'center', gap: '12px' }}>
            {total === 0 ? '0 / 0' : `${index + 1} / ${total}`}
            <span style={{ width: '120px', height: '4px', borderRadius: '2px', background: colors.surface2, overflow: 'hidden' }}>
              <span style={{ display: 'block', height: '100%', width: total ? `${((index + 1) / total) * 100}%` : '0%', background: `linear-gradient(90deg, ${colors.accent}, ${colors.accent2})` }} />
            </span>
          </div>
          <button
            onClick={() => setIndex((i) => Math.min(i + 1, Math.max(0, total - 1)))}
            disabled={index >= total - 1}
            style={{ padding: '9px 16px', borderRadius: '10px', border: `1px solid ${colors.border}`, background: 'transparent', color: index >= total - 1 ? colors.textDim : colors.text, cursor: index >= total - 1 ? 'default' : 'pointer', fontSize: '14px', fontWeight: 600 }}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  )
}

// Renders a single active slide centered (16:9). The full PresentationSpec
// renderer is reused; only the active slide is shown here.
function SlideStage({ spec, index }: { spec: PresentationSpec; index: number }) {
  const slide = spec.slides[index]
  if (!slide) return null
  return (
    <div style={{ width: '100%', maxWidth: '960px' }}>
      <PresentationRenderer spec={{ meta: spec.meta, slides: [slide] }} />
    </div>
  )
}
