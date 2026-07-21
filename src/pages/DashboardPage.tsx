import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Plus,
  ChevronDown,
  ChevronUp,
  Trash2,
  ExternalLink,
  Presentation as PresentationIcon,
  Upload,
  FileIcon,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import ThemePickerModal from '../components/theme/ThemePickerModal'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { useToast } from '../components/ui/Toast'
import {
  presentationsApi,
  filesApi,
  ApiClientError,
} from '../lib/api'
import type { Presentation, FileAsset } from '../types'

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

// ── Animation variants ──────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.3, ease: 'easeOut' },
  }),
}

// ── Component ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Generation state
  const [prompt, setPrompt] = useState('')
  const [slideCount, setSlideCount] = useState(10)
  const [tone, setTone] = useState('Professional')
  const [language, setLanguage] = useState('English')
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

  async function handleCreateNew() {
    try {
      const created = await presentationsApi.create('Untitled Presentation')
      navigate(`/editor/${created.id}`)
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this presentation?')) return
    try {
      await presentationsApi.remove(id)
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

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* ── 1. Generation Bar ──────────────────────────────────────────── */}
      <section className="sticky top-0 z-20 -mt-6 pt-6 pb-4 bg-bg/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-3xl mx-auto w-full">
          <Textarea
            placeholder="Describe your presentation..."
            className="min-h-[60px] resize-none"
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
                className="rounded-full border border-border px-3 py-1 text-xs text-text-muted hover:bg-surface2 hover:text-text transition-colors cursor-pointer"
                onClick={() => setPrompt(q.prompt)}
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* Controls row */}
          <div className="flex items-center justify-between gap-3 mt-3">
            {/* Left: Advanced toggle + optional fields */}
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

            {/* Right: Generate button */}
            <Button
              variant="primary"
              size="lg"
              disabled={!prompt.trim()}
              onClick={handleGenerate}
            >
              <Sparkles size={18} />
              Generate
            </Button>
          </div>
        </div>
      </section>

      {/* ── 2. Decks Grid ────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text font-[family-name:var(--font-display)]">
            My Presentations
          </h2>
          <Button variant="ghost" size="sm" onClick={handleCreateNew}>
            <Plus size={16} />
            New
          </Button>
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
                  <Card className="relative p-0 overflow-hidden cursor-pointer group">
                    <div
                      onMouseEnter={() => setHoveredId(deck.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      onClick={() => navigate(`/editor/${deck.id}`)}
                    >
                    {/* Thumbnail */}
                    <div
                      className="h-[140px] relative"
                      style={{ background: GRADIENTS[i % GRADIENTS.length] }}
                    >
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
                            className="absolute inset-0 bg-black/50 flex items-center justify-center gap-2"
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
                              onClick={() => handleDelete(deck.id)}
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
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </section>

      {/* ── 3. Files Panel ───────────────────────────────────────────────── */}
      <section className="border-t border-border pt-6">
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
                      <Card className="p-3 flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <FileIcon size={16} className="text-text-muted shrink-0" />
                          <span className="text-sm text-text truncate">{file.filename}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="default">{file.content_type ?? 'file'}</Badge>
                          <span className="text-xs text-text-dim">{formatFileSize(file.size_bytes)}</span>
                        </div>
                        <span className="text-xs text-text-dim">{timeAgo(file.created_at)}</span>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

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
    </div>
  )
}
