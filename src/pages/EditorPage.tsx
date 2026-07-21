import {
  useState,
  useEffect,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Pencil,
  Palette,
  Download,
  Play,
  Share2,
} from 'lucide-react'
import { specApi, exportApi, ApiClientError, type ExportFormat } from '../lib/api'
import type { PresentationSpec } from '../types'
import type { ThemeName } from '../components/renderer/theme'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { useToast } from '../components/ui/Toast'
import { EditorProvider, useEditor } from '../components/editor/EditorContext'
import { useEditorShortcuts } from '../components/editor/useEditorShortcuts'
import AiEditorPanel from '../components/ai/AiEditorPanel'
import HistoryPanel from '../components/editor/HistoryPanel'
import ThemeSwitcher from '../components/renderer/ThemeSwitcher'
import PresentationRenderer from '../components/renderer/PresentationRenderer'
import FullscreenPlayer from '../components/renderer/FullscreenPlayer'
import { DeckThemeProvider } from '../components/renderer/DeckThemeContext'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type InspectorTab = 'theme' | 'ai' | 'history'

export interface EditorBridgeHandle {
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  forceSave: () => void
}

// ---------------------------------------------------------------------------
// EditorBridge: lives inside EditorProvider and exposes undo/redo to the
// parent page via a ref so the toolbar can control them.
// ---------------------------------------------------------------------------

const EditorBridge = forwardRef<EditorBridgeHandle>(function EditorBridge(_props, ref) {
  const { undo, redo, canUndo, canRedo, forceSave } = useEditor()
  useEditorShortcuts()

  useImperativeHandle(ref, () => ({
    undo,
    redo,
    canUndo,
    canRedo,
    forceSave,
  }), [undo, redo, canUndo, canRedo, forceSave])

  return null
})

// ---------------------------------------------------------------------------
// HistoryWrapper: bridges HistoryPanel restore to EditorContext
// ---------------------------------------------------------------------------

function HistoryWrapper({ presentationId }: { presentationId: string }) {
  const { applyAiEdit } = useEditor()
  return <HistoryPanel presentationId={presentationId} onRestore={applyAiEdit} />
}

// ---------------------------------------------------------------------------
// EditorPage
// ---------------------------------------------------------------------------

