import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Trash2,
  ExternalLink,
  Presentation as PresentationIcon,
  Upload,
  FileIcon,
  ArrowRight,
  LayoutDashboard,
  FileText,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import ThemePickerModal from '../components/theme/ThemePickerModal'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../context/AuthContext'
import {
  presentationsApi,
  filesApi,
  ApiClientError,
} from '../lib/api'
import type { Presentation, FileAsset } from '../types'
import { getSettings } from '../lib/settings'

// ── Constants ──────────────────────────────────────────────────────────────

const GRADIENTS = [
  'linear-gradient(135deg, #ea580c 0%, #f59e0b 100%)',
  'linear-gradient(135deg, #0d9488 0%, #2dd4bf 100%)',
  'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
  'linear-gradient(135deg, #dc2626 0%, #f87171 100%)',
  'linear-gradient(135deg, #2563eb 0%, #60a5fa 100%)',
]

const QUICK_STARTS = [
  { label: 'Startup Pitch', prompt: 'Create a compelling startup pitch deck with problem, solution, market size, business model, and team slides.' },
  { label: 'Business Review', prompt: 'Create a quarterly business review with key metrics, achievements, challenges, and next quarter goals.' },
  { label: 'Conference Talk', prompt: 'Create an engaging conference talk outline with introduction, key points, case studies, and a strong closing.' },
  { label: 'Product Launch', prompt: 'Create a product launch presentation covering features, benefits, target audience, pricing, and go-to-market strategy.' },
  { label: 'Research Report', prompt: 'Create a research report presentation with methodology, findings, data analysis, and conclusions.' },
  { label: 'Course Intro', prompt: 'Create a course introduction presentation with overview, learning objectives, syllabus breakdown, and instructor background.' },
]

// ── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ── Primitives (mêmes que la home) ─────────────────────────────────────────

const easeOut = [0.22, 1, 0.36, 1] as const

function SpotlightCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: -200, y: -200 })

  function onMove(e: React.MouseEvent) {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      className={`group relative overflow-hidden rounded-2xl border border-border bg-surface/80 backdrop-blur-sm ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `radial-gradient(360px circle at ${pos.x}px ${pos.y}px, rgba(234,88,12,0.10), transparent 60%)`,
        }}
      />
      {children}
    </div>
  )
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.35, ease: easeOut },
  }),
}

// ── Component ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const toastRef = useRef(toast)
  toastRef.current = toast
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Generation state
  const [prompt, setPrompt] = useState('')
  const initialSettings = getSettings()
  const [slideCount, setSlideCount] = useState(initialSettings.defaultSlideCount)
  const [tone, setTone] = useState(initialSettings.defaultTone)
  const [language, setLanguage] = useState(initialSettings.defaultLanguage)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showThemePicker, setShowThemePicker] = useState(false)

  // Data state
  const [presentations, setPresentations] = useState<Presentation[]>([])
  const [files, setFiles] = useState<FileAsset[]>([])
  const [loadingDecks, setLoadingDecks] = useState(true)
  const [loadingFiles, setLoadingFiles] = useState(true)
  const [filesOpen, setFilesOpen] = useState(false)

  // Hover state per card
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Delete confirmation
  const [pendingDelete, setPendingDelete] = useState<Presentation | null>(null)

  // ── Fetch on mount ──────────────────────────────────────────────────────

  const loadPresentations = useCallback(async () => {
    try {
      setLoadingDecks(true)
      const res = await presentationsApi.list()
      setPresentations(res.items)
    } catch (err) {
      if (err instanceof ApiClientError) toastRef.current.error(err.message)
    } finally {
      setLoadingDecks(false)
    }
  }, [])

  const loadFiles = useCallback(async () => {
    try {
      setLoadingFiles(true)
      const res = await filesApi.list()
      setFiles(res.items)
    } catch (err) {
      if (err instanceof ApiClientError) toastRef.current.error(err.message)
    } finally {
      setLoadingFiles(false)
    }
  }, [])

  useEffect(() => {
    loadPresentations()
    loadFiles()
  }, [loadPresentations, loadFiles])

  // ── Handlers ───────────────────────────────────────────────────────────

  function handleGenerate() {
    const trimmed = prompt.trim()
    if (!trimmed) return
    setShowThemePicker(true)
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    try {
      await presentationsApi.remove(pendingDelete.id)
      toast.success('Presentation deleted')
      setPendingDelete(null)
      loadPresentations()
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message)
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await filesApi.upload(file)
      loadFiles()
      toast.success(`Uploaded ${file.name}`)
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const firstName = (user?.display_name || user?.email || '').split(/[\s@]/)[0]

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="relative flex flex-col gap-8 pb-12">
      {/* Aurora background (page-level, subtil) */}
      <div className="pointer-events-none absolute -top-32 -right-24 h-96 w-96 rounded-full bg-accent/15 blur-[110px] animate-aurora-1" />
      <div className="pointer-events-none absolute top-40 -left-24 h-80 w-80 rounded-full bg-accent2/15 blur-[110px] animate-aurora-2" />

      {/* ── 1. Header ──────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: easeOut }}
        className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            <LayoutDashboard size={13} />
            Dashboard
          </span>
          <h1 className="mt-1.5 font-[family-name:var(--font-display)] text-3xl font-bold text-text">
            Welcome back,{' '}
            <span className="bg-gradient-to-r from-accent to-accent2 bg-clip-text text-transparent text-shimmer">
              {firstName || 'there'}
            </span>
          </h1>
          <p className="mt-1.5 text-sm text-text-muted">
            Describe an idea below and let AI turn it into a polished deck.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: easeOut }}
          className="flex shrink-0 items-center gap-3"
        >
          <div className="flex flex-col items-center rounded-2xl border border-border bg-surface/70 px-5 py-2.5 backdrop-blur-sm">
            <span className="font-[family-name:var(--font-display)] text-xl font-bold text-text tabular-nums">
              {presentations.length}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-text-dim">
              <PresentationIcon size={11} />
              Decks
            </span>
          </div>
          <div className="flex flex-col items-center rounded-2xl border border-border bg-surface/70 px-5 py-2.5 backdrop-blur-sm">
            <span className="font-[family-name:var(--font-display)] text-xl font-bold text-text tabular-nums">
              {files.length}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-text-dim">
              <FileText size={11} />
              Files
            </span>
          </div>
        </motion.div>
      </motion.section>

      {/* ── 2. Generation Bar ──────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.15, ease: easeOut }}
      >
        <SpotlightCard className="p-5">
          <Textarea
            placeholder="Describe your presentation…"
            className="min-h-[64px] resize-none rounded-xl"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate()
            }}
          />

          {/* Quick-start chips */}
          <div className="flex flex-wrap gap-2 mt-3">
            {QUICK_STARTS.map((q) => (
              <button
                key={q.label}
                type="button"
                className="rounded-full border border-border px-3 py-1 text-xs text-text-muted hover:border-accent/40 hover:text-accent hover:bg-accent/5 transition-colors cursor-pointer"
                onClick={() => setPrompt(q.prompt)}
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* Controls row */}
          <div className="flex items-center justify-between gap-3 mt-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-text-muted hover:text-text transition-colors shrink-0 cursor-pointer"
                onClick={() => setShowAdvanced((v) => !v)}
              >
                Advanced
                {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="flex items-center gap-2 overflow-hidden"
                  >
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={slideCount}
                      onChange={(e) => setSlideCount(Number(e.target.value))}
                      className="w-20 h-8 text-xs"
                    />
                    <Input
                      placeholder="Tone"
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                      className="w-28 h-8 text-xs"
                    />
                    <Input
                      placeholder="Language"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-28 h-8 text-xs"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Button
              variant="primary"
              size="lg"
              disabled={!prompt.trim()}
              onClick={handleGenerate}
              className="group relative overflow-hidden"
            >
              <Sparkles size={18} />
              Generate
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </SpotlightCard>
      </motion.section>

      {/* ── 3. Decks Grid ────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.25, ease: easeOut }}
        className="relative"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-text">
              My Presentations
            </h2>
            <p className="text-xs text-text-dim mt-0.5">
              {presentations.length} deck{presentations.length === 1 ? '' : 's'} · click to edit
            </p>
          </div>
        </div>

        {loadingDecks ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-0 overflow-hidden">
                <Skeleton height={140} borderRadius={0} />
                <div className="p-3 flex flex-col gap-2">
                  <Skeleton height={14} width="70%" />
                  <Skeleton height={10} width="40%" />
                </div>
              </Card>
            ))}
          </div>
        ) : presentations.length === 0 ? (
          <EmptyState
            icon={PresentationIcon}
            title="No presentations yet"
            description="Generate your first deck above"
          />
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            initial="hidden"
            animate="visible"
          >
            <AnimatePresence>
              {presentations.map((deck, i) => (
                <motion.div
                  key={deck.id}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0, scale: 0.95 }}
                  layout
                >
                  <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.25, ease: easeOut }}>
                    <Card
                      hoverable
                      className="relative p-0 overflow-hidden cursor-pointer group h-full"
                    >
                      <div
                        onMouseEnter={() => setHoveredId(deck.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        onClick={() => navigate(`/editor/${deck.id}`)}
                        className="h-full"
                      >
                        {/* Thumbnail */}
                        <div
                          className="h-[140px] relative"
                          style={{ background: GRADIENTS[i % GRADIENTS.length] }}
                        >
                          <div
                            className="absolute inset-0 opacity-40 transition-opacity duration-500 group-hover:opacity-60"
                            style={{
                              background:
                                'radial-gradient(120% 90% at 50% 0%, rgba(255,255,255,0.25), transparent 60%)',
                            }}
                          />
                          <span className="absolute inset-0 flex items-center justify-center text-white/90 font-semibold text-lg font-[family-name:var(--font-display)]">
                            {deck.slide_count} slides
                          </span>

                          {/* Hover overlay */}
                          <AnimatePresence>
                            {hoveredId === deck.id && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-black/50 flex items-center justify-center gap-2 backdrop-blur-[2px]"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  className="rounded-lg bg-white/90 p-2 text-text hover:bg-white transition-colors cursor-pointer"
                                  title="Open"
                                  onClick={() => navigate(`/editor/${deck.id}`)}
                                >
                                  <ExternalLink size={16} />
                                </button>
                                <button
                                  className="rounded-lg bg-white/90 p-2 text-danger hover:bg-white transition-colors cursor-pointer"
                                  title="Delete"
                                  onClick={() => setPendingDelete(deck)}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Info */}
                        <div className="p-3">
                          <p className="font-medium text-sm text-text line-clamp-2 leading-snug">
                            {deck.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Badge variant="accent">{deck.slide_count} slides</Badge>
                            <span className="text-xs text-text-dim">
                              Updated {timeAgo(deck.updated_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </motion.section>

      {/* ── 4. Files Panel ───────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.35, ease: easeOut }}
        className="relative border-t border-border pt-6"
      >
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            className="flex items-center gap-1.5 text-sm font-medium text-text hover:text-text transition-colors cursor-pointer"
            onClick={() => setFilesOpen((v) => !v)}
          >
            My Files
            {filesOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={14} />
            Upload
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleUpload}
          />
        </div>

        <AnimatePresence>
          {filesOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              {loadingFiles ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="p-3 flex flex-col gap-2">
                      <Skeleton height={12} width="60%" />
                      <Skeleton height={10} width="40%" />
                    </Card>
                  ))}
                </div>
              ) : files.length === 0 ? (
                <EmptyState
                  icon={FileIcon}
                  title="No files uploaded"
                  description="Upload images or documents to use in your presentations"
                  className="py-8"
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {files.map((file, i) => (
                    <motion.div
                      key={file.id}
                      custom={i}
                      variants={fadeUp}
                      initial="hidden"
                      animate="visible"
                    >
                      <SpotlightCard className="p-3 flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
                            <FileIcon size={15} />
                          </div>
                          <span className="text-sm text-text truncate">{file.filename}</span>
                        </div>
                        <div className="flex items-center gap-2 pl-10">
                          <Badge variant="default">{file.content_type ?? 'file'}</Badge>
                          <span className="text-xs text-text-dim">{formatFileSize(file.size_bytes)}</span>
                        </div>
                        <span className="pl-10 text-xs text-text-dim">{timeAgo(file.created_at)}</span>
                      </SpotlightCard>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      {/* Theme picker overlay */}
      <AnimatePresence>
        {showThemePicker && (
          <ThemePickerModal
            prompt={prompt}
            slideCount={slideCount}
            tone={tone}
            language={language}
            onBack={() => setShowThemePicker(false)}
          />
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete presentation"
        message={
          pendingDelete
            ? `"${pendingDelete.title}" will be permanently deleted. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
