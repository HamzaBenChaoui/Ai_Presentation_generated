import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Download,
  Play,
  Share2,
  Sparkles,
  Stethoscope,
  Languages,
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
import DeckDoctorModal from '../components/editor/DeckDoctorModal'
import CanvasToolbar from '../components/editor/CanvasToolbar'
import TranslateModal from '../components/editor/TranslateModal'
import EditorContextMenu from '../components/editor/EditorContextMenu'
import CommandPalette, { type Command } from '../components/editor/CommandPalette'
import MotionPanel from '../components/editor/MotionPanel'
import SmartAiMenu from '../components/editor/SmartAiMenu'
import AiEditorPanel from '../components/ai/AiEditorPanel'
import { ChatProvider } from '../components/ai/ChatContext'
import HistoryPanel from '../components/editor/HistoryPanel'
import PresentationRenderer from '../components/renderer/PresentationRenderer'
import SlideRenderer from '../components/renderer/SlideRenderer'
import FullscreenPlayer from '../components/renderer/FullscreenPlayer'
import { DeckThemeProvider, useDeckTheme } from '../components/renderer/DeckThemeContext'
import type { SlideSpec, CustomAnimationDef } from '../types'
import ShareModal from '../components/ShareModal'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type InspectorTab = 'ai' | 'motion' | 'history'

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

