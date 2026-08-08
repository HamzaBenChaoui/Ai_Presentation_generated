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
  Palette,
  Download,
  Play,
  Share2,
  ImagePlus,
  Sparkles,
} from 'lucide-react'
import { specApi, exportApi, presentationsApi, ApiClientError, type ExportFormat } from '../lib/api'
import type { PresentationSpec } from '../types'
import type { ThemeName } from '../components/renderer/theme'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { useToast } from '../components/ui/Toast'
import { EditorProvider, useEditor } from '../components/editor/EditorContext'
import { useEditorShortcuts } from '../components/editor/useEditorShortcuts'
import QuickAiEditModal from '../components/editor/QuickAiEditModal'
import AiEditorPanel from '../components/ai/AiEditorPanel'
import { ChatProvider } from '../components/ai/ChatContext'
import HistoryPanel from '../components/editor/HistoryPanel'
import ThemeSwitcher from '../components/renderer/ThemeSwitcher'
import PresentationRenderer from '../components/renderer/PresentationRenderer'
import FullscreenPlayer from '../components/renderer/FullscreenPlayer'
import { DeckThemeProvider } from '../components/renderer/DeckThemeContext'
import ShareModal from '../components/ShareModal'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type InspectorTab = 'theme' | 'ai' | 'history'

// --- Resizable inspector sidebar --------------------------------------------
const INSPECTOR_WIDTH_KEY = 'slideai.inspector.width'
const INSPECTOR_WIDTH_MIN = 300
const INSPECTOR_WIDTH_MAX = 620
const INSPECTOR_WIDTH_DEFAULT = 320

function clampInspectorWidth(width: number): number {
  // Never exceed ~45% of the viewport so the canvas keeps room, and never go
  // below the panel min — unless the window is so narrow that even the min
  // cannot fit (responsive fallback: shrink the floor proportionally).
  const maxByViewport = Math.floor(
    (typeof window !== 'undefined' ? window.innerWidth : 1280) * 0.45,
  )
  const min = Math.min(INSPECTOR_WIDTH_MIN, maxByViewport)
  const max = Math.max(min, Math.min(INSPECTOR_WIDTH_MAX, maxByViewport))
  return Math.round(Math.min(max, Math.max(min, width)))
}

function readInspectorWidth(): number {
  try {
    const stored = Number(localStorage.getItem(INSPECTOR_WIDTH_KEY))
    if (Number.isFinite(stored)) return clampInspectorWidth(stored)
  } catch { /* ignore */ }
  return INSPECTOR_WIDTH_DEFAULT
}

export interface EditorBridgeHandle {
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  forceSave: () => void
}

interface ToolbarState {
  canUndo: boolean
  canRedo: boolean
  isDirty: boolean
  isSaving: boolean
}

// ---------------------------------------------------------------------------
// ToolbarStateSync: lives inside EditorProvider and mirrors the editor's
// undo/redo/save state up to the page-level toolbar. Subscribes to `version`
// so the toolbar refreshes on every editor change.
// ---------------------------------------------------------------------------

