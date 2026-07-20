import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTheme } from '../context/ThemeContext'
import { specApi, ApiClientError } from '../lib/api'
import type { Presentation, PresentationSpec } from '../types'
import PresentationRenderer from './renderer/PresentationRenderer'
import FullscreenPlayer from './renderer/FullscreenPlayer'
import { DeckThemeProvider } from './renderer/DeckThemeContext'
import ThemeSwitcher from './renderer/ThemeSwitcher'
import { EditorProvider, useEditor } from './editor/EditorContext'

// Reads live spec from editor context. Only rendered inside EditorProvider.
function EditorSlideStage({ index }: { index: number }) {
  const { spec } = useEditor()
  if (!spec) return null
  return <SlideStage spec={spec} index={index} />
}
import type { ThemeName } from './renderer/theme'
import { exportApi, type ExportFormat } from '../lib/api'

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
  const [presenting, setPresenting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [exporting, setExporting] = useState<ExportFormat | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  useEffect(() => {
    if (!presentation) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIndex(0)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSpec(null)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    specApi
      .get(presentation.id)
      .then((data) => setSpec(data))
      .catch((err) =>
        setError(err instanceof ApiClientError ? err.message : 'Failed to load presentation'),
      )
      .finally(() => setLoading(false))
  }, [presentation])

  // Keyboard navigation. Phase 10 will extend this for fullscreen mode.
  useEffect(() => {
    if (!presentation) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault()
        setIndex((i) => Math.min(i + 1, Math.max(0, (spec?.slides.length || 1) - 1)))
      }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') setIndex((i) => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [presentation, spec, onClose])

  const handleExport = async (fmt: ExportFormat) => {
    if (!presentation) return
    setExporting(fmt)
    setExportError(null)
    try {
      await exportApi.download(presentation.id, fmt)
    } catch (err) {
      setExportError(err instanceof ApiClientError ? err.message : "Export failed")
    } finally {
      setExporting(null)
      setExportOpen(false)
    }
  }

  if (!presentation) return null

  // When editing is on and spec is loaded, wrap the stage in EditorProvider
  // so the editor manages spec state (auto-save, undo/redo, etc.)
  const EditorStage = editing && spec ? (
    <EditorProvider presentationId={presentation.id}>
      <EditorSlideStage index={index} />
    </EditorProvider>
  ) : null

  const total = spec?.slides.length || 0

  const main = (
    <DeckThemeProvider initial={(spec?.meta?.theme as ThemeName) || 'modern'}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {spec && <ThemeSwitcher />}
            <button
              onClick={() => setEditing((e) => !e)}
              disabled={!spec}
              title="Toggle editor"
              style={{ padding: '8px 14px', borderRadius: '10px', border: `1px solid ${editing ? colors.accent : colors.border}`, background: editing ? `${colors.accent}22` : 'transparent', color: colors.text, cursor: spec ? 'pointer' : 'default', fontSize: '14px', fontWeight: 600, opacity: spec ? 1 : 0.5 }}
            >
              {editing ? '✏️ Editing' : '✏️ Edit'}
            </button>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setExportOpen((o) => !o)}
                disabled={!spec}
                title="Export presentation"
                style={{ padding: '8px 14px', borderRadius: '10px', border: `1px solid ${colors.border}`, background: 'transparent', color: colors.text, cursor: spec ? 'pointer' : 'default', fontSize: '14px', fontWeight: 600, opacity: spec ? 1 : 0.5, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                ⬇ Export
              </button>
              {exportOpen && (
                <div
                  onClick={() => setExportOpen(false)}
                  style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 60, width: 200, background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 6, display: 'grid', gap: 4, boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}
                >
                  {([
                    { fmt: 'html', label: 'HTML (animated)', hint: 'Keeps animations' },
                    { fmt: 'pdf', label: 'PDF (static)', hint: 'Print-ready' },
                    { fmt: 'pptx', label: 'PowerPoint', hint: 'Content only' },
                  ] as { fmt: ExportFormat; label: string; hint: string }[]).map((opt) => (
                    <button
                      key={opt.fmt}
                      onClick={(e) => { e.stopPropagation(); handleExport(opt.fmt) }}
                      disabled={exporting !== null}
                      style={{ textAlign: 'left', padding: '9px 12px', borderRadius: 9, cursor: exporting ? 'default' : 'pointer', border: '1px solid transparent', background: 'transparent', color: colors.text, display: 'flex', flexDirection: 'column' }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{exporting === opt.fmt ? 'Exporting…' : opt.label}</span>
                      <span style={{ fontSize: 11, color: colors.textMuted }}>{opt.hint}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => spec && setPresenting(true)}
              disabled={!spec}
              title="Present (fullscreen)"
              style={{ padding: '8px 16px', borderRadius: '10px', border: `1px solid ${colors.border}`, background: 'transparent', color: colors.text, cursor: spec ? 'pointer' : 'default', fontSize: '14px', fontWeight: 600, opacity: spec ? 1 : 0.5 }}
            >
              ▶ Present
            </button>
            <button
              onClick={onClose}
              style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMuted, borderRadius: '10px', width: '34px', height: '34px', cursor: 'pointer', fontSize: '18px', flexShrink: 0 }}
            >
              ×
            </button>
          </div>
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
              <AnimatePresence mode="wait">
                {EditorStage || <SlideStage key={index} spec={spec} index={index} />}
              </AnimatePresence>
            </div>
          )}
        </div>

        {exportError && (
          <div style={{ padding: '8px 22px', color: '#ff6b81', fontSize: '13px', textAlign: 'center', borderTop: `1px solid ${colors.border}` }}>
            {exportError}
          </div>
        )}

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
    </DeckThemeProvider>
  )

  if (presenting && spec) {
    return <FullscreenPlayer spec={spec} onExit={() => setPresenting(false)} />
  }

  return main
}

// Renders a single active slide centered (16:9). The full PresentationSpec
// renderer is reused; only the active slide is shown here.
function SlideStage({ spec, index }: { spec: PresentationSpec; index: number }) {
  const slide = spec.slides[index]
  if (!slide) return null
  return (
    <motion.div
      key={index}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      style={{ width: '100%', maxWidth: '960px' }}
    >
      <PresentationRenderer spec={{ meta: spec.meta, slides: [slide] }} />
    </motion.div>
  )
}