function EditorCanvas({ index, replayKey }: { index: number; replayKey: number }) {
  const { spec, editing, conflict, overwriteConflictSave } = useEditor()
  if (!spec) return null
  return (
    <div className="flex flex-col gap-2 w-full h-full">
      {conflict && (
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-xl border border-amber-500/40 bg-amber-500/10 text-xs text-amber-300">
          <span className="flex-1">
            Modified elsewhere after you loaded it. Reload to get the latest version, or overwrite it with your local changes.
          </span>
          <button
            className="px-2.5 py-1 rounded-lg border border-amber-500/40 text-amber-200 hover:bg-amber-500/10 cursor-pointer"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
          <button
            className="px-2.5 py-1 rounded-lg bg-amber-500/80 text-black font-semibold hover:bg-amber-500 cursor-pointer"
            onClick={() => overwriteConflictSave()}
          >
            Overwrite
          </button>
        </div>
      )}
      {/* Manual (Canva-style) editing toolbar — editors only. */}
      {editing && <CanvasToolbar slideIndex={index} />}
      <div className="flex-1 min-h-0" id="editor-slide-capture">
        <PresentationRenderer key={replayKey} spec={spec} activeIndex={index} fullscreen />
      </div>
    </div>
  )
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

function HistoryWrapper({ presentationId, currentSlideIndex }: { presentationId: string; currentSlideIndex: number }) {
  const { applyAiEdit } = useEditor()
  return <HistoryPanel presentationId={presentationId} onRestore={applyAiEdit} currentSlideIndex={currentSlideIndex} />
}

// ---------------------------------------------------------------------------
// EditorBody: everything that needs the editor context lives here, inside
// a SINGLE EditorProvider.
// ---------------------------------------------------------------------------

/** Real rendered slide scaled down — no editing chrome, no ambient layer. */
function SlideThumb({ slide, customAnimations, active }: { slide: SlideSpec; customAnimations: CustomAnimationDef[] | null | undefined; active: boolean }) {
  const deck = useDeckTheme()
  const tokens = deck?.tokens
  return (
    <div
      style={{
        width: '100%',
        aspectRatio: '16 / 9',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 8,
        pointerEvents: 'none',
        background: tokens?.bg,
      }}
    >
      <div
        style={{
          width: 1024,
          height: 576,
          transform: 'scale(0.171)',
          transformOrigin: 'top left',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        <SlideRenderer
          slide={slide}
          tokens={tokens}
          customAnimations={customAnimations}
          active={active}
          nonInteractive
        />
      </div>
    </div>
  )
}

interface EditorBodyProps {
  presentationId: string
  initialSpec: PresentationSpec
  initialUpdatedAt: string | null
  index: number
  setIndex: (i: number) => void
  inspectorTab: InspectorTab
  setInspectorTab: (t: InspectorTab) => void
  onSpecChange: (spec: PresentationSpec) => void
  onCloseAi: () => void
  bridgeRef: React.RefObject<EditorBridgeHandle | null>
  onToolbarState: (s: ToolbarState) => void
  aiEditOpen: boolean
  setAiEditOpen: (open: boolean) => void
  doctorOpen: boolean
  setDoctorOpen: (open: boolean) => void
  translateOpen: boolean
  setTranslateOpen: (open: boolean) => void
  onPresent: () => void
  onExport: (fmt: 'html' | 'pdf' | 'pptx') => void
}

/** Outer wrapper: owns the EditorProvider. ALL editor content lives inside. */
function EditorBody({
  presentationId, initialSpec, initialUpdatedAt, index, setIndex, inspectorTab, setInspectorTab,
  onSpecChange, onCloseAi, bridgeRef, onToolbarState, aiEditOpen, setAiEditOpen,
  doctorOpen, setDoctorOpen, translateOpen, setTranslateOpen, onPresent, onExport,
}: EditorBodyProps) {
  return (
    <EditorProvider
      presentationId={presentationId}
      initialSpec={initialSpec}
      initialUpdatedAt={initialUpdatedAt}
      onSpecChange={onSpecChange}
    >
      <EditorBodyInner
        presentationId={presentationId}
        index={index}
        setIndex={setIndex}
        inspectorTab={inspectorTab}
        setInspectorTab={setInspectorTab}
        onCloseAi={onCloseAi}
        bridgeRef={bridgeRef}
        onToolbarState={onToolbarState}
        aiEditOpen={aiEditOpen}
        setAiEditOpen={setAiEditOpen}
        doctorOpen={doctorOpen}
        setDoctorOpen={setDoctorOpen}
        translateOpen={translateOpen}
        setTranslateOpen={setTranslateOpen}
        onPresent={onPresent}
        onExport={onExport}
      />
    </EditorProvider>
  )
}

interface EditorBodyInnerProps {
  presentationId: string
  index: number
  setIndex: (i: number) => void
  inspectorTab: InspectorTab
  setInspectorTab: (t: InspectorTab) => void
  onCloseAi: () => void
  bridgeRef: React.RefObject<EditorBridgeHandle | null>
  onToolbarState: (s: ToolbarState) => void
  aiEditOpen: boolean
  setAiEditOpen: (open: boolean) => void
  doctorOpen: boolean
  setDoctorOpen: (open: boolean) => void
  translateOpen: boolean
  setTranslateOpen: (open: boolean) => void
  onPresent: () => void
  onExport: (fmt: 'html' | 'pdf' | 'pptx') => void
}

function EditorBodyInner({
  presentationId, index, setIndex, inspectorTab, setInspectorTab,
  onCloseAi, bridgeRef, onToolbarState, aiEditOpen, setAiEditOpen,
  doctorOpen, setDoctorOpen, translateOpen, setTranslateOpen,
  onPresent, onExport,
}: EditorBodyInnerProps) {
  const [inspectorWidth, setInspectorWidth] = useState(readInspectorWidth)
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null)
  // The slide navigator lives inside EditorProvider so "Add slide" can use
  // the editor context; the spec here is the same live spec the canvas uses.
  const { spec: navSpec, addSlide } = useEditor()
  const navSlides = navSpec?.slides ?? []
  const [replayKey, setReplayKey] = useState(0)

  // Ctrl+K palette: editor-native actions + page-level actions passed down.
  const paletteCommands: Command[] = useMemo(() => [
    { id: 'present', label: 'Present deck', hint: 'Play mode', run: onPresent },
    { id: 'export-html', label: 'Export as HTML', run: () => onExport('html') },
    { id: 'export-pdf', label: 'Export as PDF', run: () => onExport('pdf') },
    { id: 'export-pptx', label: 'Export as PowerPoint', run: () => onExport('pptx') },
    { id: 'ai-edit', label: 'Quick AI edit…', run: () => setAiEditOpen(true) },
    { id: 'doctor', label: 'Run Deck Doctor', run: () => setDoctorOpen(true) },
    { id: 'translate', label: 'Translate deck…', run: () => setTranslateOpen(true) },
    { id: 'add-slide', label: 'Add blank slide', run: () => setIndex(addSlide('blank')) },
    { id: 'undo', label: 'Undo', hint: 'Ctrl+Z', run: () => bridgeRef.current?.undo() },
    { id: 'redo', label: 'Redo', hint: 'Ctrl+Shift+Z', run: () => bridgeRef.current?.redo() },
  ], [onPresent, onExport, addSlide, setIndex, bridgeRef])

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
    <>
      <EditorBridge ref={bridgeRef} />
      <ToolbarStateSync onChange={onToolbarState} />

      <div className="flex flex-1 min-h-0">
        {/* ----- Left: Slide Navigator (inside the provider for Add slide) ----- */}
        <aside className="relative z-10 w-48 shrink-0 overflow-y-auto bg-surface/70 backdrop-blur-md border-r border-border p-2 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 px-1 pt-1 pb-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-dim">Slides</span>
            <span className="ml-auto text-[10px] tabular-nums text-text-dim">{navSlides.length}</span>
          </div>
          {navSlides.map((navSlide, i) => (
            <div
              key={i}
              className={`group relative w-full rounded-xl border p-1 transition-all duration-200 ${
                i === index
                  ? 'border-accent/50 ring-1 ring-accent/25 shadow-md shadow-accent/10'
                  : 'border-border hover:border-accent/40'
              }`}
            >
              <button className="w-full cursor-pointer" onClick={() => setIndex(i)} title={`Slide ${i + 1}`}>
                <SlideThumb
                  slide={navSlide}
                  customAnimations={navSpec?.meta?.customAnimations}
                  active
                />
                <span
                  className={`mt-1 block text-[10px] font-semibold tabular-nums ${
                    i === index ? 'text-accent' : 'text-text-dim'
                  }`}
                >
                  {i + 1}
                </span>
              </button>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <SmartAiMenu slideIndex={i} presentationId={presentationId} />
              </div>
            </div>
          ))}
          <button
            className="mt-1 h-10 w-full rounded-xl border border-dashed border-border text-xs font-medium text-text-dim hover:border-accent/50 hover:text-accent hover:bg-accent/5 transition-all cursor-pointer flex items-center justify-center gap-1"
            title="Add a blank slide"
            onClick={() => setIndex(addSlide('blank'))}
          >
            + Add slide
          </button>
        </aside>

        {/* ----- Center: Canvas ----- */}
        <main className="relative flex-1 overflow-hidden bg-bg/40 flex items-center justify-center">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_500px_at_50%_-10%,rgba(234,88,12,0.08),transparent_60%)]" />
          <div className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-accent2/10 blur-[100px]" />
          <div className="relative z-10 w-full h-full flex items-center justify-center px-6 py-6">
            <EditorCanvas index={index} replayKey={replayKey} />
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
            {(['ai', 'motion', 'history'] as InspectorTab[]).map((tab) => (
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
            {inspectorTab === 'ai' && (
              <AiPanel
                presentationId={presentationId}
                currentSlideIndex={index}
                onClose={onCloseAi}
              />
            )}

            {inspectorTab === 'motion' && (
              <MotionPanel slideIndex={index} onReplay={() => setReplayKey((k) => k + 1)} />
            )}

            {inspectorTab === 'history' && (
              <HistoryWrapper presentationId={presentationId} currentSlideIndex={index} />
            )}
          </div>
        </aside>
      </div>

      <QuickAiEditModal
        presentationId={presentationId}
        open={aiEditOpen}
        onClose={() => setAiEditOpen(false)}
      />

      <TranslateModal
        presentationId={presentationId}
        open={translateOpen}
        onClose={() => setTranslateOpen(false)}
      />

      <EditorContextMenu slideIndex={index} />

      <CommandPalette commands={paletteCommands} />

      <DeckDoctorModal
        presentationId={presentationId}
        open={doctorOpen}
        onClose={() => setDoctorOpen(false)}
      />
    </>
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
  const [initialUpdatedAt, setInitialUpdatedAt] = useState<string | null>(null)
  const [liveSpec, setLiveSpec] = useState<PresentationSpec | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [index, setIndex] = useState(0)
  const [presenting, setPresenting] = useState(false)
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('ai')
  const [aiEditOpen, setAiEditOpen] = useState(false)
  const [doctorOpen, setDoctorOpen] = useState(false)
  const [translateOpen, setTranslateOpen] = useState(false)
  const [accessRole, setAccessRole] = useState<string | null>(null)

  // Proactive Deck Doctor: decks created by AI generation open with a scan.
  const location = useLocation()
  useEffect(() => {
    const state = location.state as { runDoctor?: boolean } | null
    if (state?.runDoctor) {
      setDoctorOpen(true)
      window.history.replaceState({}, '')
    }
  }, [location.state])

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

    const loadSpec = async () => {
      try {
        const data = await specApi.get(id)
        if (cancelled) return
        setInitialSpec(data)
        setLiveSpec(data)
        setIndex(0)
      } catch (err) {
        if (cancelled) return
        // Specless deck (e.g. an old blank deck): seed a starter spec so the
        // editor opens instead of dead-ending on a 404.
        if (err instanceof ApiClientError && err.status === 404 && /specification/i.test(err.message)) {
          try {
            const starter: PresentationSpec = {
              meta: {
                title: 'Untitled presentation',
                theme: null,
                background: null,
                language: 'English',
                tone: 'Professional',
              },
              slides: [{ layout: 'blank', elements: [] }],
            }
            const res = await specApi.update(id, starter)
            if (!cancelled) {
              setInitialSpec(res.spec)
              setLiveSpec(res.spec)
              if (res.updatedAt) setInitialUpdatedAt(res.updatedAt)
              setIndex(0)
            }
            return
          } catch {
            /* fall through to the error state below */
          }
        }
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : 'Failed to load presentation')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadSpec()

    // The locking baseline lives on the presentation row, not the spec.
    presentationsApi
      .get(id)
      .then((row) => {
        if (!cancelled) setInitialUpdatedAt(row.updated_at)
      })
      .catch(() => { /* non-critical: locking just stays disabled */ })

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
            <>
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

              <Button
                variant="ghost"
                size="sm"
                title="Deck Doctor — scan every slide for overflow, overlaps and truncation, then fix with AI"
                className="rounded-xl text-text-muted hover:text-accent hover:bg-accent/10"
                onClick={() => setDoctorOpen(true)}
              >
                <Stethoscope size={14} />
                <span className="hidden md:inline">Doctor</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                title="Translate every text of the deck"
                className="rounded-xl text-text-muted hover:text-accent hover:bg-accent/10"
                onClick={() => setTranslateOpen(true)}
              >
                <Languages size={14} />
                <span className="hidden md:inline">Translate</span>
              </Button>
            </>
          )}

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
            onClick={() => {
              editorBridgeRef.current?.forceSave() // never enter present mode with pending edits
              setPresenting(true)
            }}
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
        <DeckThemeProvider initial={initialSpec.meta?.theme as ThemeName | null} tokenOverrides={initialSpec.meta?.themeTokens ?? null}>
          {/* EditorBody ALWAYS stays mounted: exiting present mode (or a
              reload mid-edit) must never wipe editor state or pending saves.
              The player renders as a full-screen overlay above it. */}
          <EditorBody
            presentationId={id!}
            initialSpec={initialSpec}
            initialUpdatedAt={initialUpdatedAt}
            index={index}
            setIndex={setIndex}
            inspectorTab={inspectorTab}
            setInspectorTab={setInspectorTab}
            onSpecChange={setLiveSpec}
            onCloseAi={() => setInspectorTab('history')}
            bridgeRef={editorBridgeRef}
            onToolbarState={setToolbarState}
            aiEditOpen={aiEditOpen}
            setAiEditOpen={setAiEditOpen}
            doctorOpen={doctorOpen}
            setDoctorOpen={setDoctorOpen}
            translateOpen={translateOpen}
            setTranslateOpen={setTranslateOpen}
            onPresent={() => {
              editorBridgeRef.current?.forceSave()
              setPresenting(true)
            }}
            onExport={handleExport}
          />

          {presenting && liveSpec && (
            <div className="fixed inset-0 z-[70]">
              <FullscreenPlayer spec={liveSpec} onExit={() => setPresenting(false)} />
            </div>
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