export default function EditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  // --- state ----------------------------------------------------------------

  const [spec, setSpec] = useState<PresentationSpec | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [index, setIndex] = useState(0)
  const [presenting, setPresenting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('theme')

  // export
  const [exportOpen, setExportOpen] = useState(false)
  const [exporting, setExporting] = useState<ExportFormat | null>(null)
  const exportRef = useRef<HTMLDivElement>(null)

  // bridge so the toolbar can reach undo/redo inside EditorProvider
  const editorBridgeRef = useRef<EditorBridgeHandle | null>(null)

  // --- load spec ------------------------------------------------------------

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    specApi
      .get(id)
      .then((data) => {
        if (!cancelled) {
          setSpec(data)
          setIndex(0)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : 'Failed to load presentation')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [id])

  // --- export click-outside -------------------------------------------------

  useEffect(() => {
    if (!exportOpen) return
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [exportOpen])

  // --- keyboard shortcuts (page-level, not presenting) ----------------------

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (presenting) return
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) return

      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setIndex((i) => Math.max(0, i - 1))
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setIndex((i) => (spec ? Math.min(spec.slides.length - 1, i + 1) : i))
      } else if (e.key === 'Escape') {
        e.preventDefault()
        navigate('/dashboard')
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [presenting, spec, navigate])

  // --- export handler -------------------------------------------------------

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      if (!id) return
      setExportOpen(false)
      setExporting(format)
      try {
        await exportApi.download(id, format)
        toast.success(`Exported as ${format.toUpperCase()} successfully.`)
      } catch (err) {
        const msg = err instanceof ApiClientError ? err.message : 'Export failed'
        toast.error(msg)
      } finally {
        setExporting(null)
      }
    },
    [id, toast],
  )

  // --- toggle editing -------------------------------------------------------

  const toggleEditing = useCallback(() => {
    if (editing && editorBridgeRef.current) {
      editorBridgeRef.current.forceSave()
    }
    setEditing((e) => !e)
  }, [editing])

  // --- render helpers -------------------------------------------------------

  const title = spec?.meta?.title || 'Untitled'
  const totalSlides = spec?.slides?.length ?? 0

  // -----------------------------------------------------------------------
  // JSX
  // -----------------------------------------------------------------------

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-bg text-text">
      {/* ====== Top Toolbar ====== */}
      <header className="flex items-center justify-between h-14 shrink-0 px-3 bg-surface border-b border-border">
        {/* Left group */}
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" title="Back to dashboard" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={18} />
          </Button>

          <span
            className="truncate text-sm font-semibold text-text max-w-xs"
            contentEditable={editing}
            suppressContentEditableWarning
          >
            {title}
          </span>
        </div>

        {/* Right group */}
        <div className="flex items-center gap-2">
          {/* Undo */}
          <Button
            variant="ghost"
            size="icon"
            title="Undo"
            disabled={!editing || !editorBridgeRef.current?.canUndo}
            onClick={() => editorBridgeRef.current?.undo()}
          >
            <Undo2 size={16} />
          </Button>

          {/* Redo */}
          <Button
            variant="ghost"
            size="icon"
            title="Redo"
            disabled={!editing || !editorBridgeRef.current?.canRedo}
            onClick={() => editorBridgeRef.current?.redo()}
          >
            <Redo2 size={16} />
          </Button>

          {/* Edit toggle */}
          <Button variant="ghost" size="sm" title="Toggle edit mode" onClick={toggleEditing}>
            <Pencil size={14} />
            <span>{editing ? 'Editing' : 'Edit'}</span>
          </Button>

          {/* Theme -- switches inspector to theme tab */}
          <Button variant="ghost" size="icon" title="Deck theme" onClick={() => setInspectorTab('theme')}>
            <Palette size={16} />
          </Button>

          {/* Export */}
          <div className="relative" ref={exportRef}>
            <Button variant="outline" size="sm" title="Export" onClick={() => setExportOpen((o) => !o)}>
              <Download size={14} />
              <span>Export</span>
            </Button>

            {exportOpen && (
              <div className="absolute top-full mt-1 right-0 z-50 min-w-[160px] rounded-lg border border-border bg-surface p-1 shadow-lg">
                {(['html', 'pdf', 'pptx'] as ExportFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm rounded text-text hover:bg-surface2 transition-colors disabled:opacity-50"
                    disabled={exporting !== null}
                    onClick={() => handleExport(fmt)}
                  >
                    {exporting === fmt && <Spinner size="sm" />}
                    <span>{fmt.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Present */}
          <Button variant="primary" size="sm" title="Present" onClick={() => setPresenting(true)}>
            <Play size={14} />
            <span>Present</span>
          </Button>

          {/* Share (placeholder) */}
          <Button
            variant="ghost"
            size="icon"
            title="Share"
            onClick={() => console.log('Share placeholder -- TODO')}
          >
            <Share2 size={16} />
          </Button>
        </div>
      </header>

      {/* ====== Main body (3-column) ====== */}
      <div className="flex flex-1 min-h-0">

        {/* ----- Left: Slide Navigator ----- */}
        <aside className="w-48 shrink-0 overflow-y-auto bg-surface border-r border-border p-2 flex flex-col gap-1.5">
          {!spec || !spec.slides ? (
            <div className="flex items-center justify-center flex-1">
              <Spinner />
            </div>
          ) : (
            spec.slides.map((_slide, i) => (
              <button
                key={i}
                className={`h-12 w-full rounded border text-xs transition-colors cursor-pointer ${
                  i === index
                    ? 'border-accent ring-1 ring-accent/20 bg-surface2 text-text'
                    : 'border-border bg-surface2 text-text-dim hover:border-accent'
                }`}
                onClick={() => setIndex(i)}
              >
                Slide {i + 1}
              </button>
            ))
          )}
        </aside>

        {/* ----- Center: Canvas ----- */}
        <main className="flex-1 overflow-hidden bg-bg flex items-center justify-center">
          {loading && (
            <div className="flex flex-col items-center gap-3">
              <Spinner size="lg" />
              <span className="text-sm text-text-muted">Loading presentation...</span>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center gap-4">
              <span className="text-sm text-danger">{error}</span>
              <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
                Back to Dashboard
              </Button>
            </div>
          )}

          {!loading && !error && spec && (
            <DeckThemeProvider initial={spec.meta?.theme as ThemeName | null}>
              {presenting ? (
                <FullscreenPlayer
                  spec={spec}
                  onExit={() => setPresenting(false)}
                />
              ) : editing ? (
                <EditorProvider presentationId={id!}>
                  <EditorBridge ref={editorBridgeRef} />
                  <PresentationRenderer
                    spec={spec}
                    activeIndex={index}
                    fullscreen
                  />
                </EditorProvider>
              ) : (
                <PresentationRenderer
                  spec={spec}
                  activeIndex={index}
                  fullscreen
                />
              )}
            </DeckThemeProvider>
          )}
        </main>

        {/* ----- Right: Inspector Panel ----- */}
        <aside className="w-72 shrink-0 flex flex-col bg-surface border-l border-border">
          {/* Tab header */}
          <div className="flex border-b border-border">
            {(['theme', 'ai', 'history'] as InspectorTab[]).map((tab) => (
              <button
                key={tab}
                className={`flex-1 py-2.5 text-xs font-semibold capitalize transition-colors ${
                  inspectorTab === tab
                    ? 'text-accent bg-accent/10 border-b border-accent/20'
                    : 'text-text-dim hover:text-text'
                }`}
                onClick={() => setInspectorTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            {inspectorTab === 'theme' && (
              <div className="p-3">
                <ThemeSwitcher />
              </div>
            )}

            {inspectorTab === 'ai' && editing && (
              <EditorProvider presentationId={id!}>
                <div className="h-full">
                  <AiEditorPanel presentationId={id!} onClose={() => setInspectorTab('theme')} />
                </div>
              </EditorProvider>
            )}

            {inspectorTab === 'ai' && !editing && (
              <div className="flex items-center justify-center h-full">
                <span className="text-xs text-text-dim text-center px-4">
                  Enable Edit mode to use the AI assistant.
                </span>
              </div>
            )}

            {inspectorTab === 'history' && (
              <EditorProvider presentationId={id!}>
                <HistoryWrapper presentationId={id!} />
              </EditorProvider>
            )}
          </div>
        </aside>
      </div>

      {/* ====== Slide counter (bottom-left overlay) ====== */}
      {!loading && !error && spec && totalSlides > 0 && (
        <div className="fixed bottom-3 left-52 z-10 text-xs text-text-dim tabular-nums pointer-events-none">
          {index + 1} / {totalSlides}
        </div>
      )}
    </div>
  )
}