function ToolbarStateSync({ onChange }: { onChange: (s: ToolbarState) => void }) {
  const { version, canUndo, canRedo, isDirty, isSaving } = useEditor()

  useEffect(() => {
    onChange({ canUndo, canRedo, isDirty, isSaving })
  }, [version, canUndo, canRedo, isDirty, isSaving, onChange])

  return null
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
// Canvas: reads the spec from the editor context (single source of truth).
// ---------------------------------------------------------------------------

function EditorCanvas({ index }: { index: number }) {
  const { spec } = useEditor()
  if (!spec) return null
  return <PresentationRenderer spec={spec} activeIndex={index} fullscreen />
}

// ---------------------------------------------------------------------------
// AI panel: shares the same EditorProvider as the canvas (applyAiEdit calls
// go to the same context that owns the canvas spec).
// ---------------------------------------------------------------------------

function AiPanel({ presentationId, currentSlideIndex, onClose }: { presentationId: string; currentSlideIndex: number; onClose: () => void }) {
  return (
    <ChatProvider presentationId={presentationId} currentSlideIndex={currentSlideIndex}>
      <div className="h-full">
        <AiEditorPanel presentationId={presentationId} onClose={onClose} />
      </div>
    </ChatProvider>
  )
}

function HistoryWrapper({ presentationId }: { presentationId: string }) {
  const { applyAiEdit } = useEditor()
  return <HistoryPanel presentationId={presentationId} onRestore={applyAiEdit} />
}

// Adds a new image element (src=null) to the current slide and selects it so
// the "Insert image" action is immediately available on the canvas.
function AddImageButton({ slideIndex }: { slideIndex: number }) {
  const { spec, addElement, setSelection } = useEditor()
  const handleAdd = () => {
    if (!spec || !spec.slides[slideIndex]) return
    const elementIndex = spec.slides[slideIndex].elements.length
    addElement(slideIndex, { type: 'image', src: null, alt: 'Inserted image', caption: null })
    setSelection({ slideIndex, elementIndex })
  }
  return (
    <Button variant="outline" size="sm" className="w-full" onClick={handleAdd}>
      <ImagePlus size={14} />
      Add image
    </Button>
  )
}

// ---------------------------------------------------------------------------
// EditorBody: everything that needs the editor context lives here, inside
// a SINGLE EditorProvider.
// ---------------------------------------------------------------------------

interface EditorBodyProps {
  presentationId: string
  initialSpec: PresentationSpec
  index: number
  inspectorTab: InspectorTab
  setInspectorTab: (t: InspectorTab) => void
  onSpecChange: (spec: PresentationSpec) => void
  onCloseAi: () => void
  bridgeRef: React.RefObject<EditorBridgeHandle | null>
  onToolbarState: (s: ToolbarState) => void
  aiEditOpen: boolean
  setAiEditOpen: (open: boolean) => void
}

function EditorBody({
  presentationId, initialSpec, index, inspectorTab, setInspectorTab,
  onSpecChange, onCloseAi, bridgeRef, onToolbarState, aiEditOpen, setAiEditOpen,
}: EditorBodyProps) {
  const [inspectorWidth, setInspectorWidth] = useState(readInspectorWidth)
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null)

  // Persist the chosen width so it survives reloads.
  useEffect(() => {
    try {
      localStorage.setItem(INSPECTOR_WIDTH_KEY, String(inspectorWidth))
    } catch { /* ignore */ }
  }, [inspectorWidth])

  // Clamp when the viewport changes (narrow windows shrink the ceiling).
  useEffect(() => {
    const onResize = () => setInspectorWidth(clampInspectorWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault()
    resizeRef.current = { startX: e.clientX, startWidth: inspectorWidth }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMove = (ev: MouseEvent) => {
      const r = resizeRef.current
      if (!r) return
      const delta = r.startX - ev.clientX
      setInspectorWidth(clampInspectorWidth(r.startWidth + delta))
    }
    const onUp = () => {
      resizeRef.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const resetWidth = () => setInspectorWidth(INSPECTOR_WIDTH_DEFAULT)

  return (
    <EditorProvider
      presentationId={presentationId}
      initialSpec={initialSpec}
      onSpecChange={onSpecChange}
    >
      <EditorBridge ref={bridgeRef} />
      <ToolbarStateSync onChange={onToolbarState} />

      <div className="flex flex-1 min-h-0">
        {/* ----- Center: Canvas ----- */}
        <main className="relative flex-1 overflow-hidden bg-bg/40 flex items-center justify-center">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_500px_at_50%_-10%,rgba(234,88,12,0.08),transparent_60%)]" />
          <div className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-accent2/10 blur-[100px]" />
          <div className="relative z-10 w-full h-full flex items-center justify-center px-6 py-6">
            <EditorCanvas index={index} />
          </div>
        </main>

        {/* ----- Resize handle (drag left edge of the inspector) ----- */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize inspector panel"
          title="Drag to resize · double-click to reset"
          onMouseDown={startResize}
          onDoubleClick={resetWidth}
          className="group relative -mx-1 z-10 w-2 shrink-0 cursor-col-resize flex items-stretch"
        >
          <span className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[3px] bg-transparent transition-colors group-hover:bg-accent/70 group-active:bg-accent" />
        </div>

        {/* ----- Right: Inspector Panel ----- */}
        <aside
          className="shrink-0 flex flex-col bg-surface/70 backdrop-blur-md border-l border-border"
          style={{ width: inspectorWidth }}
        >
          <div className="flex border-b border-border bg-bg/30">
            {(['theme', 'ai', 'history'] as InspectorTab[]).map((tab) => (
              <button
                key={tab}
                className={`flex-1 py-2.5 text-xs font-semibold capitalize transition-all cursor-pointer ${
                  inspectorTab === tab
                    ? 'text-accent bg-gradient-to-b from-accent/15 to-transparent border-b border-accent/30'
                    : 'text-text-dim hover:text-text'
                }`}
                onClick={() => setInspectorTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden">
            {inspectorTab === 'theme' && (
              <div className="p-3 flex flex-col gap-3">
                <AddImageButton slideIndex={index} />
                <ThemeSwitcher />
              </div>
            )}

            {inspectorTab === 'ai' && (
              <AiPanel
                presentationId={presentationId}
                currentSlideIndex={index}
                onClose={onCloseAi}
              />
            )}

            {inspectorTab === 'history' && (
              <HistoryWrapper presentationId={presentationId} />
            )}
          </div>
        </aside>
      </div>

      <QuickAiEditModal
        presentationId={presentationId}
        open={aiEditOpen}
        onClose={() => setAiEditOpen(false)}
      />
    </EditorProvider>
  )
}

// ---------------------------------------------------------------------------
// EditorPage
// ---------------------------------------------------------------------------

export default function EditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  // --- state ----------------------------------------------------------------

  const [initialSpec, setInitialSpec] = useState<PresentationSpec | null>(null)
  const [liveSpec, setLiveSpec] = useState<PresentationSpec | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [index, setIndex] = useState(0)
  const [presenting, setPresenting] = useState(false)
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('theme')
  const [aiEditOpen, setAiEditOpen] = useState(false)
  const [accessRole, setAccessRole] = useState<string | null>(null)

  // toolbar undo/redo/save state, mirrored from the editor context
  const [toolbarState, setToolbarState] = useState<ToolbarState>({
    canUndo: false,
    canRedo: false,
    isDirty: false,
    isSaving: false,
  })

  // export
  const [exportOpen, setExportOpen] = useState(false)
  const [exporting, setExporting] = useState<ExportFormat | null>(null)
  const exportRef = useRef<HTMLDivElement>(null)

  // share modal
  const [shareOpen, setShareOpen] = useState(false)

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
          setInitialSpec(data)
          setLiveSpec(data)
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
    // The caller's role over this presentation (owner/admin/editor can edit;
    // viewers are read-only and should not see the Quick AI edit entry points).
    presentationsApi
      .get(id)
      .then((data) => {
        if (!cancelled) setAccessRole(data.access_role ?? null)
      })
      .catch(() => { /* role is non-critical; defaults to edit-enabled */ })
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
        setIndex((i) => (liveSpec ? Math.min(liveSpec.slides.length - 1, i + 1) : i))
      } else if (e.key === 'Escape') {
        e.preventDefault()
        navigate('/dashboard')
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [presenting, liveSpec, navigate])

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

  // --- render helpers -------------------------------------------------------

  const title = liveSpec?.meta?.title || 'Untitled'
  const totalSlides = liveSpec?.slides?.length ?? 0
  // Viewers are read-only: hide every editing entry point (Quick AI edit
  // button + AI inspector tab) so the UI matches their permissions.
  const canEdit = accessRole === null || accessRole === 'owner' || accessRole === 'admin' || accessRole === 'editor'

  // -----------------------------------------------------------------------
  // JSX
  // -----------------------------------------------------------------------

  return (
    <div className="relative flex flex-col h-screen overflow-hidden bg-bg text-text">
      {/* Aurora background */}
      <div className="pointer-events-none absolute -top-32 -right-24 h-96 w-96 rounded-full bg-accent/15 blur-[110px] animate-aurora-1" />
      <div className="pointer-events-none absolute bottom-0 -left-24 h-80 w-80 rounded-full bg-accent2/15 blur-[110px] animate-aurora-2" />

      {/* ====== Top Toolbar ====== */}
      <header className="relative z-10 flex items-center justify-between h-14 shrink-0 px-3 bg-surface/80 backdrop-blur-md border-b border-border">
        {/* Left group */}
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" title="Back to dashboard" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={18} />
          </Button>

          <span className="hidden sm:inline-block h-5 w-px bg-border" />

          <span
            className="truncate text-sm font-semibold text-text max-w-xs"
            contentEditable
            suppressContentEditableWarning
          >
            {title}
          </span>
        </div>

        {/* Right group */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            title="Undo"
            disabled={!toolbarState.canUndo}
            onClick={() => editorBridgeRef.current?.undo()}
          >
            <Undo2 size={16} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            title="Redo"
            disabled={!toolbarState.canRedo}
            onClick={() => editorBridgeRef.current?.redo()}
          >
            <Redo2 size={16} />
          </Button>

          <span className="mx-1 h-5 w-px bg-border" />

          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              title="Quick AI edit"
              className="rounded-xl text-accent hover:text-accent hover:bg-accent/10"
              onClick={() => setAiEditOpen(true)}
            >
              <Sparkles size={14} />
              <span>AI Edit</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            title="Deck theme"
            className="rounded-xl"
            onClick={() => setInspectorTab('theme')}
          >
            <Palette size={16} />
          </Button>

          <div className="relative" ref={exportRef}>
            <Button
              variant="outline"
              size="sm"
              title="Export"
              className="rounded-xl"
              onClick={() => setExportOpen((o) => !o)}
            >
              <Download size={14} />
              <span>Export</span>
            </Button>

            {exportOpen && (
              <div className="absolute top-full mt-1 right-0 z-50 min-w-[160px] rounded-xl border border-border bg-surface p-1 shadow-xl shadow-black/20">
                {(['html', 'pdf', 'pptx'] as ExportFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm rounded-lg text-text hover:bg-surface2 transition-colors disabled:opacity-50"
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

          <Button
            size="sm"
            title="Present"
            className="rounded-xl bg-gradient-to-r from-accent to-accent2 text-white shadow-md shadow-accent/30 hover:from-accent hover:to-accent2 hover:shadow-lg hover:shadow-accent/40"
            onClick={() => setPresenting(true)}
          >
            <Play size={14} />
            <span>Present</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            title="Share"
            className="rounded-xl"
            onClick={() => setShareOpen(true)}
          >
            <Share2 size={16} />
          </Button>
        </div>
      </header>

      {/* ====== Main body ====== */}
      {loading && (
        <div className="flex-1 flex items-center justify-center bg-bg">
          <div className="flex flex-col items-center gap-3">
            <Spinner size="lg" />
            <span className="text-sm text-text-muted">Loading presentation...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="flex-1 flex items-center justify-center bg-bg">
          <div className="flex flex-col items-center gap-4">
            <span className="text-sm text-danger">{error}</span>
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      )}

      {!loading && !error && initialSpec && (
        <DeckThemeProvider initial={initialSpec.meta?.theme as ThemeName | null}>
          {presenting && liveSpec ? (
            <FullscreenPlayer spec={liveSpec} onExit={() => setPresenting(false)} />
          ) : (
            <>
              {/* Left: Slide Navigator (outside EditorProvider — only needs liveSpec) */}
              <div className="flex flex-1 min-h-0">
                <aside className="relative z-10 w-48 shrink-0 overflow-y-auto bg-surface/70 backdrop-blur-md border-r border-border p-2 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 px-1 pt-1 pb-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-dim">Slides</span>
                    <span className="ml-auto text-[10px] tabular-nums text-text-dim">{totalSlides}</span>
                  </div>
                  {liveSpec?.slides?.map((_slide, i) => (
                    <button
                      key={i}
                      className={`h-14 w-full rounded-xl border text-xs font-medium transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                        i === index
                          ? 'border-accent/40 bg-gradient-to-br from-accent/15 to-accent2/10 text-accent ring-1 ring-accent/25 shadow-md shadow-accent/10'
                          : 'border-border bg-surface2/60 text-text-dim hover:border-accent/40 hover:text-text'
                      }`}
                      onClick={() => setIndex(i)}
                    >
                      <span>Slide {i + 1}</span>
                      <span className="h-1 w-6 rounded-full overflow-hidden bg-bg/60">
                        <span
                          className="block h-full rounded-full bg-gradient-to-r from-accent to-accent2 transition-all duration-300"
                          style={{ width: i === index ? '100%' : '0%' }}
                        />
                      </span>
                    </button>
                  ))}
                </aside>

                {/* Single EditorProvider owns the spec for canvas + AI + history.
                 * liveSpec is mirrored from the editor via onSpecChange so the
                 * slide navigator and present mode stay in sync too. */}
                <EditorBody
                  presentationId={id!}
                  initialSpec={initialSpec}
                  index={index}
                  inspectorTab={inspectorTab}
                  setInspectorTab={setInspectorTab}
                  onSpecChange={setLiveSpec}
                  onCloseAi={() => setInspectorTab('theme')}
                  bridgeRef={editorBridgeRef}
                  onToolbarState={setToolbarState}
                  aiEditOpen={aiEditOpen}
                  setAiEditOpen={setAiEditOpen}
                />
              </div>
            </>
          )}
        </DeckThemeProvider>
      )}

      {/* ====== Slide counter (bottom-left overlay) ====== */}
      {!loading && !error && liveSpec && totalSlides > 0 && (
        <div className="fixed bottom-3 left-52 z-10 text-xs text-text-dim tabular-nums pointer-events-none">
          {index + 1} / {totalSlides}
        </div>
      )}

      {/* ====== Share Modal ====== */}
      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} presentationId={id!} />
    </div>
  )
}
